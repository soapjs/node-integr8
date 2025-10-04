import { Integr8Config, IOrchestrator, ServiceConfig, IEventBusManager } from "../../types";
import { Logger } from "../../utils/logger";
import { LocalRunner } from "../runners/local-runner";
import { ContainerRunner } from "../runners/container-runner";

export class ServiceOrchestrator implements IOrchestrator {
  private configs: ServiceConfig[] = [];
  private runners: Map<string, LocalRunner | ContainerRunner> = new Map();
  private databaseConnectionStrings: Record<string, string> = {};

  constructor(
    private readonly config: Integr8Config,
    private readonly logger: Logger,
    private readonly eventBus: IEventBusManager
  ) {
    this.configs = config.services || [];
  }

  async start(fast: boolean): Promise<void> {
    this.logger.info('Starting service orchestrator...');
    
    for (const serviceConfig of this.configs) {
      await this.startService(serviceConfig, fast);
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping service orchestrator...');
    
    for (const [serviceName, runner] of this.runners) {
      await this.stopService({ name: serviceName, category: 'service' } as ServiceConfig);
    }
  }

  async isReady(serviceName: string): Promise<boolean> {
    const runner = this.runners.get(serviceName);
    if (!runner) {
      return false;
    }
    return runner.isReady(serviceName);
  }

  async startService(service: ServiceConfig, fast: boolean): Promise<void> {
    this.logger.info(`Starting service: ${service.name}`);

    try {
      let runner: LocalRunner | ContainerRunner;

      if (service.local) {
        runner = new LocalRunner(service, this.logger);
      } else if (service.container) {
        runner = new ContainerRunner(service, this.logger);
      } else {
        throw new Error(`Service ${service.name} must have either local or container config`);
      }

      // Pass connection strings to the runner if it's a ContainerRunner
      if (runner instanceof ContainerRunner) {
        // For container services, connection strings are already handled by the container
        await runner.start(fast);
      } else {
        // For local services, we need to pass connection strings as environment variables
        await this.startLocalServiceWithConnectionStrings(service, runner, fast);
      }
      
      this.runners.set(service.name, runner);

      // Publish event
      await this.eventBus.publish('service:started', { 
        serviceName: service.name, 
        service 
      });

    } catch (error) {
      await this.eventBus.publish('service:failed', { 
        serviceName: service.name, 
        service, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async stopService(service: ServiceConfig): Promise<void> {
    const runner = this.runners.get(service.name);
    if (!runner) {
      this.logger.info(`Service ${service.name} not running`);
      return;
    }

    try {
      await runner.stop();
      this.runners.delete(service.name);

      // Publish event
      await this.eventBus.publish('service:stopped', { 
        serviceName: service.name, 
        service 
      });

    } catch (error) {
      this.logger.error(`Error stopping service ${service.name}:`, error);
      throw error;
    }
  }

  setDatabaseConnectionStrings(connectionStrings: Record<string, string>): void {
    this.databaseConnectionStrings = connectionStrings;
  }

  private async startLocalServiceWithConnectionStrings(
    service: ServiceConfig, 
    runner: LocalRunner, 
    fast: boolean
  ): Promise<void> {
    // For local services, we need to pass connection strings as environment variables
    // This is a simplified approach - in real implementation you'd modify the runner
    // to accept additional environment variables
    
    // Merge connection strings with service environment
    const originalEnv = service.environment || {};
    service.environment = {
      ...this.databaseConnectionStrings,
      ...originalEnv
    };

    try {
      await runner.start(fast);
    } finally {
      // Restore original environment
      service.environment = originalEnv;
    }
  }
} 