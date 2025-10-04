import chalk from 'chalk';
import { Integr8Config, IEnvironmentOrchestrator } from '../types';
import { EnvironmentContext } from './environment-context';
import { ServiceManager } from './service-manager';
import { Logger } from '../utils/logger';

export class EnvironmentOrchestrator implements IEnvironmentOrchestrator {
  private config: Integr8Config;
  private context?: EnvironmentContext;
  private workerId: string;
  private serviceManager: ServiceManager;
  private logger: Logger;

  constructor(logger: Logger, config: Integr8Config, workerId?: string) {
    this.config = config;
    // Only generate workerId if not in shared environment mode
    if (process.env.INTEGR8_SHARED_ENVIRONMENT === 'true') {
      this.workerId = 'shared';
    } else {
      this.workerId = workerId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    this.logger = logger;
    this.serviceManager = new ServiceManager(config, this.logger, this.workerId);
    this.setupCleanup();
  }

  private setupCleanup(){
    const cleanup = async () => {
      console.log(chalk.yellow('\n⚠️  Received termination signal, cleaning up...'));
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error(chalk.red('❌ Error during cleanup:'), error);
        process.exit(1);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red('❌ Uncaught Exception:'), error);
      await cleanup();
    });
    
    process.on('unhandledRejection', async (reason) => {
      console.error(chalk.red('❌ Unhandled Rejection:'), reason);
      await cleanup();
    });
  }

  async start(fast: boolean = false): Promise<void> {
    console.log(chalk.blue(`Starting environment for worker ${this.workerId}`));
    
    try {
      // Use ServiceManager to start all services in dependency order
      await this.serviceManager.start(fast);

      // Create and initialize context after all services are started
      this.context = EnvironmentContext.create(this.config, this.workerId, this.logger);
      await this.context.initialize();

      console.log(chalk.green(`✅ Environment ${fast ? 'started' : 'ready'} for worker ${this.workerId}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error ${fast ? 'fast' : ''}starting environment:`), error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log(chalk.yellow(`🛑 Stopping environment for worker ${this.workerId}`));
    
    try {
      // Use ServiceManager to stop all services in reverse dependency order
      await this.serviceManager.stop();
      
      console.log(chalk.green(`✅ Environment stopped for worker ${this.workerId}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error stopping environment:`), error);
      throw error;
    }
  }

  getAccessPoint(serviceName: string, serviceType: string): string {
     return '';
  }

  async isReady(serviceName: string): Promise<boolean> {
    return this.serviceManager.isServiceReady(serviceName);
  }

  async startService(service: any, fast: boolean): Promise<void> {
    // Delegate to ServiceManager
    await this.serviceManager.start(fast);
  }

  async stopService(service: any): Promise<void> {
    // Delegate to ServiceManager
    await this.serviceManager.stop();
  }

  getContext(): EnvironmentContext {
    if (!this.context) {
      throw new Error('Environment not initialized');
    }
    return this.context;
  }

}
