import { 
  GenericContainer, 
  StartedTestContainer, 
  Wait,
  Network,
  StartedNetwork
} from 'testcontainers';
import { Integr8Config, IEnvironmentOrchestrator, IEnvironmentContext, ServiceConfig } from '../types';
import { spawn, ChildProcess } from 'child_process';
import { HttpClient } from './http-client';
import { DatabaseManager } from './database-manager';
import { TestContext } from './test-context';
import { ClockManager } from './clock-manager';
import { EventBusManager } from './event-bus-manager';

// Ensure Node.js 18+ for native fetch support
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  throw new Error(`Node.js 18+ is required. Current version: ${nodeVersion}`);
}

export class EnvironmentOrchestrator implements IEnvironmentOrchestrator {
  private config: Integr8Config;
  private network!: StartedNetwork;
  private containers: Map<string, StartedTestContainer> = new Map();
  private localProcesses: Map<string, ChildProcess> = new Map();  // New map for local processes
  private appContainer?: StartedTestContainer;
  private composeEnvironment?: any; // Docker Compose environment
  private context?: IEnvironmentContext;
  private workerId: string;

  // Helper methods for new config structure
  private getAppServices(): ServiceConfig[] {
    return this.config.services.filter(service => service.type === 'service');
  }

  private getDatabaseServices(): ServiceConfig[] {
    return this.config.services.filter(service => 
      ['postgres', 'mysql', 'mongo'].includes(service.type)
    );
  }

  private getAppService(): ServiceConfig | undefined {
    const appServices = this.getAppServices();
    if (appServices.length === 0) {
      return undefined;
    }
    return appServices[0]; // Use first app service
  }

