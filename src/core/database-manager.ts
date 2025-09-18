import { DatabaseManager as IDatabaseManager, Transaction, Integr8Config, DBStrategy } from '../types';
import { DBStateManager } from './db-state-manager';

export class DatabaseManager implements IDatabaseManager {
  private config: Integr8Config;
  private workerId: string;
  private stateManager: DBStateManager;
  private connectionString!: string;
  private currentSavepoint?: string;
  private currentSchema?: string;
  private currentDatabase?: string;

  constructor(config: Integr8Config, workerId: string) {
    this.config = config;
    this.workerId = workerId;
    this.stateManager = new DBStateManager(config, workerId);
  }

  async initialize(): Promise<void> {
    await this.stateManager.initialize();
    this.connectionString = this.getConnectionString();
  }

  async query(sql: string, params?: any[]): Promise<any> {
    // This would be implemented based on the database type
    // For now, return a mock implementation
    console.log(`Executing query: ${sql}`, params);
    return { rows: [], rowCount: 0 };
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
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
    switch (this.config.dbStrategy) {
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
    }
  }

  async restore(name: string): Promise<void> {
    switch (this.config.dbStrategy) {
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
    }
  }

  async reset(): Promise<void> {
    await this.stateManager.cleanup();
  }

  getConnectionString(): string {
    const postgresService = this.config.services.find(s => s.type === 'postgres');
    const mysqlService = this.config.services.find(s => s.type === 'mysql');
    const mongoService = this.config.services.find(s => s.type === 'mongo');

    if (postgresService) {
      return `postgresql://test:test@localhost:5432/test`;
    } else if (mysqlService) {
      return `mysql://test:test@localhost:3306/test`;
    } else if (mongoService) {
      return `mongodb://test:test@localhost:27017/test`;
    }

    throw new Error('No supported database service found');
  }
}

class DatabaseTransaction implements Transaction {
  private connectionString: string;
  private isActive: boolean = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async begin(): Promise<void> {
    // Implementation would depend on the database driver
    this.isActive = true;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.isActive) {
      throw new Error('Transaction not active');
    }
    // Implementation would depend on the database driver
    return { rows: [], rowCount: 0 };
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction not active');
    }
    // Implementation would depend on the database driver
    this.isActive = false;
  }

  async rollback(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction not active');
    }
    // Implementation would depend on the database driver
    this.isActive = false;
  }
}
