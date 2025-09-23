import { SeedConfig, SeedScenario, ServiceConfig } from '../types';
import { TypeORMAdapter } from '../adapters/typeorm-adapter';

export class SeedManager {
  private serviceConfig: ServiceConfig | undefined;
  private workerId: string;
  private hasSeededOnce: boolean = false;
  private currentSnapshot: string | null = null;
  private seededFiles: Set<string> = new Set();
  private seededTests: Set<string> = new Set();
  private connectionStrings: Record<string, string>;

  constructor(serviceConfig: ServiceConfig | undefined, workerId: string, connectionStrings: Record<string, string> = {}) {
    this.serviceConfig = serviceConfig;
    this.workerId = workerId;
    this.connectionStrings = connectionStrings;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing Seed Manager for worker ${this.workerId}`);
    
    if (this.serviceConfig?.seed) {
      await this.executeSeedingStrategy('initialize');
    }
  }

  async seedForFile(fileName: string): Promise<void> {
    if (!this.serviceConfig?.seed) return;

    const strategy = this.serviceConfig.seed.strategy || 'per-file';
    
    switch (strategy) {
      case 'once':
        if (!this.hasSeededOnce) {
          await this.executeSeedingStrategy('file', fileName);
          this.hasSeededOnce = true;
        }
        break;
        
      case 'per-file':
        if (!this.seededFiles.has(fileName)) {
          await this.executeSeedingStrategy('file', fileName);
          this.seededFiles.add(fileName);
        }
        break;
        
      case 'per-test':
        // Per-test seeding is handled in seedForTest
        break;
        
      case 'custom':
        await this.executeCustomSeeding('file', fileName);
        break;
    }
  }

  async seedForTest(testName: string, filePath: string): Promise<void> {
    if (!this.serviceConfig?.seed) return;

    const strategy = this.serviceConfig.seed.strategy || 'per-file';
    
    switch (strategy) {
      case 'once':
      case 'per-file':
        // Already handled at file level
        break;
        
      case 'per-test':
        const testKey = `${filePath}:${testName}`;
        if (!this.seededTests.has(testKey)) {
          await this.executeSeedingStrategy('test', testName, filePath);
          this.seededTests.add(testKey);
        }
        break;
        
      case 'custom':
        await this.executeCustomSeeding('test', testName, filePath);
        break;
    }
  }

  async restoreAfterFile(fileName: string): Promise<void> {
    if (!this.serviceConfig?.seed) return;

    const restoreStrategy = this.serviceConfig.seed.restoreStrategy || 'rollback';
    
    switch (restoreStrategy) {
      case 'none':
        // No restoration needed
        break;
        
      case 'rollback':
        await this.rollbackToSnapshot();
        break;
        
      case 'reset':
        await this.resetDatabase();
        break;
        
      case 'snapshot':
        await this.restoreSnapshot();
        break;
    }
  }

  async restoreAfterTest(testName: string, filePath: string): Promise<void> {
    if (!this.serviceConfig?.seed) return;

    const strategy = this.serviceConfig.seed.strategy || 'per-file';
    const restoreStrategy = this.serviceConfig.seed.restoreStrategy || 'rollback';
    
    // Only restore after test if using per-test strategy
    if (strategy === 'per-test') {
      switch (restoreStrategy) {
        case 'none':
          break;
        case 'rollback':
          await this.rollbackToSnapshot();
          break;
        case 'reset':
          await this.resetDatabase();
          break;
        case 'snapshot':
          await this.restoreSnapshot();
          break;
      }
    }
  }

  private async executeSeedingStrategy(context: 'initialize' | 'file' | 'test', ...args: string[]): Promise<void> {
    const seedConfig = this.serviceConfig!.seed!;
    
    try {
      if (seedConfig.typeorm) {
        await this.executeTypeORMSeeding(seedConfig);
      } else if (seedConfig.command) {
        await this.executeCommandSeeding(seedConfig);
      } else if (seedConfig.entities) {
        await this.executeEntitySeeding(seedConfig);
      }
      
      // Create snapshot for restoration
      if (context !== 'initialize') {
        await this.createSnapshot();
      }
      
      console.log(`✅ Seeding completed for ${context}: ${args.join(', ')}`);
    } catch (error) {
      console.error(`❌ Seeding failed for ${context}:`, error);
      throw error;
    }
  }

  private async executeCustomSeeding(context: 'file' | 'test', ...args: string[]): Promise<void> {
    const customScenarios = this.serviceConfig!.seed!.customScenarios || [];
    
    for (const scenario of customScenarios) {
      // Check if scenario should be executed
      if (scenario.condition) {
        const shouldExecute = scenario.condition({
          context,
          args,
          workerId: this.workerId,
          fileName: args[0],
          testName: args[1]
        });
        
        if (!shouldExecute) continue;
      }
      
      console.log(`🎯 Executing custom scenario: ${scenario.name}`);
      
      if (scenario.seedCommand) {
        await this.executeCommand(scenario.seedCommand);
      } else if (scenario.seedData) {
        await this.executeDataSeeding(scenario.seedData);
      }
      
      if (scenario.restoreAfter) {
        await this.createSnapshot();
      }
    }
  }

  private async executeTypeORMSeeding(seedConfig: SeedConfig): Promise<void> {
    if (!seedConfig.typeorm) return;
    
    // Create mock connection for seeding
    const mockConnection = {
      getRepository: (entityClass: any) => ({
        save: async (entity: any) => {
          console.log(`Saving ${entityClass.name}:`, entity);
          return entity;
        },
        create: (data: any) => data,
        clear: async () => {
          console.log(`Clearing ${entityClass.name}`);
        }
      }),
      runMigrations: async () => {
        console.log('Running migrations...');
      }
    };

    await TypeORMAdapter.runSeeding(mockConnection, seedConfig);
  }

  private async executeCommandSeeding(seedConfig: SeedConfig): Promise<void> {
    if (!seedConfig.command) return;
    
    console.log(`Running seed command: ${seedConfig.command}`);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(seedConfig.command, {
        timeout: seedConfig.timeout || 30000,
        cwd: this.serviceConfig!.workingDirectory || process.cwd(),
        env: {
          ...process.env,
          ...this.connectionStrings, // Add connection strings as environment variables
          WORKER_ID: this.workerId,
          NODE_ENV: 'test'
        }
      });
      
      if (stderr) {
        console.warn('Seed command stderr:', stderr);
      }
      
      console.log('Seed command completed successfully');
    } catch (error) {
      console.error('Seed command failed:', error);
      throw error;
    }
  }

  private async executeEntitySeeding(seedConfig: SeedConfig): Promise<void> {
    if (!seedConfig.entities) return;
    
    console.log('Seeding entities...');
    
    // Mock implementation - would use actual entity seeding
    for (const entity of seedConfig.entities) {
      console.log(`Seeding entity: ${entity.name || entity.constructor.name}`);
    }
  }

  private async executeDataSeeding(data: any[]): Promise<void> {
    console.log(`Seeding ${data.length} data items...`);
    
    // Mock implementation - would use actual data seeding
    for (const item of data) {
      console.log('Seeding data item:', item);
    }
  }

  private async executeCommand(command: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        cwd: this.serviceConfig!.workingDirectory || process.cwd(),
        env: {
          ...process.env,
          WORKER_ID: this.workerId,
          NODE_ENV: 'test'
        }
      });
      
      if (stderr) {
        console.warn('Command stderr:', stderr);
      }
      
      console.log('Command completed successfully');
    } catch (error) {
      console.error('Command failed:', error);
      throw error;
    }
  }

  private async createSnapshot(): Promise<void> {
    const snapshotId = `snapshot_${this.workerId}_${Date.now()}`;
    this.currentSnapshot = snapshotId;
    console.log(`📸 Created snapshot: ${snapshotId}`);
  }

  private async rollbackToSnapshot(): Promise<void> {
    if (this.currentSnapshot) {
      console.log(`🔄 Rolling back to snapshot: ${this.currentSnapshot}`);
      // Implementation would depend on database strategy
      this.currentSnapshot = null;
    }
  }

  private async resetDatabase(): Promise<void> {
    console.log('🔄 Resetting database...');
    // Implementation would depend on database strategy
  }

  private async restoreSnapshot(): Promise<void> {
    if (this.currentSnapshot) {
      console.log(`🔄 Restoring snapshot: ${this.currentSnapshot}`);
      // Implementation would depend on database strategy
    }
  }

  // Public methods for external access
  getSeedingStatus(): {
    hasSeededOnce: boolean;
    seededFiles: string[];
    seededTests: string[];
    currentSnapshot: string | null;
  } {
    return {
      hasSeededOnce: this.hasSeededOnce,
      seededFiles: Array.from(this.seededFiles),
      seededTests: Array.from(this.seededTests),
      currentSnapshot: this.currentSnapshot
    };
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up Seed Manager for worker ${this.workerId}`);
    
    this.hasSeededOnce = false;
    this.seededFiles.clear();
    this.seededTests.clear();
    this.currentSnapshot = null;
    
    console.log('Seed Manager cleanup completed');
  }
}
