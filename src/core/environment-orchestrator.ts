import { 
  GenericContainer, 
  StartedTestContainer, 
  Wait,
  Network,
  StartedNetwork
} from 'testcontainers';
import { Integr8Config, EnvironmentOrchestrator as IEnvironmentOrchestrator, EnvironmentContext, ServiceConfig, AppConfig } from '../types';
import { HttpClient } from './http-client';
import { DatabaseManager } from './database-manager';
import { TestContext } from './test-context';
import { ClockManager } from './clock-manager';
import { EventBusManager } from './event-bus-manager';

export class EnvironmentOrchestrator implements IEnvironmentOrchestrator {
  private config: Integr8Config;
  private network!: StartedNetwork;
  private containers: Map<string, StartedTestContainer> = new Map();
  private appContainer?: StartedTestContainer;
  private context?: EnvironmentContext;
  private workerId: string;

  constructor(config: Integr8Config, workerId?: string) {
    this.config = config;
    this.workerId = workerId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting environment for worker ${this.workerId}`);
    
    // Create network
    this.network = await new Network().start();
    
    // Start services
    await this.startServices();
    
    // Start app
    await this.startApp();
    
    // Wait for everything to be ready
    await this.waitForReady();
    
    // Initialize context
    this.context = await this.createContext();
    
    console.log(`✅ Environment ready for worker ${this.workerId}`);
  }

  async stop(): Promise<void> {
    console.log(`🛑 Stopping environment for worker ${this.workerId}`);
    
    // Stop app first
    if (this.appContainer) {
      await this.appContainer.stop();
    }
    
    // Stop services
    for (const [name, container] of this.containers) {
      console.log(`Stopping service: ${name}`);
      await container.stop();
    }
    
    // Remove network
    if (this.network) {
      await this.network.stop();
    }
    
    console.log(`✅ Environment stopped for worker ${this.workerId}`);
  }

  async isReady(): Promise<boolean> {
    try {
      // Check if app is responding
      const appUrl = this.getAppUrl();
      const response = await fetch(`${appUrl}${this.config.app.healthcheck}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getServiceUrl(serviceName: string, port?: number): string {
    const container = this.containers.get(serviceName);
    if (!container) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    const actualPort = port || this.getServicePort(serviceName);
    return `http://${container.getHost()}:${container.getMappedPort(actualPort)}`;
  }

  getAppUrl(): string {
    if (!this.appContainer) {
      throw new Error('App container not started');
    }
    return `http://${this.appContainer.getHost()}:${this.appContainer.getMappedPort(this.config.app.port)}`;
  }

  getContext(): EnvironmentContext {
    if (!this.context) {
      throw new Error('Environment not initialized');
    }
    return this.context;
  }

  private async startServices(): Promise<void> {
    const servicePromises = this.config.services.map(service => this.startService(service));
    await Promise.all(servicePromises);
  }

  private async startService(serviceConfig: ServiceConfig): Promise<void> {
    console.log(`Starting service: ${serviceConfig.name}`);
    
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
        break;
        
      case 'redis':
        container = new GenericContainer('redis:7-alpine')
          .withExposedPorts(6379)
          .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'));
        break;
        
      case 'mailhog':
        container = new GenericContainer('mailhog/mailhog:latest')
          .withExposedPorts(1025, 8025)
          .withWaitStrategy(Wait.forHttp('/', 8025));
        break;
        
      default:
        if (!serviceConfig.image) {
          throw new Error(`Custom service ${serviceConfig.name} requires image`);
        }
        container = new GenericContainer(serviceConfig.image);
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
    
    // Start container
    const startedContainer = await container.start();
    this.containers.set(serviceConfig.name, startedContainer);
    
    console.log(`✅ Service ${serviceConfig.name} started`);
  }

  private async startApp(): Promise<void> {
    console.log('Starting application');
    
    if (!this.config.app.image && !this.config.app.context) {
      throw new Error('App must have either image or context');
    }
    
    let container: GenericContainer;
    
    if (this.config.app.image) {
      container = new GenericContainer(this.config.app.image);
    } else {
      // For context-based builds, we'd need to implement Docker build
      // For now, assume it's a pre-built image
      throw new Error('Context-based builds not implemented yet');
    }
    
    // Configure app container
    container = container
      .withExposedPorts(this.config.app.port)
      .withEnvironment({
        NODE_ENV: 'test',
        TEST_MODE: '1',
        WORKER_ID: this.workerId,
        ...this.getServiceConnectionStrings(),
        ...this.config.app.environment
      })
      .withNetwork(this.network)
      .withCommand(this.config.app.command.split(' '));
    
    if (this.config.app.volumes) {
      const bindMounts = this.config.app.volumes.map(volume => ({
        source: volume.host,
        target: volume.container,
        mode: volume.mode || 'rw'
      }));
      container = container.withBindMounts(bindMounts);
    }
    
    // Wait for health check
    container = container.withWaitStrategy(
      Wait.forHttp(this.config.app.healthcheck, this.config.app.port)
    );
    
    this.appContainer = await container.start();
    console.log('✅ Application started');
  }

  private async waitForReady(): Promise<void> {
    console.log('Waiting for environment to be ready...');
    
    const maxAttempts = 30;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isReady()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Environment failed to become ready');
  }

  private async createContext(): Promise<EnvironmentContext> {
    const http = new HttpClient(this.getAppUrl());
    const db = new DatabaseManager(this.config, this.workerId);
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

  private getServiceConnectionStrings(): Record<string, string> {
    const env: Record<string, string> = {};
    
    for (const service of this.config.services) {
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
