import chalk from "chalk";
import { ChildProcess, spawn } from "child_process";
import { ServiceConfig, DatabaseConfig, StorageConfig, MessagingConfig, IRunner } from "../../types";
import { Logger } from "../../utils/logger";
import { Readiness } from "../../utils/readiness";

export class LocalRunner implements IRunner {
  private process?: ChildProcess;
  private serviceLogger: Logger | undefined;

  constructor(
    private config: ServiceConfig | DatabaseConfig | StorageConfig | MessagingConfig,
    private readonly logger: Logger,
  ) {
    if (!config.local) {
      throw new Error('Local config is required');
    }

    if (config.logging) {
      this.serviceLogger = new Logger({
        level: typeof config.logging === 'string' ? config.logging : 'debug',
        enabled: true
      });
    }
  }

  async start(fast: boolean = false): Promise<void> {
    if (!this.config.local) {
      throw new Error('Local config is required');
    }

    this.logger.info(`Starting local service: ${this.config.name}`);
    this.logger.info(`   Command: ${this.config.local.command}`);
    this.logger.info(`   Working directory: ${this.config.local.cwd || '.'}`);

    // Set environment variables
    const env: Record<string, string> = {
      NODE_ENV: 'test',
      TEST_MODE: '1',
      ...this.config.environment,
      ...process.env  // Inherit from parent process
    };

    // Parse command and arguments
    const [command, ...args] = this.config.local.command.split(' ');
    
    // Start the process
    this.process = spawn(command, args, {
      cwd: this.config.local.cwd || '.',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    this.setupProcessListeners();

    // Wait a bit for the process to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Only log if the process is still running
    if (this.process.pid && !this.process.killed) {
      this.logger.info(`✅ Local service ${this.config.name} started (PID: ${this.process.pid})`);
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.logger.info(`Process ${this.config.name} not running`);
      return;
    }

    this.logger.info(`Stopping local process: ${this.config.name} (PID: ${this.process.pid})`);
    
    try {
      if (this.process.killed || this.process.exitCode !== null) {
        this.logger.info(`Process ${this.config.name} already stopped`);
        return;
      }

      this.process.kill('SIGTERM');
      
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts && !this.process.killed && this.process.exitCode === null) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!this.process.killed && this.process.exitCode === null) {
        this.logger.info(`Force killing local process: ${this.config.name}`);
        this.process.kill('SIGKILL');
        // delay to ensure process is killed
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.logger.info(`✅ Process ${this.config.name} stopped`);
    } catch (error) {
      this.logger.error(`⚠️ Process ${this.config.name} already stopped or not found:`, error instanceof Error ? error.message : String(error));
    } finally {
      this.process = undefined;
    }
  }

  async isReady(serviceName: string): Promise<boolean> {
    if (!this.process || this.process.killed || this.process.exitCode !== null) {
      return false;
    }

    if (!this.config.readiness) {
      this.logger.info('⚠️  No readiness check configured, assuming ready');
      return true;
    }

    return Readiness.isReady(this.config.readiness, this.logger);
  }

  private setupProcessListeners(): void {
    if (!this.process) return;

    if (this.serviceLogger === undefined) {
      return;
    }

    const logging = typeof this.config.logging === 'string' ? this.config.logging : 'debug';

    if (logging === 'error') {
      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          this.serviceLogger?.error(`Local service:`, output);
        }
      });
    } else {
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          this.serviceLogger?.[logging](`Local service:`, output);
        }
      });
    }

    // Handle process events
    this.process.on('error', (error: Error) => {
      this.logger.error(`❌ Local service ${this.config.name} error:`, error);
    });

    this.process.on('exit', (code: number | null, signal: string | null) => {
      if (code !== 0) {
        this.logger.error(`❌ Local service ${this.config.name} exited with code ${code}, signal ${signal}`);
      } else {
        this.logger.info(`✅ Local service ${this.config.name} exited normally`);
      }
    });
  }
}