  constructor(config: Integr8Config, workerId?: string) {
    this.config = config;
    this.workerId = workerId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting environment for worker ${this.workerId}`);
    
    // Create network
    this.network = await new Network().start();
    
    // Start all services
    await this.startServices();
    
    // Wait for everything to be ready
    await this.waitForReady();
    
    // Initialize context
    this.context = await this.createContext();
    
    console.log(`✅ Environment ready for worker ${this.workerId}`);
  }

  async stop(): Promise<void> {
    console.log(`🛑 Stopping environment for worker ${this.workerId}`);
    
    // Stop Docker Compose environment if running
    if (this.composeEnvironment) {
      console.log('Stopping Docker Compose environment');
      await this.composeEnvironment.down();
    }
    
    // Stop app container (for non-compose setups)
    if (this.appContainer && !this.composeEnvironment) {
      await this.appContainer.stop();
    }
    
    // Stop local processes
    for (const [name, process] of this.localProcesses) {
      console.log(`Stopping local process: ${name} (PID: ${process.pid})`);
      
      try {
        process.kill('SIGTERM');
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force kill if still running
        if (!process.killed) {
          console.log(`Force killing local process: ${name}`);
          process.kill('SIGKILL');
        }
      } catch (error) {
        console.log(`⚠️  Process ${name} already stopped or not found`);
      }
    }
    
    // Stop services (for non-compose setups)
    for (const [name, container] of this.containers) {
      console.log(`Stopping service: ${name}`);
      await container.stop();
    }
    
    // Remove network (for non-compose setups)
    if (this.network && !this.composeEnvironment) {
      try {
        await this.network.stop();
      } catch (error) {
        // Network might already be stopped, ignore the error
        console.log('⚠️  Network already stopped or not found');
      }
    }
    
    console.log(`✅ Environment stopped for worker ${this.workerId}`);
  }

  async isReady(): Promise<boolean> {
    try {
      // Check if app is responding
      const appService = this.getAppService();
      if (!appService) {
        console.log('⚠️  No app service found, assuming ready');
        return true;
      }
      
      const appUrl = this.getAppUrl();
      
      if (!appService.healthcheck) {
        console.log('⚠️  No health check configured, assuming app is ready');
        return true;
      }
      
      const healthCheckPath = typeof appService.healthcheck === 'string' 
        ? appService.healthcheck 
        : appService.healthcheck.command;
      
      const healthCheckUrl = `${appUrl}${healthCheckPath}`;
      console.log(`🔍 Checking health at: ${healthCheckUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(healthCheckUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`📊 Health check response: ${response.status} ${response.statusText}`);
      return response.ok;
    } catch (error) {
      console.log(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  getServiceUrl(serviceName: string, port?: number): string {
    const container = this.containers.get(serviceName);
    if (!container) {
      // Try to find service by name in config
      const service = this.config.services.find(s => s.name === serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found in configuration`);
      }
      throw new Error(`Service ${serviceName} container not started yet`);
    }
    
    const actualPort = port || this.getServicePort(serviceName);
    return `http://${container.getHost()}:${container.getMappedPort(actualPort)}`;
  }

  getAppUrl(): string {
    const appService = this.getAppService();
    if (!appService || !appService.ports || appService.ports.length === 0) {
      throw new Error('App service not configured with ports');
    }
    
    // Check if it's a local process
    if (appService.mode === 'local') {
      const port = appService.ports[0];
      return `http://localhost:${port}`;
    }
    
    // Check if it's a container
    if (!this.appContainer) {
      throw new Error('App container not started');
    }
    
    return `http://${this.appContainer.getHost()}:${this.appContainer.getMappedPort(appService.ports[0])}`;
  }

  getContext(): IEnvironmentContext {
    if (!this.context) {
      throw new Error('Environment not initialized');
    }
    return this.context;
  }

  private async startServices(): Promise<void> {
    const servicePromises = this.config.services.map(service => this.startService(service));
    await Promise.all(servicePromises);
    
    // Set connection strings for service containers after all services are started
    await this.setServiceConnectionStrings();
  }

  private async startService(serviceConfig: ServiceConfig): Promise<void> {
    console.log(`Starting service: ${serviceConfig.name}`);
    
    // Handle local mode for service type
    if (serviceConfig.type === 'service' && serviceConfig.mode === 'local') {
      await this.startLocalService(serviceConfig);
      return;
    }
    
    let container: GenericContainer;
    
    switch (serviceConfig.type) {
      case 'postgres':
        container = new GenericContainer('postgres:15-alpine')
          .withEnvironment({
            POSTGRES_DB: 'test',
            POSTGRES_USER: 'test',
            POSTGRES_PASSWORD: 'test',
            ...serviceConfig.environment
          })
          .withExposedPorts(5432)
          .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'));
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
        break;
        
      case 'mysql':
        container = new GenericContainer('mysql:8.0')
          .withEnvironment({
            MYSQL_ROOT_PASSWORD: 'test',
            MYSQL_DATABASE: 'test',
            MYSQL_USER: 'test',
            MYSQL_PASSWORD: 'test',
            ...serviceConfig.environment
          })
          .withExposedPorts(3306)
          .withWaitStrategy(Wait.forLogMessage('ready for connections'));
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
        break;
        
      case 'mongo':
        container = new GenericContainer('mongo:7.0')
          .withEnvironment({
            MONGO_INITDB_ROOT_USERNAME: 'test',
            MONGO_INITDB_ROOT_PASSWORD: 'test',
            MONGO_INITDB_DATABASE: 'test',
            ...serviceConfig.environment
          })
          .withExposedPorts(27017)
          .withWaitStrategy(Wait.forLogMessage('Waiting for connections'));
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
        break;
        
      case 'redis':
        container = new GenericContainer('redis:7-alpine')
          .withExposedPorts(6379)
          .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'));
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
        break;
        
      case 'mailhog':
        container = new GenericContainer('mailhog/mailhog:latest')
          .withExposedPorts(1025, 8025)
          .withWaitStrategy(Wait.forHttp('/', 8025));
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
        break;
        
      case 'service':
        if (!serviceConfig.image) {
          throw new Error(`App service ${serviceConfig.name} requires image`);
        }
        container = new GenericContainer(serviceConfig.image);
        
        // Set ports
        if (serviceConfig.ports && serviceConfig.ports.length > 0) {
          container = container.withExposedPorts(...serviceConfig.ports);
        }
        
        // Set wait strategy based on health check
        if (serviceConfig.healthcheck) {
          const healthCheckPath = typeof serviceConfig.healthcheck === 'string' 
            ? serviceConfig.healthcheck 
            : serviceConfig.healthcheck.command;
          const port = serviceConfig.ports?.[0] || 3000;
          container = container.withWaitStrategy(Wait.forHttp(healthCheckPath, port));
        } else {
          // Default wait strategy for services without health check
          const port = serviceConfig.ports?.[0] || 3000;
          container = container.withWaitStrategy(Wait.forLogMessage('listening', 10000));
        }
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
        break;
        
      default:
        if (!serviceConfig.image) {
          throw new Error(`Custom service ${serviceConfig.name} requires image`);
        }
        container = new GenericContainer(serviceConfig.image);
        
        if (serviceConfig.containerName) {
          container = container.withName(serviceConfig.containerName);
        }
    }
    
    // Apply common configuration
    if (serviceConfig.ports) {
      container = container.withExposedPorts(...serviceConfig.ports);
    }
    
    if (serviceConfig.volumes) {
      const bindMounts = serviceConfig.volumes.map(volume => ({
        source: volume.host,
        target: volume.container,
        mode: volume.mode || 'rw'
      }));
      container = container.withBindMounts(bindMounts);
    }
    
    if (serviceConfig.healthcheck) {
      container = container.withWaitStrategy(
        Wait.forHealthCheck()
      );
    }
    // Add to network
    container = container.withNetwork(this.network);
    
    // Configure app-specific settings
    if (serviceConfig.type === 'service') {
      // Set basic environment variables (connection strings will be set later)
      const env = {
        NODE_ENV: 'test',
        TEST_MODE: '1',
        WORKER_ID: this.workerId,
        ...serviceConfig.environment
      };
      container = container.withEnvironment(env);
      
      // Set command
      if (serviceConfig.command) {
        container = container.withCommand(serviceConfig.command.split(' '));
      }
      
      // Set working directory
      if (serviceConfig.workingDirectory) {
        container = container.withWorkingDir(serviceConfig.workingDirectory);
      }
    }
    
    // Start container
    const startedContainer = await container.start();
    this.containers.set(serviceConfig.name, startedContainer);
    
    // Store app container reference
    if (serviceConfig.type === 'service') {
      this.appContainer = startedContainer;
    }
    
    console.log(`✅ Service ${serviceConfig.name} started`);
  }

  private async startLocalService(serviceConfig: ServiceConfig): Promise<void> {
    if (!serviceConfig.command) {
      throw new Error(`Local service ${serviceConfig.name} requires command`);
    }

    console.log(`🚀 Starting local service: ${serviceConfig.name}`);
    console.log(`   Command: ${serviceConfig.command}`);
    console.log(`   Working directory: ${serviceConfig.workingDirectory || '.'}`);

    // Set environment variables
    const env: Record<string, string> = {
      NODE_ENV: 'test',
      TEST_MODE: '1',
      WORKER_ID: this.workerId,
      ...this.getServiceConnectionStrings(),
      ...serviceConfig.environment,
      ...process.env  // Inherit from parent process
    };

    // Parse command and arguments
    const [command, ...args] = serviceConfig.command.split(' ');
    
    // Start the process
    const childProcess = spawn(command, args, {
      cwd: serviceConfig.workingDirectory || '.',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // Store process reference
    this.localProcesses.set(serviceConfig.name, childProcess);

    // Handle process events
    childProcess.on('error', (error: Error) => {
      console.error(`❌ Local service ${serviceConfig.name} error:`, error);
    });

    childProcess.on('exit', (code: number | null, signal: string | null) => {
      if (code !== 0) {
        console.error(`❌ Local service ${serviceConfig.name} exited with code ${code}, signal ${signal}`);
      } else {
        console.log(`✅ Local service ${serviceConfig.name} exited normally`);
      }
    });

    // Wait a bit for the process to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`✅ Local service ${serviceConfig.name} started (PID: ${childProcess.pid})`);
  }

  // Legacy method - now handled by startServices()
  private async startApp(): Promise<void> {
    // This method is no longer used - app services are handled in startServices()
    console.log('⚠️  startApp() is deprecated - app services are now handled in startServices()');
  }

  // Legacy method - Docker Compose support removed
  private async startDockerComposeApp(): Promise<void> {
    console.log('⚠️  Docker Compose support is deprecated - use services array instead');
    throw new Error('Docker Compose support is deprecated - use services array instead');
  }

  // Legacy method - local app support removed
  private async startLocalApp(): Promise<void> {
    console.log('⚠️  Local app support is deprecated - use services array instead');
    throw new Error('Local app support is deprecated - use services array instead');
  }

  // Legacy method - local app support removed
  private async waitForLocalHealthCheck(): Promise<void> {
    console.log('⚠️  Local app support is deprecated - use services array instead');
    throw new Error('Local app support is deprecated - use services array instead');
  }

  // Legacy method - database health check is now handled by service health checks
  private async waitForDatabaseHealth(): Promise<void> {
    console.log('⚠️  Database health check is now handled by service health checks');
    // This method is no longer needed - database health is checked via service health checks
  }

  // Legacy method - seeding is now handled per service
  private async runSeeding(): Promise<void> {
    console.log('⚠️  Global seeding is deprecated - use per-service seed configuration');
    // This method is no longer needed - seeding is handled per service
  }

  // Legacy method - container app is now handled by startServices()
  private async startContainerApp(): Promise<void> {
    console.log('⚠️  Container app is now handled by startServices()');
    // This method is no longer needed - app services are handled in startServices()
  }

  private async waitForReady(): Promise<void> {
    console.log('Waiting for environment to be ready...');
    
    const maxAttempts = 30;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`🔄 Health check attempt ${i + 1}/${maxAttempts}...`);
      if (await this.isReady()) {
        console.log('✅ Environment is ready!');
        return;
      }
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Environment failed to become ready');
  }

  private async createContext(): Promise<IEnvironmentContext> {
    // Only create HTTP client if we have an app service
    const appService = this.getAppService();
    const http = appService ? new HttpClient(this.getAppUrl()) : undefined;
    
    // Get database service configuration
    const dbServices = this.getDatabaseServices();
    const dbService = dbServices.length > 0 ? dbServices[0] : undefined;
    
    const db = new DatabaseManager(dbService, this.workerId);
    const ctx = new TestContext(this.workerId);
    const clock = new ClockManager();
    const bus = new EventBusManager(this.config, this.workerId);
    
    await db.initialize();
    
    return { http, db, ctx, clock, bus };
  }

  private getServicePort(serviceName: string): number {
    const service = this.config.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    switch (service.type) {
      case 'postgres': return 5432;
      case 'mysql': return 3306;
      case 'mongo': return 27017;
      case 'redis': return 6379;
      case 'mailhog': return 8025;
      default: return service.ports?.[0] || 8080;
    }
  }

  private async setServiceConnectionStrings(): Promise<void> {
    const connectionStrings = this.getServiceConnectionStrings();
    
    // Update environment variables for service containers
    for (const service of this.config.services) {
      if (service.type === 'service') {
        const container = this.containers.get(service.name);
        if (container) {
          // Note: We can't update environment variables of a running container
          // This is a limitation - connection strings should be set at container start
          // For now, we'll log them for debugging
          console.log(`🔗 Connection strings for ${service.name}:`, connectionStrings);
        }
      }
    }
  }

  private getServiceConnectionStrings(): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Use Testcontainers URLs for all services that are already started
    for (const service of this.config.services) {
      const container = this.containers.get(service.name);
      if (!container) {
        console.log(`⚠️  Service ${service.name} not started yet, skipping connection string`);
        continue;
      }
      
      const url = this.getServiceUrl(service.name);
      
      switch (service.type) {
        case 'postgres':
          env.DATABASE_URL = `postgresql://test:test@${url.replace('http://', '')}:5432/test`;
          env.POSTGRES_URL = env.DATABASE_URL;
          break;
        case 'mysql':
          env.DATABASE_URL = `mysql://test:test@${url.replace('http://', '')}:3306/test`;
          env.MYSQL_URL = env.DATABASE_URL;
          break;
        case 'mongo':
          env.MONGODB_URL = `mongodb://test:test@${url.replace('http://', '')}:27017/test`;
          break;
        case 'redis':
          env.REDIS_URL = `redis://${url.replace('http://', '')}:6379`;
          break;
      }
    }
    
    return env;
  }
}
