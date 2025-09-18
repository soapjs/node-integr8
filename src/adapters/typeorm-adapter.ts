import { Adapter, AdapterConfig, SeedConfig, TypeORMSeedConfig } from '../types';

export class TypeORMAdapter implements Adapter {
  public name = 'typeorm';
  private overrides: Map<string, any> = new Map();

  async initialize(config: AdapterConfig): Promise<void> {
    console.log('Initializing TypeORM adapter');
    
    // This would be integrated into the NestJS app
    // The adapter would add middleware to handle test overrides
  }

  async setupOverrides(overrideManager: any): Promise<void> {
    // Set up the override endpoint for TypeORM
    console.log('Setting up TypeORM overrides');
  }

  async teardown(): Promise<void> {
    console.log('Tearing down TypeORM adapter');
    this.overrides.clear();
  }

  // Static method to create middleware that can be added to existing NestJS apps
  static createTestModule() {
    return {
      imports: [],
      providers: [
        {
          provide: 'TEST_OVERRIDE_SERVICE',
          useValue: {
            override: (type: string, name: string, implementation: any) => {
              console.log(`TypeORM override: ${type}:${name}`);
            }
          }
        }
      ],
      exports: ['TEST_OVERRIDE_SERVICE']
    };
  }

  // Helper method to create seed data using TypeORM
  static async createSeedData(connection: any, entities: any[]) {
    try {
      console.log('Creating seed data with TypeORM...');
      
      for (const entity of entities) {
        const repository = connection.getRepository(entity.constructor);
        await repository.save(entity);
      }
      
      console.log('Seed data created successfully');
    } catch (error) {
      console.error('Failed to create seed data:', error);
      throw error;
    }
  }

  // Helper method to run seeding based on configuration
  static async runSeeding(connection: any, seedConfig: SeedConfig) {
    try {
      console.log('Running TypeORM seeding from configuration...');
      
      if (seedConfig.typeorm) {
        await this.runTypeORMSeeding(connection, seedConfig.typeorm);
      } else if (seedConfig.entities) {
        // Fallback for simple entities configuration
        await this.runSimpleSeeding(connection, seedConfig.entities);
      } else {
        throw new Error('No TypeORM seeding configuration found');
      }
      
      console.log('TypeORM seeding completed successfully');
    } catch (error) {
      console.error('Failed to run TypeORM seeding:', error);
      throw error;
    }
  }

  // Run TypeORM seeding with full configuration
  private static async runTypeORMSeeding(connection: any, config: TypeORMSeedConfig) {
    // Run migrations if requested
    if (config.runMigrations) {
      await this.runMigrations(connection);
    }

    // Clear data if requested
    if (config.clearBeforeSeed) {
      await this.clearAllData(connection, config.entities);
    }

    // Seed data if provided
    if (config.data && config.data.length > 0) {
      await this.seedDataFromConfig(connection, config.entities, config.data);
    }
  }

  // Run simple seeding with just entities
  private static async runSimpleSeeding(connection: any, entities: any[]) {
    // Clear existing data
    await this.clearAllData(connection, entities);
    
    // Note: User must provide data via typeorm.data or command
    console.log('Entities cleared. No sample data provided - user must provide data via typeorm.data or command.');
  }

  // Seed data from configuration
  private static async seedDataFromConfig(connection: any, entityClasses: any[], data: any[]) {
    for (const dataItem of data) {
      const entityClass = this.findEntityClass(entityClasses, dataItem);
      if (entityClass) {
        const repository = connection.getRepository(entityClass);
        const entity = repository.create(dataItem);
        await repository.save(entity);
        console.log(`Created ${entityClass.name}:`, dataItem);
      }
    }
  }

  // Find entity class by data structure
  private static findEntityClass(entityClasses: any[], data: any): any {
    // Simple heuristic: match by property names
    for (const entityClass of entityClasses) {
      const metadata = entityClass.prototype.constructor.metadata || {};
      const columns = Object.keys(metadata.columns || {});
      
      // Check if data has properties that match entity columns
      const dataKeys = Object.keys(data);
      const matchCount = dataKeys.filter(key => columns.includes(key)).length;
      
      if (matchCount > 0 && matchCount >= dataKeys.length * 0.5) {
        return entityClass;
      }
    }
    
    return null;
  }

  // Helper method to clear all data
  static async clearAllData(connection: any, entityTypes: any[]) {
    try {
      console.log('Clearing all data...');
      
      // Clear in reverse order to handle foreign key constraints
      for (let i = entityTypes.length - 1; i >= 0; i--) {
        const repository = connection.getRepository(entityTypes[i]);
        await repository.clear();
      }
      
      console.log('All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  // Helper method to run migrations
  static async runMigrations(connection: any) {
    try {
      console.log('Running TypeORM migrations...');
      await connection.runMigrations();
      console.log('Migrations completed');
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  // Helper method to revert migrations
  static async revertMigrations(connection: any) {
    try {
      console.log('Reverting TypeORM migrations...');
      await connection.undoLastMigration();
      console.log('Migrations reverted');
    } catch (error) {
      console.error('Failed to revert migrations:', error);
      throw error;
    }
  }
}
