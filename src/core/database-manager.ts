import { IDatabaseManager, Transaction, ServiceConfig, DBStrategy } from '../types';
import { DBStateManager } from './db-state-manager';

export class DatabaseManager implements IDatabaseManager {
  private serviceConfig: ServiceConfig | undefined;
  private workerId: string;
  private stateManager: DBStateManager;
  private connectionString!: string;
  private currentSavepoint?: string;
  private currentSchema?: string;
  private currentDatabase?: string;

  constructor(serviceConfig: ServiceConfig | undefined, workerId: string) {
    this.serviceConfig = serviceConfig;
    this.workerId = workerId;
    this.stateManager = new DBStateManager(serviceConfig, workerId);
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
    const dbStrategy = this.serviceConfig?.dbStrategy || 'savepoint';
    switch (dbStrategy) {
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
    const dbStrategy = this.serviceConfig?.dbStrategy || 'savepoint';
    switch (dbStrategy) {
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
    if (!this.serviceConfig) {
      throw new Error('No database service configuration found');
    }

    const serviceType = this.serviceConfig.type;
    const port = this.serviceConfig.ports?.[0] || this.getDefaultPort(serviceType);

    switch (serviceType) {
      case 'postgres':
        return `postgresql://test:test@localhost:${port}/test`;
      case 'mysql':
        return `mysql://test:test@localhost:${port}/test`;
      case 'mongo':
        return `mongodb://localhost:${port}/test`;
      default:
        throw new Error(`Unsupported database type: ${serviceType}`);
    }
  }

  private getDefaultPort(serviceType: string): number {
    switch (serviceType) {
      case 'postgres':
        return 5432;
      case 'mysql':
        return 3306;
      case 'mongo':
        return 27017;
      default:
        return 5432;
    }
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
