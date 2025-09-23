import { 
  GenericContainer, 
  StartedTestContainer, 
  Wait,
  Network,
  StartedNetwork
} from 'testcontainers';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Integr8Config, IEnvironmentOrchestrator, IEnvironmentContext, ServiceConfig, EnvironmentMapping } from '../types';
import { spawn, ChildProcess } from 'child_process';
import { HttpClient } from './http-client';
import { DatabaseManager } from './database-manager';
import { TestContext } from './test-context';
import { ClockManager } from './clock-manager';
import { EventBusManager } from './event-bus-manager';
import { PortManager } from '../utils/port-manager';
import { HealthCheckManager } from '../utils/health-check';
import { EnvironmentManager } from '../utils/env-manager';

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
    
    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  private setupCleanupHandlers(): void {
    // Handle process termination
    const cleanup = async () => {
      console.log('\n🛑 Received termination signal, cleaning up...');
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error);
      await cleanup();
    });
    
    process.on('unhandledRejection', async (reason) => {
      console.error('❌ Unhandled Rejection:', reason);
      await cleanup();
    });
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting environment for worker ${this.workerId}`);
    
    try {
      // Create network
      this.network = await new Network().start();
      
      // Start all services
      await this.startServices();
      
      // Wait for everything to be ready
      await this.waitForReady();
      
      // Initialize context
      this.context = await this.createContext();
      
      console.log(`✅ Environment ready for worker ${this.workerId}`);
    } catch (error) {
      console.error('❌ Error starting environment:', error);
      // Cleanup on error
      await this.cleanupOnError();
      throw error;
    }
  }

  async startFast(): Promise<void> {
    console.log(`🚀 Starting environment for worker ${this.workerId} (fast mode)`);
    
    try {
      // Create network
      this.network = await new Network().start();
      
      // Start all services
      await this.startServices();
      
      // Skip health checks in fast mode
      console.log('⚡ Fast mode: skipping health checks');
      
      // Initialize context
      this.context = await this.createContext();
      
      console.log(`✅ Environment started for worker ${this.workerId} (health checks skipped)`);
    } catch (error) {
      console.error('❌ Error starting environment (fast mode):', error);
      // Cleanup on error
      await this.cleanupOnError();
      throw error;
    }
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
        // Check if process is still running
        if (process.killed || process.exitCode !== null) {
          console.log(`Process ${name} already stopped`);
          continue;
        }
        
        // Try graceful shutdown first
        process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts && !process.killed && process.exitCode === null) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        
        // Force kill if still running
        if (!process.killed && process.exitCode === null) {
          console.log(`Force killing local process: ${name}`);
          process.kill('SIGKILL');
          
          // Wait a bit more
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`✅ Process ${name} stopped`);
      } catch (error) {
        console.log(`⚠️  Process ${name} already stopped or not found:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Clear the processes map
    this.localProcesses.clear();
    
    // Stop services (for non-compose setups)
    for (const [name, container] of this.containers) {
      console.log(`Stopping service: ${name}`);
      try {
        await container.stop();
      } catch (error) {
        console.log(`⚠️  Container ${name} already stopped or not found:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Clear containers map
    this.containers.clear();
    
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

  private async cleanupOnError(): Promise<void> {
    console.log(`🧹 Cleaning up after error for worker ${this.workerId}`);
    
    try {
      // Stop any containers that were started
      for (const [name, container] of this.containers) {
        try {
          console.log(`Stopping container: ${name}`);
          await container.stop();
        } catch (error) {
          console.log(`⚠️  Failed to stop container ${name}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      // Clear containers map
      this.containers.clear();
      
      // Stop local processes
      for (const [name, process] of this.localProcesses) {
        try {
          console.log(`Stopping process: ${name}`);
          process.kill('SIGTERM');
        } catch (error) {
          console.log(`⚠️  Failed to stop process ${name}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      // Clear processes map
      this.localProcesses.clear();
      
      // Stop network
      if (this.network) {
        try {
          await this.network.stop();
        } catch (error) {
          console.log('⚠️  Failed to stop network:', error instanceof Error ? error.message : String(error));
        }
      }
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  private async removeConflictingContainer(containerName: string): Promise<void> {
    const execAsync = promisify(exec);
    
    try {
      // Check if container exists
      const { stdout } = await execAsync(`docker ps -a --filter name=${containerName} --format "{{.Names}}"`);
      
      if (stdout.trim()) {
        console.log(`🗑️  Removing conflicting container: ${containerName}`);
        
        // Stop the container if it's running
        try {
          await execAsync(`docker stop ${containerName}`);
          console.log(`⏹️  Stopped container: ${containerName}`);
        } catch (error) {
          // Container might already be stopped
          console.log(`⚠️  Container ${containerName} already stopped or not running`);
        }
        
        // Remove the container
        await execAsync(`docker rm ${containerName}`);
        console.log(`✅ Removed container: ${containerName}`);
      }
    } catch (error) {
      console.log(`⚠️  Failed to remove conflicting container ${containerName}:`, error instanceof Error ? error.message : String(error));
    }
  }

  private getServiceConnectionStrings(): Record<string, string> {
    const connectionStrings: Record<string, string> = {};
    
    console.log(`🔍 Generating connection strings from ${this.containers.size} containers:`, Array.from(this.containers.keys()));
    
    // Get connection strings for all database services
    for (const [serviceName, container] of this.containers) {
      const serviceConfig = this.config.services.find(s => s.name === serviceName);
      if (!serviceConfig || !serviceConfig.envMapping) {
        console.log(`⚠️  Skipping ${serviceName}: no envMapping found`);
        continue;
      }
      
      console.log(`🔗 Processing ${serviceName} with envMapping:`, serviceConfig.envMapping);
      
      const mapping = serviceConfig.envMapping;
      const host = container.getHost();
      const port = this.getServicePort(serviceName);
      
      console.log(`📍 Container ${serviceName} details:`, {
        host,
        port,
        mappedPort: container.getMappedPort(port)
      });
      
      // Get database credentials from container environment
      const environment = serviceConfig.environment || {};
      
      // Generate connection strings based on envMapping
      if (mapping.host) {
        connectionStrings[mapping.host] = host;
      }
      if (mapping.port) {
        connectionStrings[mapping.port] = container.getMappedPort(port).toString();
      }
      if (mapping.username) {
        connectionStrings[mapping.username] = environment.POSTGRES_USER || environment.MYSQL_USER || environment.MONGO_INITDB_ROOT_USERNAME || 'test';
      }
      if (mapping.password) {
        connectionStrings[mapping.password] = environment.POSTGRES_PASSWORD || environment.MYSQL_PASSWORD || environment.MONGO_INITDB_ROOT_PASSWORD || 'test';
      }
      if (mapping.database) {
        connectionStrings[mapping.database] = environment.POSTGRES_DB || environment.MYSQL_DATABASE || environment.MONGO_INITDB_DATABASE || 'test';
      }
      if (mapping.url) {
        // Generate full connection URL
        const username = environment.POSTGRES_USER || environment.MYSQL_USER || environment.MONGO_INITDB_ROOT_USERNAME || 'test';
        const password = environment.POSTGRES_PASSWORD || environment.MYSQL_PASSWORD || environment.MONGO_INITDB_ROOT_PASSWORD || 'test';
        const database = environment.POSTGRES_DB || environment.MYSQL_DATABASE || environment.MONGO_INITDB_DATABASE || 'test';
        
        let protocol = 'postgresql';
        if (serviceConfig.type === 'mysql') protocol = 'mysql';
        if (serviceConfig.type === 'mongo') protocol = 'mongodb';
        
        connectionStrings[mapping.url] = `${protocol}://${username}:${password}@${host}:${port}/${database}`;
      }
    }
    
    console.log('🔗 Generated connection strings:', Object.keys(connectionStrings));
    return connectionStrings;
  }

  private configureContainerLogging(container: GenericContainer, logging: 'debug' | 'error' | 'log' | 'info' | 'warn' | boolean): GenericContainer {
    if (logging === false) {
      // Disable all logging
      return container.withLogConsumer(() => {});
    } else if (logging === true) {
      // Enable all logging
      return container.withLogConsumer((stream) => {
        stream.on('data', (chunk) => {
          console.log(`[${new Date().toISOString()}] Container:`, chunk.toString().trim());
        });
      });
    } else {
      // Enable specific log level
      return container.withLogConsumer((stream) => {
        stream.on('data', (chunk) => {
          const message = chunk.toString().trim();
          const timestamp = new Date().toISOString();
          
          // Filter logs based on level
          if (this.shouldLogMessage(message, logging)) {
            console.log(`[${timestamp}] [${logging.toUpperCase()}] Container:`, message);
          }
        });
      });
    }
  }

  private shouldLogMessage(message: string, level: 'debug' | 'error' | 'log' | 'info' | 'warn'): boolean {
    const messageLower = message.toLowerCase();
    
    switch (level) {
      case 'error':
        return messageLower.includes('error') || messageLower.includes('fatal') || messageLower.includes('critical');
      case 'warn':
        return messageLower.includes('warn') || messageLower.includes('warning') || this.shouldLogMessage(message, 'error');
      case 'info':
        return messageLower.includes('info') || this.shouldLogMessage(message, 'warn');
      case 'log':
        return messageLower.includes('log') || this.shouldLogMessage(message, 'info');
      case 'debug':
        return true; // Debug shows everything
      default:
        return true;
    }
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
    try {
      // Start database and infrastructure services first
      await this.startInfrastructureServices();
      
      // Generate connection strings
      const connectionStrings = this.getServiceConnectionStrings();
      
      // Start application services with connection strings
      await this.startApplicationServices(connectionStrings);
    } catch (error) {
      console.error('❌ Error starting services:', error);
      // Cleanup on error
      await this.cleanupOnError();
      throw error;
    }
  }

  private async startInfrastructureServices(): Promise<void> {
    const startedServices = new Set<string>();
    const serviceMap = new Map(this.config.services.map(s => [s.name, s]));
    
    // Start only infrastructure services (databases, redis, etc.) first
    for (const service of this.config.services) {
      if (service.type !== 'service') {
        await this.startServiceWithDependencies(service, serviceMap, startedServices);
      }
    }
  }

  private async startApplicationServices(connectionStrings: Record<string, string>): Promise<void> {
    const startedServices = new Set<string>();
    const serviceMap = new Map(this.config.services.map(s => [s.name, s]));
    
    // Start application services with connection strings
    for (const service of this.config.services) {
      if (service.type === 'service') {
        await this.startServiceWithDependenciesAndEnv(service, serviceMap, startedServices, connectionStrings);
      }
    }
  }

  private async startServicesWithDependencies(): Promise<void> {
    const startedServices = new Set<string>();
    const serviceMap = new Map(this.config.services.map(s => [s.name, s]));
    
    // Start services in dependency order
    for (const service of this.config.services) {
      await this.startServiceWithDependencies(service, serviceMap, startedServices);
    }
  }

  private async startServiceWithDependencies(
    service: ServiceConfig, 
    serviceMap: Map<string, ServiceConfig>, 
    startedServices: Set<string>
  ): Promise<void> {
    // Skip if already started
    if (startedServices.has(service.name)) {
      return;
    }

    // Start dependencies first
    if (service.dependsOn) {
      for (const depName of service.dependsOn) {
        const depService = serviceMap.get(depName);
        if (depService && !startedServices.has(depName)) {
          await this.startServiceWithDependencies(depService, serviceMap, startedServices);
        }
      }
    }

    // Start this service
    await this.startService(service);
    startedServices.add(service.name);
  }

  private async startServiceWithDependenciesAndEnv(
    service: ServiceConfig, 
    serviceMap: Map<string, ServiceConfig>, 
    startedServices: Set<string>,
    connectionStrings: Record<string, string>
  ): Promise<void> {
    // Skip if already started
    if (startedServices.has(service.name)) {
      return;
    }

    // Start dependencies first
    if (service.dependsOn) {
      for (const depName of service.dependsOn) {
        const depService = serviceMap.get(depName);
        if (depService && !startedServices.has(depName)) {
          // Dependencies should already be started by infrastructure services
          console.log(`⚠️  Dependency ${depName} should already be started by infrastructure services`);
        }
      }
    }

    // Start this service with connection strings
    await this.startServiceWithEnv(service, connectionStrings);
    startedServices.add(service.name);
  }

  private async startService(serviceConfig: ServiceConfig): Promise<void> {
    console.log(`Starting service: ${serviceConfig.name}`);
    
    // Handle local mode for service type
    if (serviceConfig.type === 'service' && serviceConfig.mode === 'local') {
      await this.startLocalServiceLegacy(serviceConfig);
      return;
    }
    
    let container: GenericContainer;
    
    switch (serviceConfig.type) {
      case 'postgres':
        const postgresEnv = EnvironmentManager.mergeWithDefaults(
          serviceConfig.environment, 
          EnvironmentManager.getDefaultDatabaseEnv('postgres')
        );
        container = new GenericContainer('postgres:15-alpine')
          .withEnvironment(postgresEnv)
          .withExposedPorts(5432)
          .withWaitStrategy(HealthCheckManager.getHybridHealthCheck('postgres', 5432));
        
        if (serviceConfig.containerName) {
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
        }
        break;
        
      case 'mysql':
        const mysqlEnv = EnvironmentManager.mergeWithDefaults(
          serviceConfig.environment, 
          EnvironmentManager.getDefaultDatabaseEnv('mysql')
        );
        container = new GenericContainer('mysql:8.0')
          .withEnvironment(mysqlEnv)
          .withExposedPorts(3306)
          .withWaitStrategy(HealthCheckManager.getHybridHealthCheck('mysql', 3306));
        
        if (serviceConfig.containerName) {
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
        }
        break;
        
      case 'mongo':
        const mongoEnv = EnvironmentManager.mergeWithDefaults(
          serviceConfig.environment, 
          EnvironmentManager.getDefaultDatabaseEnv('mongo')
        );
        container = new GenericContainer('mongo:7.0')
          .withEnvironment(mongoEnv)
          .withExposedPorts(27017)
          .withWaitStrategy(HealthCheckManager.getHybridHealthCheck('mongo', 27017));
        
        if (serviceConfig.containerName) {
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
        }
        break;
        
      case 'redis':
        const redisEnv = EnvironmentManager.mergeWithDefaults(
          serviceConfig.environment, 
          EnvironmentManager.getDefaultDatabaseEnv('redis')
        );
        container = new GenericContainer('redis:7-alpine')
          .withEnvironment(redisEnv)
          .withExposedPorts(6379)
          .withWaitStrategy(HealthCheckManager.getHybridHealthCheck('redis', 6379));
        
        if (serviceConfig.containerName) {
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
        }
        break;
        
      case 'mailhog':
        container = new GenericContainer('mailhog/mailhog:latest')
          .withExposedPorts(1025, 8025)
          .withWaitStrategy(Wait.forHttp('/', 8025));
        
        if (serviceConfig.containerName) {
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
        }
        break;
        
      case 'service':
        if (!serviceConfig.image) {
          throw new Error(`App service ${serviceConfig.name} requires image`);
        }
        // Get dependency information for environment variables
        const dependencyInfo = this.getDependencyInfo(serviceConfig);
        const appEnv = EnvironmentManager.generateEnvironmentVars(serviceConfig, dependencyInfo);
        
        container = new GenericContainer(serviceConfig.image)
          .withEnvironment(appEnv);
        
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
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
        }
        break;
        
      default:
        if (!serviceConfig.image) {
          throw new Error(`Custom service ${serviceConfig.name} requires image`);
        }
        container = new GenericContainer(serviceConfig.image);
        
        if (serviceConfig.containerName) {
          // Add worker ID to container name to avoid conflicts
          const uniqueContainerName = `${serviceConfig.containerName}-${this.workerId}`;
          // Remove any existing container with the same name
          await this.removeConflictingContainer(uniqueContainerName);
          container = container.withName(uniqueContainerName);
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
    
    // Apply logging configuration
    if (serviceConfig.logging !== undefined) {
      container = this.configureContainerLogging(container, serviceConfig.logging);
      console.log(`📝 Logging configured for ${serviceConfig.name}: ${serviceConfig.logging}`);
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

  private async startServiceWithEnv(serviceConfig: ServiceConfig, connectionStrings: Record<string, string>): Promise<void> {
    console.log(`Starting service with environment: ${serviceConfig.name}`);
    
    // Handle local mode for service type
    if (serviceConfig.type === 'service' && serviceConfig.mode === 'local') {
      await this.startLocalServiceWithEnv(serviceConfig, connectionStrings);
      return;
    }
    
    // For container services, use the existing startService method but with updated environment
    // We need to modify the environment variables before starting
    const originalEnv = serviceConfig.environment;
    serviceConfig.environment = {
      ...connectionStrings,
      ...serviceConfig.environment
    };
    
    try {
      await this.startService(serviceConfig);
    } finally {
      // Restore original environment
      serviceConfig.environment = originalEnv;
    }
  }

  private async startLocalServiceWithEnv(serviceConfig: ServiceConfig, connectionStrings: Record<string, string>): Promise<void> {
    if (!serviceConfig.command) {
      throw new Error(`Local service ${serviceConfig.name} requires command`);
    }

    console.log(`🚀 Starting local service: ${serviceConfig.name}`);
    console.log(`   Command: ${serviceConfig.command}`);
    console.log(`   Working directory: ${serviceConfig.workingDirectory || '.'}`);
    console.log(`🔗 Connection strings for local service:`, connectionStrings);

    // Set environment variables with connection strings
    const env: Record<string, string> = {
      NODE_ENV: 'test',
      TEST_MODE: '1',
      WORKER_ID: this.workerId,
      ...connectionStrings,
      ...serviceConfig.environment,
      ...process.env  // Inherit from parent process
    };

    console.log(`📝 Environment variables for local service:`, Object.keys(env).filter(key => 
      key.includes('DB_') || key.includes('DATABASE_') || key.includes('POSTGRES_')
    ));

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

    // Log stdout from the process
    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`📱 [${serviceConfig.name}] ${output}`);
      }
    });

    // Log stderr from the process
    childProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`🚨 [${serviceConfig.name}] ${output}`);
      }
    });

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

    // Only log if the process is still running (avoid logging after tests are done)
    if (childProcess.pid && !childProcess.killed) {
      console.log(`✅ Local service ${serviceConfig.name} started (PID: ${childProcess.pid})`);
    }
  }

  private async startLocalServiceLegacy(serviceConfig: ServiceConfig): Promise<void> {
    if (!serviceConfig.command) {
      throw new Error(`Local service ${serviceConfig.name} requires command`);
    }

    console.log(`🚀 Starting local service: ${serviceConfig.name}`);
    console.log(`   Command: ${serviceConfig.command}`);
    console.log(`   Working directory: ${serviceConfig.workingDirectory || '.'}`);

    // Set environment variables (without connection strings for legacy mode)
    const env: Record<string, string> = {
      NODE_ENV: 'test',
      TEST_MODE: '1',
      WORKER_ID: this.workerId,
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

    // Log stdout from the process
    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`📱 [${serviceConfig.name}] ${output}`);
      }
    });

    // Log stderr from the process
    childProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`🚨 [${serviceConfig.name}] ${output}`);
      }
    });

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

    // Only log if the process is still running (avoid logging after tests are done)
    if (childProcess.pid && !childProcess.killed) {
      console.log(`✅ Local service ${serviceConfig.name} started (PID: ${childProcess.pid})`);
    }
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
    
    // Get connection strings for database services
    const connectionStrings = this.getServiceConnectionStrings();
    
    const db = new DatabaseManager(dbService, this.workerId, connectionStrings);
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


  private getDependencyInfo(service: ServiceConfig): Map<string, { host: string; port: number; env: Record<string, string> }> {
    const dependencyInfo = new Map<string, { host: string; port: number; env: Record<string, string> }>();
    
    if (service.dependsOn) {
      for (const depName of service.dependsOn) {
        const depContainer = this.containers.get(depName);
        if (depContainer) {
          const depService = this.config.services.find(s => s.name === depName);
          if (depService) {
            const port = depContainer.getMappedPort(PortManager.getDatabasePorts()[depService.type] || 3000);
            dependencyInfo.set(depName, {
              host: depName, // Use service name as hostname in Docker network
              port: port,
              env: depService.environment || {}
            });
          }
        }
      }
    }
    
    return dependencyInfo;
  }
}
