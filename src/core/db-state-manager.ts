import { DBStateManager as IDBStateManager, ServiceConfig, DBStrategy, SeedConfig, PerformanceMetrics } from '../types';
import { TypeORMAdapter } from '../adapters/typeorm-adapter';

interface SavepointInfo {
  sql: string;
  createdAt: number;
  workerId: string;
}

export class DBStateManager implements IDBStateManager {
  private serviceConfig: ServiceConfig | undefined;
  private workerId: string;
  private savepoints: Map<string, SavepointInfo> = new Map();
  private schemas: Set<string> = new Set();
  private databases: Set<string> = new Set();
  private snapshots: Map<string, any> = new Map();
  private currentTransaction: string | null = null;
  private performanceMetrics: PerformanceMetrics[] = [];
  private connectionStrings: Record<string, string>;

  constructor(serviceConfig: ServiceConfig | undefined, workerId: string, connectionStrings: Record<string, string> = {}) {
    this.serviceConfig = serviceConfig;
    this.workerId = workerId;
    this.connectionStrings = connectionStrings;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing DB State Manager for worker ${this.workerId}`);
    
    // Run seed command if configured
    if (this.serviceConfig?.seed) {
      await this.runSeedCommand();
    }
    
    console.log(`DB State Manager initialized for worker ${this.workerId}`);
  }

  async createSavepoint(): Promise<string> {
    const startTime = Date.now();
    const savepointId = `sp_${this.workerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // For PostgreSQL/MySQL, this would execute: SAVEPOINT savepointId
      const sql = `SAVEPOINT ${savepointId}`;
      await this.executeQuery(sql);
      
      this.savepoints.set(savepointId, {
        sql,
        createdAt: Date.now(),
        workerId: this.workerId
      });
      
      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics('createSavepoint', duration, 'savepoint');
      
      console.log(`Created savepoint: ${savepointId} (${duration}ms)`);
      return savepointId;
    } catch (error) {
      console.error(`Failed to create savepoint ${savepointId}:`, error);
      throw new Error(`Savepoint creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async rollbackToSavepoint(savepointId: string): Promise<void> {
    const savepointInfo = this.savepoints.get(savepointId);
    if (!savepointInfo) {
      throw new Error(`Savepoint ${savepointId} not found`);
    }
    
    try {
      // For PostgreSQL/MySQL, this would execute: ROLLBACK TO SAVEPOINT savepointId
      const sql = `ROLLBACK TO SAVEPOINT ${savepointId}`;
      await this.executeQuery(sql);
      
      // Remove the savepoint after successful rollback
      this.savepoints.delete(savepointId);
      
      console.log(`Rolled back to savepoint: ${savepointId}`);
    } catch (error) {
      console.error(`Failed to rollback to savepoint ${savepointId}:`, error);
      throw new Error(`Savepoint rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createSchema(schemaName: string): Promise<void> {
    if (this.schemas.has(schemaName)) {
      await this.dropSchema(schemaName);
    }
    
    try {
      // Create schema
      const createSchemaSql = `CREATE SCHEMA IF NOT EXISTS ${schemaName}`;
      await this.executeQuery(createSchemaSql);
      
      // Set search path to include the new schema
      const setSearchPathSql = `SET search_path TO ${schemaName}, public`;
      await this.executeQuery(setSearchPathSql);
      
      // Copy table structures from public schema to new schema
      await this.copyTableStructures('public', schemaName);
      
      this.schemas.add(schemaName);
      console.log(`Created schema: ${schemaName}`);
    } catch (error) {
      console.error(`Failed to create schema ${schemaName}:`, error);
      throw new Error(`Schema creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async dropSchema(schemaName: string): Promise<void> {
    if (!this.schemas.has(schemaName)) {
      return;
    }
    
    const sql = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE`;
    await this.executeQuery(sql);
    
    this.schemas.delete(schemaName);
    console.log(`Dropped schema: ${schemaName}`);
  }

  async copySchema(fromSchema: string, toSchema: string): Promise<void> {
    try {
      console.log(`Copying schema from ${fromSchema} to ${toSchema}`);
      
      // First create the target schema
      await this.createSchema(toSchema);
      
      // Copy table structures
      await this.copyTableStructures(fromSchema, toSchema);
      
      // Copy data if needed (optional)
      // await this.copyTableData(fromSchema, toSchema);
      
      console.log(`Schema copied from ${fromSchema} to ${toSchema}`);
    } catch (error) {
      console.error(`Failed to copy schema from ${fromSchema} to ${toSchema}:`, error);
      throw new Error(`Schema copy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async copyTableStructures(fromSchema: string, toSchema: string): Promise<void> {
    try {
      // Get all tables from source schema
      const getTablesSql = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${fromSchema}' 
        AND table_type = 'BASE TABLE'
      `;
      
      const tables = await this.executeQuery(getTablesSql);
      
      // For each table, create it in the target schema
      for (const table of (tables as any)?.rows || []) {
        const tableName = table.table_name;
        const createTableSql = `
          CREATE TABLE ${toSchema}.${tableName} (LIKE ${fromSchema}.${tableName} INCLUDING ALL)
        `;
        await this.executeQuery(createTableSql);
        console.log(`Copied table structure: ${tableName}`);
      }
    } catch (error) {
      console.error(`Failed to copy table structures:`, error);
      throw error;
    }
  }

  async createDatabase(dbName: string): Promise<void> {
    if (this.databases.has(dbName)) {
      await this.dropDatabase(dbName);
    }
    
    try {
      const serviceType = this.serviceConfig?.type;
      
      if (serviceType === 'mongo') {
        // For MongoDB, create a new database
        await this.createMongoDatabase(dbName);
      } else {
        // For SQL databases
        const sql = `CREATE DATABASE ${dbName}`;
        await this.executeQuery(sql);
      }
      
      this.databases.add(dbName);
      console.log(`Created database: ${dbName}`);
    } catch (error) {
      console.error(`Failed to create database ${dbName}:`, error);
      throw new Error(`Database creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createMongoDatabase(dbName: string): Promise<void> {
    // For MongoDB, we need to connect and create the database
    // This would use MongoDB driver in real implementation
    console.log(`Creating MongoDB database: ${dbName}`);
    
    // Mock implementation - in real scenario would use MongoDB driver
    const createDbCommand = `
      use ${dbName};
      db.createCollection('_test_collection');
      db._test_collection.drop();
    `;
    
    await this.executeMongoCommand(createDbCommand);
  }

  private async executeMongoCommand(command: string): Promise<void> {
    // Mock implementation - would use MongoDB driver
    console.log(`Executing MongoDB command: ${command}`);
  }

  async beginTransaction(): Promise<void> {
    if (this.currentTransaction) {
      throw new Error('Transaction already in progress');
    }
    
    try {
      const transactionId = `tx_${this.workerId}_${Date.now()}`;
      const sql = 'BEGIN';
      await this.executeQuery(sql);
      
      this.currentTransaction = transactionId;
      console.log(`Started transaction: ${transactionId}`);
    } catch (error) {
      console.error('Failed to begin transaction:', error);
      throw new Error(`Transaction begin failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async commitTransaction(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('No transaction in progress');
    }
    
    try {
      const sql = 'COMMIT';
      await this.executeQuery(sql);
      
      console.log(`Committed transaction: ${this.currentTransaction}`);
      this.currentTransaction = null;
    } catch (error) {
      console.error('Failed to commit transaction:', error);
      throw new Error(`Transaction commit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('No transaction in progress');
    }
    
    try {
      const sql = 'ROLLBACK';
      await this.executeQuery(sql);
      
      console.log(`Rolled back transaction: ${this.currentTransaction}`);
      this.currentTransaction = null;
    } catch (error) {
      console.error('Failed to rollback transaction:', error);
      throw new Error(`Transaction rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async dropDatabase(dbName: string): Promise<void> {
    if (!this.databases.has(dbName)) {
      return;
    }
    
    // For MongoDB: db.dropDatabase()
    // For SQL: DROP DATABASE dbName
    const sql = `DROP DATABASE IF EXISTS ${dbName}`;
    await this.executeQuery(sql);
    
    this.databases.delete(dbName);
    console.log(`Dropped database: ${dbName}`);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up DB state for worker ${this.workerId}`);
    
    // Clean up schemas
    for (const schema of Array.from(this.schemas)) {
      await this.dropSchema(schema);
    }
    
    // Clean up databases
    for (const database of Array.from(this.databases)) {
      await this.dropDatabase(database);
    }
    
    // Clean up savepoints
    this.savepoints.clear();
    
    // Clean up snapshots
    this.snapshots.clear();
    
    console.log(`DB state cleanup completed for worker ${this.workerId}`);
  }

  async createSnapshot(name: string): Promise<void> {
    // This would create a snapshot of the current database state
    // Implementation would depend on the database type and snapshot technology
    const snapshot = {
      name,
      timestamp: Date.now(),
      workerId: this.workerId,
      // Would contain actual database state
    };
    
    this.snapshots.set(name, snapshot);
    console.log(`Created snapshot: ${name}`);
  }

  async restoreSnapshot(name: string): Promise<void> {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) {
      throw new Error(`Snapshot ${name} not found`);
    }
    
    // This would restore the database to the snapshot state
    console.log(`Restoring snapshot: ${name}`);
  }

  private async executeQuery(sql: string): Promise<void> {
    // This would execute the SQL query against the appropriate database
    // Implementation would depend on the database driver
    console.log(`Executing SQL: ${sql}`);
  }

  private recordPerformanceMetrics(operation: string, duration: number, strategy: string): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      workerId: this.workerId,
      strategy
    };
    
    this.performanceMetrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  getAverageOperationTime(operation: string): number {
    const operationMetrics = this.performanceMetrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / operationMetrics.length;
  }

  getStrategyPerformance(): Record<string, number> {
    const strategies = Array.from(new Set(this.performanceMetrics.map(m => m.strategy)));
    const performance: Record<string, number> = {};
    
    for (const strategy of strategies) {
      const strategyMetrics = this.performanceMetrics.filter(m => m.strategy === strategy);
      const avgDuration = strategyMetrics.reduce((sum, m) => sum + m.duration, 0) / strategyMetrics.length;
      performance[strategy] = avgDuration;
    }
    
    return performance;
  }

  private async runSeedCommand(): Promise<void> {
    if (!this.serviceConfig?.seed) {
      return;
    }
    
    // Check if we have command configuration
    if (this.serviceConfig.seed.command) {
      await this.runCommandSeeding();
    } else if (this.serviceConfig.seed.typeorm) {
      await this.runTypeORMSeeding();
    }
  }

  private async runTypeORMSeeding(): Promise<void> {
    console.log('Running TypeORM seeding...');
    
    try {
      // Create a mock connection for seeding
      // In real implementation, this would connect to the actual database
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

      await TypeORMAdapter.runSeeding(mockConnection, this.serviceConfig!.seed!);
      console.log('TypeORM seeding completed successfully');
    } catch (error) {
      console.error('TypeORM seeding failed:', error);
      throw error;
    }
  }

  private async runCommandSeeding(): Promise<void> {
    console.log(`Running seed command: ${this.serviceConfig!.seed!.command}`);
    
    // This would execute the seed command
    // Could be a shell command, SQL file, or application command
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(this.serviceConfig!.seed!.command!, {
        timeout: this.serviceConfig!.seed!.timeout || 30000,
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
}
