import { IDatabaseManager, ITransaction, DBStrategy, DatabaseConfig } from '../types';
import { DBStateManager } from './db-state-manager';
import { DatabaseTransaction } from './database-transaction';
import { createServiceLogger } from '../utils/logger';

export class DatabaseManager implements IDatabaseManager {
  private config: DatabaseConfig | undefined;
  private workerId: string;
  private stateManager: DBStateManager;
  private connectionString!: string;
  private currentSavepoint?: string;
  private currentSchema?: string;
  private currentDatabase?: string;
  private logger: any;

  constructor(
    config: DatabaseConfig | undefined, 
    workerId: string, 
    connectionStrings: Record<string, string> = {},
    strategy: DBStrategy = 'savepoint'
  ) {
    this.config = config;
    this.workerId = workerId;
    this.stateManager = new DBStateManager(config as any, workerId, connectionStrings);
    
    // Create logger for this service
    if (config) {
      this.logger = createServiceLogger(config, `database-manager-${workerId}`);
    } else {
      // Fallback logger when no service config
      this.logger = {
        debug: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        error: () => {}
      };
    }
  }

  async initialize(): Promise<void> {
    await this.stateManager.initialize();
    this.connectionString = this.getConnectionString();
  }

  async query(sql: string, params?: any[]): Promise<any> {
    // This would be implemented based on the database type
    // For now, return a mock implementation
    this.logger.debug(`Executing query: ${sql}`, params);
    return { rows: [], rowCount: 0 };
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    const tx = new DatabaseTransaction(this.connectionString);
    
    try {
      await tx.begin();
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  async snapshot(name: string): Promise<void> {
    const strategy = this.config?.strategy || 'savepoint';
    switch (strategy) {
      case 'savepoint':
        this.currentSavepoint = await this.stateManager.createSavepoint();
        break;
      case 'schema':
        const schemaName = `${name}_${this.workerId}`;
        await this.stateManager.createSchema(schemaName);
        this.currentSchema = schemaName;
        break;
      case 'database':
        const dbName = `${name}_${this.workerId}`;
        await this.stateManager.createDatabase(dbName);
        this.currentDatabase = dbName;
        break;
      case 'snapshot':
        await this.stateManager.createSnapshot(name);
        break;
      default:
        break;
    }
  }

  async restore(name: string): Promise<void> {
    const strategy = this.config?.strategy || 'savepoint';
    switch (strategy) {
      case 'savepoint':
        if (this.currentSavepoint) {
          await this.stateManager.rollbackToSavepoint(this.currentSavepoint);
        }
        break;
      case 'schema':
        if (this.currentSchema) {
          await this.stateManager.dropSchema(this.currentSchema);
          this.currentSchema = undefined;
        }
        break;
      case 'database':
        if (this.currentDatabase) {
          await this.stateManager.dropDatabase(this.currentDatabase);
          this.currentDatabase = undefined;
        }
        break;
      case 'snapshot':
        await this.stateManager.restoreSnapshot(name);
        break;
      default:
        break;
    }
  }

  async reset(): Promise<void> {
    await this.stateManager.cleanup();
  }

  getConnectionString(): string {
    if (!this.config) {
      throw new Error('No database service configuration found');
    }

    const serviceType = this.config.category;
    const port = this.getDefaultPort(serviceType);

    switch (serviceType) {
      case 'database':
        // For database type, we need to determine the actual database type
        // This is a simplified approach - in real implementation you'd have more specific config
        return `postgresql://test:test@localhost:${port}/test`;
      default:
        throw new Error(`Unsupported database type: ${serviceType}`);
    }
  }

  private getDefaultPort(serviceType: string): number {
    switch (serviceType) {
      case 'database':
        return 5432; // Default to PostgreSQL port
      default:
        return 5432;
    }
  }
}
