import { spawn } from "child_process";
import { ReadinessConfig } from "../types";
import { Logger } from "./logger";

export class Readiness {
  static async isReady(config: ReadinessConfig | undefined, logger: Logger): Promise<boolean> {
    if (!config) {
      console.log('⚠️  No readiness check configured, assuming ready');
      return true;
    }

    const { command, endpoint, interval = 1000, timeout = 30000, retries = 3 } = config;
    
    try {
      if (command) {
        return await this.runWithRetries(
          () => this.runCommand(command, logger),
          retries,
          interval,
          timeout,
          logger,
          `Command: ${command}`
        );
      }
      if (endpoint) {
        return await this.runWithRetries(
          () => this.runEndpoint(endpoint, logger),
          retries,
          interval,
          timeout,
          logger,
          `Endpoint: ${endpoint}`
        );
      }
      return false;
    } catch (error) {
      logger.error(`Readiness check failed: ${error}`);
      return false;
    }
  }

  private static async runWithRetries(
    operation: () => Promise<boolean>,
    retries: number,
    interval: number,
    timeout: number,
    logger: Logger,
    operationName: string
  ): Promise<boolean> {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (Date.now() - startTime > timeout) {
          logger.error(`${operationName} timed out after ${timeout}ms`);
          return false;
        }

        logger.info(`${operationName} - attempt ${attempt}/${retries}`);
        
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(timeout - (Date.now() - startTime))
        ]);

        if (result) {
          logger.info(`${operationName} succeeded on attempt ${attempt}`);
          return true;
        }

        if (attempt < retries) {
          logger.info(`${operationName} failed, retrying in ${interval}ms...`);
          await this.sleep(interval);
        }
      } catch (error) {
        logger.error(`${operationName} attempt ${attempt} failed with error: ${error}`);
        
        if (attempt === retries) {
          return false;
        }
        
        await this.sleep(interval);
      }
    }

    logger.error(`${operationName} failed after ${retries} attempts`);
    return false;
  }

  private static createTimeoutPromise(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async runCommand(command: string, logger: Logger): Promise<boolean> {
    return new Promise((resolve, _) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let resolved = false;

      child.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          resolve(code === 0);
        }
      });
      
      child.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          logger.error(`Command ${command} failed with error ${error}`);
          resolve(false);
        }
      });
    });
  }

  static async runEndpoint(endpoint: string, logger: Logger): Promise<boolean> {    
    try {
      const response = await fetch(endpoint);
      return response.ok;
    } catch (error) {
      logger.error(`Endpoint ${endpoint} failed with error ${error}`);
      return false;
    }
  }
}