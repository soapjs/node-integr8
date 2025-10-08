import { DatabaseConfig, SeedConfig, ServiceConfig } from '../types';

export class SeedManager {
  private databaseConfig: DatabaseConfig | undefined;
  private workerId: string;
  private hasSeededOnce: boolean = false;
  private currentSnapshot: string | null = null;
  private seededFiles: Set<string> = new Set();
  private seededTests: Set<string> = new Set();
  private connectionStrings: Record<string, string>;

  constructor(serviceConfig: DatabaseConfig | undefined, workerId: string, connectionStrings: Record<string, string> = {}) {
    this.databaseConfig = serviceConfig;
    this.workerId = workerId;
    this.connectionStrings = connectionStrings;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing Seed Manager for worker ${this.workerId}`);
    
    if (this.databaseConfig?.seed) {
      await this.executeSeedingStrategy('initialize');
    }
  }

  async seedForFile(fileName: string): Promise<void> {
    if (!this.databaseConfig?.seed) return;

    const strategy = this.databaseConfig.seed.strategy || 'per-file';
    
    switch (strategy) {
      case 'once':
        if (!this.hasSeededOnce) {
          console.log(`🌱 Executing 'once' strategy for file: ${fileName}`);
          await this.executeSeedingStrategy('file', fileName);
          this.hasSeededOnce = true;
        } else {
          console.log(` Skipping 'once' strategy for file: ${fileName} (already seeded)`);
        }
        break;
        
      case 'per-file':
        if (!this.seededFiles.has(fileName)) {
          console.log(`🌱 Executing 'per-file' strategy for file: ${fileName}`);
          await this.executeSeedingStrategy('file', fileName);
          this.seededFiles.add(fileName);
        } else {
          console.log(` Skipping 'per-file' strategy for file: ${fileName} (already seeded)`);
        }
        break;
        
      case 'per-test':
        console.log(` Skipping 'per-test' strategy for file: ${fileName} (handled in seedForTest)`);
        break;
    }
  }

  async seedForTest(testName: string, filePath: string): Promise<void> {
    if (!this.databaseConfig?.seed) return;

    const strategy = this.databaseConfig.seed.strategy || 'per-file';
    
    switch (strategy) {
      case 'once':
        console.log(` Skipping 'once' strategy for test: ${testName} (already handled at file level)`);
        break;
        
      case 'per-file':
        console.log(` Skipping 'per-file' strategy for test: ${testName} (already handled at file level)`);
        break;
        
      case 'per-test':
        const testKey = `${filePath}:${testName}`;
        if (!this.seededTests.has(testKey)) {
          console.log(`🌱 Executing 'per-test' strategy for test: ${testName} in file: ${filePath}`);
          await this.executeSeedingStrategy('test', testName, filePath);
          this.seededTests.add(testKey);
        } else {
          console.log(` Skipping 'per-test' strategy for test: ${testName} (already seeded)`);
        }
        break;
    }
  }

  async restoreAfterFile(fileName: string): Promise<void> {
    if (!this.databaseConfig?.seed) return;

    const restore = this.databaseConfig.seed.restore || 'rollback';
    
    switch (restore) {
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
    if (!this.databaseConfig?.seed) return;

    const strategy = this.databaseConfig.seed.strategy || 'per-file';
    const restore = this.databaseConfig.seed.restore || 'rollback';
    
    // Only restore after test if using per-test strategy
    if (strategy === 'per-test') {
      switch (restore) {
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
    const seedConfig = this.databaseConfig!.seed!;
    const startTime = Date.now();
    
    try {
      console.log(`🌱 Starting seeding for ${context}: ${args.join(', ')}`);
      console.log(`   Strategy: ${seedConfig.strategy || 'per-file'}`);
      console.log(`   Worker ID: ${this.workerId}`);
      
      if (seedConfig.command) {
        await this.executeCommandSeeding(seedConfig);
      }
      
      // Create snapshot for restoration
      if (context !== 'initialize') {
        await this.createSnapshot();
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Seeding completed for ${context}: ${args.join(', ')} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Seeding failed for ${context}: ${args.join(', ')} after ${duration}ms:`, error);
      throw error;
    }
  }

  private async executeCommandSeeding(seedConfig: SeedConfig): Promise<void> {
    if (!seedConfig.command) return;
    
    const startTime = Date.now();
    console.log(`🌱 Running seed command: ${seedConfig.command}`);
    console.log(`   Worker ID: ${this.workerId}`);
    console.log(`   Timeout: ${seedConfig.timeout || 30000}ms`);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(seedConfig.command, {
        timeout: seedConfig.timeout || 30000,
        cwd: this.databaseConfig!.local?.cwd || process.cwd(),
        env: {
          ...process.env,
          ...this.connectionStrings, // Add connection strings as environment variables
          WORKER_ID: this.workerId,
          NODE_ENV: 'test'
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (stderr) {
        console.warn('⚠️  Seed command stderr:', stderr);
      }
      
      if (stdout) {
        console.log('📝 Seed command output:', stdout);
      }
      
      console.log(`✅ Seed command completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Seed command failed after ${duration}ms:`, error);
      throw error;
    }
  }

  private async createSnapshot(): Promise<void> {
    const snapshotId = `snapshot_${this.workerId}_${Date.now()}`;
    this.currentSnapshot = snapshotId;
    console.log(`Created snapshot: ${snapshotId}`);
  }

  private async rollbackToSnapshot(): Promise<void> {
    if (this.currentSnapshot) {
      console.log(`Rolling back to snapshot: ${this.currentSnapshot}`);
      // Implementation would depend on database strategy
      this.currentSnapshot = null;
    }
  }

  private async resetDatabase(): Promise<void> {
    console.log('Resetting database...');
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
