import { Integr8Config, ServiceConfig, DatabaseConfig, MessagingConfig, StorageConfig } from '../types';
import { Logger } from '../utils/logger';
import { EventBusManager } from './event-bus-manager';
import { ServiceOrchestrator } from './orchestrators/service-orchestrator';
import { DatabaseOrchestrator } from './orchestrators/database-orchestrator';
import { MessagingOrchestrator } from './orchestrators/messaging-orchestrator';
import { StorageOrchestrator } from './orchestrators/storage-orchestrator';

export interface IServiceManager {
  start(fast: boolean): Promise<void>;
  stop(): Promise<void>;
  isServiceReady(serviceName: string): Promise<boolean>;
  getServiceStatus(serviceName: string): ServiceStatus;
}

export enum ServiceStatus {
  PENDING = 'pending',
  STARTING = 'starting', 
  RUNNING = 'running',
  FAILED = 'failed',
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

export class ServiceManager implements IServiceManager {
  private orchestrators: Map<string, any> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private serviceDependencies: Map<string, string[]> = new Map();
  private eventBus: EventBusManager;

  constructor(
    private config: Integr8Config,
    private logger: Logger,
    private workerId: string
  ) {
    this.eventBus = new EventBusManager(config, workerId, logger);
    this.initializeOrchestrators();
    this.buildDependencyGraph();
    this.setupEventListeners();
  }

  private initializeOrchestrators(): void {
    // Initialize orchestrators for each service type
    this.orchestrators.set('service', new ServiceOrchestrator(this.config, this.logger, this.eventBus));
    this.orchestrators.set('database', new DatabaseOrchestrator(this.config, this.logger, this.eventBus));
    this.orchestrators.set('messaging', new MessagingOrchestrator(this.config, this.logger, this.eventBus));
    this.orchestrators.set('storage', new StorageOrchestrator(this.config, this.logger, this.eventBus));
  }

  private buildDependencyGraph(): void {
    // Build dependency graph for all services
    const allServices = [
      ...(this.config.services || []),
      ...(this.config.databases || []),
      ...(this.config.messaging || []),
      ...(this.config.storages || [])
    ];

    allServices.forEach(service => {
      this.serviceStatus.set(service.name, ServiceStatus.PENDING);
      this.serviceDependencies.set(service.name, service.dependsOn || []);
    });
  }

  private setupEventListeners(): void {
    // Listen for service events
    this.eventBus.subscribe('service:starting', (data) => {
      this.serviceStatus.set(data.serviceName, ServiceStatus.STARTING);
      this.logger.info(`Service ${data.serviceName} is starting...`);
    });

    this.eventBus.subscribe('service:started', (data) => {
      this.serviceStatus.set(data.serviceName, ServiceStatus.RUNNING);
      this.logger.info(`Service ${data.serviceName} started successfully`);
    });

    this.eventBus.subscribe('service:failed', (data) => {
      this.serviceStatus.set(data.serviceName, ServiceStatus.FAILED);
      this.logger.error(`Service ${data.serviceName} failed: ${data.error}`);
    });

    this.eventBus.subscribe('service:stopping', (data) => {
      this.serviceStatus.set(data.serviceName, ServiceStatus.STOPPING);
      this.logger.info(`Service ${data.serviceName} is stopping...`);
    });

    this.eventBus.subscribe('service:stopped', (data) => {
      this.serviceStatus.set(data.serviceName, ServiceStatus.STOPPED);
      this.logger.info(`Service ${data.serviceName} stopped`);
    });
  }

  async start(fast: boolean = false): Promise<void> {
    this.logger.info('Starting all services...');
    
    // Get all services sorted by dependencies
    const sortedServices = this.getTopologicallySortedServices();
    
    // Start services in dependency order
    for (const service of sortedServices) {
      await this.startService(service, fast);
    }
    
    this.logger.info('All services started successfully');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping all services...');
    
    // Stop services in reverse dependency order
    const sortedServices = this.getTopologicallySortedServices().reverse();
    
    for (const service of sortedServices) {
      await this.stopService(service);
    }
    
    this.logger.info('All services stopped');
  }

