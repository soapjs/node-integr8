import { DatabaseConfig, Integr8Config, IOrchestrator, IEventBusManager } from "../../types";
import { Logger } from "../../utils/logger";
import { LocalRunner } from "../runners/local-runner";
import { ContainerRunner } from "../runners/container-runner";

export class DatabaseOrchestrator implements IOrchestrator {
  private configs: DatabaseConfig[] = [];
  private runners: Map<string, LocalRunner | ContainerRunner> = new Map();
  private connectionStrings: Record<string, string> = {};

  constructor(
    private readonly config: Integr8Config,
    private readonly logger: Logger,
    private readonly eventBus: IEventBusManager
  ) {
    this.configs = config.databases || [];
  }

  async start(fast: boolean): Promise<void> {
    this.logger.info('Starting database orchestrator...');
    
    for (const databaseConfig of this.configs) {
      await this.startService(databaseConfig, fast);
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping database orchestrator...');
    
    for (const [serviceName, runner] of this.runners) {
      await this.stopService({ name: serviceName, category: 'database' } as DatabaseConfig);
    }
  }

  async isReady(serviceName: string): Promise<boolean> {
    const runner = this.runners.get(serviceName);
    if (!runner) {
      return false;
    }
    return runner.isReady(serviceName);
  }

  async startService(service: DatabaseConfig, fast: boolean): Promise<void> {
    this.logger.info(`Starting database: ${service.name}`);

    try {
      let runner: LocalRunner | ContainerRunner;

      if (service.local) {
        runner = new LocalRunner(service, this.logger);
      } else if (service.container) {
        runner = new ContainerRunner(service, this.logger);
      } else {
        throw new Error(`Database ${service.name} must have either local or container config`);
      }

      await runner.start(fast);
      this.runners.set(service.name, runner);

      // Collect connection strings (only from ContainerRunner)
      if (runner instanceof ContainerRunner) {
        const serviceConnectionStrings = runner.getConnectionStrings();
        this.connectionStrings = { ...this.connectionStrings, ...serviceConnectionStrings };
      }

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

  async stopService(service: DatabaseConfig): Promise<void> {
    const runner = this.runners.get(service.name);
    if (!runner) {
      this.logger.info(`Database ${service.name} not running`);
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
      this.logger.error(`Error stopping database ${service.name}:`, error);
      throw error;
    }
  }

  getConnectionStrings(): Record<string, string> {
    return this.connectionStrings;
  }
} 