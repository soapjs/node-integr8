import { Integr8Config, IOrchestrator, StorageConfig, IEventBusManager } from "../../types";
import { Logger } from "../../utils/logger";
import { LocalRunner } from "../runners/local-runner";
import { ContainerRunner } from "../runners/container-runner";

export class StorageOrchestrator implements IOrchestrator {
  private configs: StorageConfig[] = [];
  private runners: Map<string, LocalRunner | ContainerRunner> = new Map();

  constructor(
    private readonly config: Integr8Config,
    private readonly logger: Logger,
    private readonly eventBus: IEventBusManager
  ) {
    this.configs = config.storages || [];
  }

  async start(fast: boolean): Promise<void> {
    this.logger.info('Starting storage orchestrator...');
    
    for (const storageConfig of this.configs) {
      await this.startService(storageConfig, fast);
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping storage orchestrator...');
    
    for (const [serviceName, runner] of this.runners) {
      await this.stopService({ name: serviceName, category: 'storage' } as StorageConfig);
    }
  }

  async isReady(serviceName: string): Promise<boolean> {
    const runner = this.runners.get(serviceName);
    if (!runner) {
      return false;
    }
    return runner.isReady(serviceName);
  }

  async startService(service: StorageConfig, fast: boolean): Promise<void> {
    this.logger.info(`Starting storage service: ${service.name}`);

    try {
      let runner: LocalRunner | ContainerRunner;

      if (service.local) {
        runner = new LocalRunner(service, this.logger);
      } else if (service.container) {
        runner = new ContainerRunner(service, this.logger);
      } else {
        throw new Error(`Storage service ${service.name} must have either local or container config`);
      }

      await runner.start(fast);
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

  async stopService(service: StorageConfig): Promise<void> {
    const runner = this.runners.get(service.name);
    if (!runner) {
      this.logger.info(`Storage service ${service.name} not running`);
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
      this.logger.error(`Error stopping storage service ${service.name}:`, error);
      throw error;
    }
  }
} 