  private async startService(service: ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig, fast: boolean): Promise<void> {
    const serviceName = service.name;
    const currentStatus = this.serviceStatus.get(serviceName);
    
    if (currentStatus === ServiceStatus.RUNNING || currentStatus === ServiceStatus.STARTING) {
      this.logger.info(`Service ${serviceName} is already ${currentStatus}, skipping`);
      return;
    }

    // Check if dependencies are ready
    const dependencies = this.serviceDependencies.get(serviceName) || [];
    for (const depName of dependencies) {
      const depStatus = this.serviceStatus.get(depName);
      if (depStatus !== ServiceStatus.RUNNING) {
        throw new Error(`Dependency ${depName} is not ready (status: ${depStatus})`);
      }
    }

    // Publish starting event
    await this.eventBus.publish('service:starting', { serviceName, service });

    try {
      // Get appropriate orchestrator
      const orchestrator = this.getOrchestratorForService(service);
      
      // If this is a service, pass database connection strings
      if (service.category === 'service' && orchestrator.setDatabaseConnectionStrings) {
        const databaseOrchestrator = this.orchestrators.get('database');
        if (databaseOrchestrator) {
          const connectionStrings = databaseOrchestrator.getConnectionStrings();
          orchestrator.setDatabaseConnectionStrings(connectionStrings);
        }
      }
      
      // Start the service through orchestrator
      await orchestrator.startService(service, fast);
      
      // Publish started event
      await this.eventBus.publish('service:started', { serviceName, service });
      
    } catch (error) {
      // Publish failed event
      await this.eventBus.publish('service:failed', { 
        serviceName, 
        service, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  private async stopService(service: ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig): Promise<void> {
    const serviceName = service.name;
    const currentStatus = this.serviceStatus.get(serviceName);
    
    if (currentStatus === ServiceStatus.STOPPED || currentStatus === ServiceStatus.STOPPING) {
      this.logger.info(`Service ${serviceName} is already ${currentStatus}, skipping`);
      return;
    }

    // Publish stopping event
    await this.eventBus.publish('service:stopping', { serviceName, service });

    try {
      // Get appropriate orchestrator
      const orchestrator = this.getOrchestratorForService(service);
      
      // Stop the service through orchestrator
      await orchestrator.stopService(service);
      
      // Publish stopped event
      await this.eventBus.publish('service:stopped', { serviceName, service });
      
    } catch (error) {
      this.logger.error(`Error stopping service ${serviceName}:`, error);
      // Still mark as stopped even if there was an error
      this.serviceStatus.set(serviceName, ServiceStatus.STOPPED);
    }
  }

  private getOrchestratorForService(service: ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig): any {
    switch (service.category) {
      case 'service':
        return this.orchestrators.get('service');
      case 'database':
        return this.orchestrators.get('database');
      case 'messaging':
        return this.orchestrators.get('messaging');
      case 'storage':
        return this.orchestrators.get('storage');
    }
  }

  private getTopologicallySortedServices(): (ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig)[] {
    const allServices = [
      ...(this.config.services || []),
      ...(this.config.databases || []),
      ...(this.config.messaging || []),
      ...(this.config.storages || [])
    ];

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: (ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig)[] = [];

    const visit = (serviceName: string) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving ${serviceName}`);
      }
      if (visited.has(serviceName)) {
        return;
      }

      visiting.add(serviceName);
      const dependencies = this.serviceDependencies.get(serviceName) || [];
      
      for (const depName of dependencies) {
        visit(depName);
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      
      const service = allServices.find(s => s.name === serviceName);
      if (service) {
        result.push(service);
      }
    };

    for (const service of allServices) {
      if (!visited.has(service.name)) {
        visit(service.name);
      }
    }

    return result;
  }

  async isServiceReady(serviceName: string): Promise<boolean> {
    const status = this.serviceStatus.get(serviceName);
    return status === ServiceStatus.RUNNING;
  }

  getServiceStatus(serviceName: string): ServiceStatus {
    return this.serviceStatus.get(serviceName) || ServiceStatus.PENDING;
  }

  private async startInfrastructureServices(fast: boolean): Promise<void> {
    // Start databases first
    const databaseOrchestrator = this.orchestrators.get('database');
    if (databaseOrchestrator) {
      await databaseOrchestrator.start(fast);
    }

    // Start messaging services
    const messagingOrchestrator = this.orchestrators.get('messaging');
    if (messagingOrchestrator) {
      await messagingOrchestrator.start(fast);
    }

    // Start storage services
    const storageOrchestrator = this.orchestrators.get('storage');
    if (storageOrchestrator) {
      await storageOrchestrator.start(fast);
    }
  }

  private async startApplicationServices(fast: boolean): Promise<void> {
    // Get connection strings from database orchestrator
    const databaseOrchestrator = this.orchestrators.get('database');
    const serviceOrchestrator = this.orchestrators.get('service');
    
    if (databaseOrchestrator && serviceOrchestrator) {
      const connectionStrings = databaseOrchestrator.getConnectionStrings();
      serviceOrchestrator.setDatabaseConnectionStrings(connectionStrings);
    }

    // Start application services
    const serviceOrchestrator2 = this.orchestrators.get('service');
    if (serviceOrchestrator2) {
      await serviceOrchestrator2.start(fast);
    }
  }
}
