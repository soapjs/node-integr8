import { 
  createConfig,
  createPostgresService,
  createAppService,
  createStandardDBMapping,
  createTypeORMMapping,
  createPrismaMapping,
  createSequelizeMapping,
  createMongooseMapping,
  createRedisMapping,
  createPostgresWithMapping,
  createAppWithDBMapping,
  createTestScenario,
  createTestModeConfig
} from '../src/utils/config';

/**
 * Environment Mapping Examples
 * 
 * This demonstrates how to map database connection information from containers
 * to environment variables that your application expects.
 */

// Example 1: Standard database mapping (most common)
export const standardMappingConfig = createConfig({
  services: [
    createPostgresWithMapping('postgres', createStandardDBMapping(), {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      }
    }),
    createAppWithDBMapping('app', 'postgres', createStandardDBMapping(), {
      image: 'my-app:latest',
      ports: [3000]
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});

// Example 2: TypeORM specific mapping
export const typeormMappingConfig = createConfig({
  services: [
    createPostgresWithMapping('postgres', createTypeORMMapping(), {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      }
    }),
    createAppWithDBMapping('app', 'postgres', createTypeORMMapping(), {
      image: 'nestjs-app:latest',
      ports: [3000]
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});

// Example 3: Prisma mapping (only needs DATABASE_URL)
export const prismaMappingConfig = createConfig({
  services: [
    createPostgresWithMapping('postgres', createPrismaMapping(), {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      }
    }),
    createAppWithDBMapping('app', 'postgres', createPrismaMapping(), {
      image: 'prisma-app:latest',
      ports: [3000]
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});

// Example 4: Sequelize mapping
export const sequelizeMappingConfig = createConfig({
  services: [
    createPostgresWithMapping('postgres', createSequelizeMapping(), {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      }
    }),
    createAppWithDBMapping('app', 'postgres', createSequelizeMapping(), {
      image: 'sequelize-app:latest',
      ports: [3000]
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});

// Example 5: Custom mapping for specific application needs
export const customMappingConfig = createConfig({
  services: [
    createPostgresWithMapping('postgres', {
      host: 'MY_DB_HOST',
      port: 'MY_DB_PORT',
      username: 'MY_DB_USER',
      password: 'MY_DB_PASS',
      database: 'MY_DB_NAME',
      url: 'MY_DATABASE_URL'
    }, {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      }
    }),
    createAppService('app', {
      image: 'custom-app:latest',
      ports: [3000],
      dependsOn: ['postgres'],
      envMapping: {
        host: 'MY_DB_HOST',
        port: 'MY_DB_PORT',
        username: 'MY_DB_USER',
        password: 'MY_DB_PASS',
        database: 'MY_DB_NAME',
        url: 'MY_DATABASE_URL'
      }
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});

// Example 6: Multiple databases with different mappings
export const multiDatabaseConfig = createConfig({
  services: [
    // PostgreSQL with TypeORM mapping
    createPostgresWithMapping('postgres', createTypeORMMapping(), {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      }
    }),
    
    // MongoDB with Mongoose mapping
    createPostgresWithMapping('mongodb', createMongooseMapping(), {
      type: 'mongo',
      environment: {
        MONGO_INITDB_ROOT_USERNAME: 'myuser',
        MONGO_INITDB_ROOT_PASSWORD: 'mypassword',
        MONGO_INITDB_DATABASE: 'myapp'
      }
    }),
    
    // Redis with custom mapping
    createPostgresWithMapping('redis', createRedisMapping(), {
      type: 'redis'
    }),
    
    // Application that uses all databases
    createAppService('app', {
      image: 'multi-db-app:latest',
      ports: [3000],
      dependsOn: ['postgres', 'mongodb', 'redis'],
      environment: {
        NODE_ENV: 'test',
        // These will be automatically set by Integr8 based on the database mappings
        // TYPEORM_HOST, TYPEORM_PORT, TYPEORM_USERNAME, etc.
        // MONGODB_URI
        // REDIS_HOST, REDIS_PORT, REDIS_URL
      }
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});

// Example 7: Real-world NestJS application with TypeORM
export const nestjsRealWorldConfig = createConfig({
  services: [
    createPostgresWithMapping('postgres', createTypeORMMapping(), {
      environment: {
        POSTGRES_DB: 'nestjs_test',
        POSTGRES_USER: 'nestjs_user',
        POSTGRES_PASSWORD: 'nestjs_pass'
      },
      dbStrategy: 'savepoint'
    }),
    
    createAppService('app', {
      image: 'nestjs-app:latest',
      ports: [3000],
      command: 'npm run start:test',
      dependsOn: ['postgres'],
      environment: {
        NODE_ENV: 'test',
        // These will be automatically set by Integr8:
        // TYPEORM_HOST=localhost (or container IP)
        // TYPEORM_PORT=5432 (mapped port)
        // TYPEORM_USERNAME=nestjs_user
        // TYPEORM_PASSWORD=nestjs_pass
        // TYPEORM_DATABASE=nestjs_test
        // TYPEORM_URL=postgresql://nestjs_user:nestjs_pass@host:port/nestjs_test
      }
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest',
  testScenarios: [
    createTestScenario('should connect to database', 200),
    createTestScenario('should create user', 201),
    createTestScenario('should return users list', 200)
  ],
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override'
  })
});

/**
 * How it works:
 * 
 * 1. When you define envMapping on a database service, Integr8 will automatically
 *    set the corresponding environment variables for application services.
 * 
 * 2. For example, with createTypeORMMapping():
 *    - TYPEORM_HOST = actual container host
 *    - TYPEORM_PORT = actual mapped port (e.g., 5432)
 *    - TYPEORM_USERNAME = POSTGRES_USER from container
 *    - TYPEORM_PASSWORD = POSTGRES_PASSWORD from container
 *    - TYPEORM_DATABASE = POSTGRES_DB from container
 *    - TYPEORM_URL = full connection string
 * 
 * 3. Your application can then use these environment variables:
 *    ```typescript
 *    TypeOrmModule.forRoot({
 *      type: 'postgres',
 *      host: process.env.TYPEORM_HOST,
 *      port: parseInt(process.env.TYPEORM_PORT),
 *      username: process.env.TYPEORM_USERNAME,
 *      password: process.env.TYPEORM_PASSWORD,
 *      database: process.env.TYPEORM_DATABASE,
 *      // or simply: url: process.env.TYPEORM_URL
 *    })
 *    ```
 * 
 * 4. The mapping is automatic - Integr8 handles the complexity of getting
 *    the actual container IPs, ports, and credentials, and maps them to
 *    the environment variable names your application expects.
 */
