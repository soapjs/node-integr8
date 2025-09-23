import { 
  createConfig, 
  createPostgresService, 
  createMongoService, 
  createAppConfig, 
  createTypeORMEntitiesSeedConfig,
  createSeedConfig,
  createNestAdapter 
} from '@soapjs/integr8';

// Example entities (would be imported from your app)
// import { User, Product, Order } from './src/entities';

// Sample data for seeding
const sampleData = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Product A', price: 99.99, stock: 100 },
  { name: 'Product B', price: 149.99, stock: 50 }
];

// 1. SAVEPOINT STRATEGY - Fastest for development
export const savepointConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'savepoint',
  parallelIsolation: 'none', // Fast, but no parallel isolation
  seed: createSeedConfig('npm run seed'),
  adapters: [createNestAdapter({ typeorm: true })]
});

// 2. SCHEMA STRATEGY - Good balance for integration tests
export const schemaConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'schema',
  parallelIsolation: 'schema', // Good parallel isolation
  // seed: createTypeORMEntitiesSeedConfig(
  //   [User, Product, Order],
  //   sampleData,
  //   { clearBeforeSeed: true, runMigrations: false }
  // ),
  adapters: [createNestAdapter({ typeorm: true })]
});

// 3. DATABASE STRATEGY - Best for MongoDB and complete isolation
export const databaseConfig = createConfig({
  services: [
    createMongoService('mongo', {
      environment: {
        MONGO_INITDB_DATABASE: 'testdb'
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
    environment: {
      MONGODB_URI: 'mongodb://localhost:27017/testdb'
    }
  }),
  dbStrategy: 'database',
  parallelIsolation: 'db', // Complete isolation
  seed: createSeedConfig('npm run seed:mongo'),
  adapters: [createNestAdapter({ mongoose: true })]
});

// 4. SNAPSHOT STRATEGY - Universal but slower
export const snapshotConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      volumes: [
        { host: './data/postgres', container: '/var/lib/postgresql/data' }
      ]
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'snapshot',
  parallelIsolation: 'none', // Snapshots handle isolation
  seed: createSeedConfig('npm run seed'),
  adapters: [createNestAdapter({ typeorm: true })]
});

// 5. HYBRID SAVEPOINT-SCHEMA - Fast with good isolation
export const hybridSavepointSchemaConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'hybrid-savepoint-schema',
  parallelIsolation: 'schema',
  // seed: createTypeORMEntitiesSeedConfig(
  //   [User, Product, Order],
  //   sampleData,
  //   { clearBeforeSeed: true, runMigrations: false }
  // ),
  adapters: [createNestAdapter({ typeorm: true })]
});

// 6. HYBRID SCHEMA-DATABASE - Best isolation with structure reuse
export const hybridSchemaDatabaseConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'hybrid-schema-database',
  parallelIsolation: 'db',
  seed: createSeedConfig('npm run seed'),
  adapters: [createNestAdapter({ typeorm: true })]
});

// 7. TRANSACTIONAL SCHEMA - High performance with good isolation
export const transactionalSchemaConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'transactional-schema',
  parallelIsolation: 'schema',
  // seed: createTypeORMEntitiesSeedConfig(
  //   [User, Product, Order],
  //   sampleData,
  //   { clearBeforeSeed: true, runMigrations: false }
  // ),
  adapters: [createNestAdapter({ typeorm: true })]
});

// 8. MULTI-DATABASE SETUP - Different strategies for different databases
export const multiDatabaseConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'maindb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    createMongoService('mongo', {
      environment: {
        MONGO_INITDB_DATABASE: 'logdb'
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
    environment: {
      POSTGRES_URL: 'postgresql://testuser:testpass@postgres:5432/maindb',
      MONGODB_URI: 'mongodb://mongo:27017/logdb'
    }
  }),
  dbStrategy: 'hybrid-schema-database', // Best for complex setups
  parallelIsolation: 'db',
  seed: createSeedConfig('npm run seed:all'),
  adapters: [createNestAdapter({ typeorm: true, mongoose: true })]
});

// 9. PERFORMANCE-OPTIMIZED CONFIG - For CI/CD pipelines
export const performanceOptimizedConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
        // Performance optimizations
        POSTGRES_SHARED_BUFFERS: '256MB',
        POSTGRES_EFFECTIVE_CACHE_SIZE: '1GB',
        POSTGRES_MAINTENANCE_WORK_MEM: '64MB',
        POSTGRES_CHECKPOINT_COMPLETION_TARGET: '0.9',
        POSTGRES_WAL_BUFFERS: '16MB',
        POSTGRES_DEFAULT_STATISTICS_TARGET: '100'
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'savepoint', // Fastest for CI
  parallelIsolation: 'none',
  seed: createSeedConfig('npm run seed:minimal', 10000), // Fast seeding
  adapters: [createNestAdapter({ typeorm: true })],
  testMode: {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true
  }
});

// 10. DEVELOPMENT CONFIG - Best for local development
export const developmentConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'devdb',
        POSTGRES_USER: 'dev',
        POSTGRES_PASSWORD: 'dev',
      },
      volumes: [
        { host: './dev-data/postgres', container: '/var/lib/postgresql/data' }
      ]
    })
  ],
  app: createAppConfig({
    image: 'my-app:dev',
    command: 'npm run dev',
    healthcheck: '/health',
    port: 3000,
    volumes: [
      { host: './src', container: '/app/src' },
      { host: './package.json', container: '/app/package.json' }
    ]
  }),
  dbStrategy: 'schema', // Good balance for development
  parallelIsolation: 'schema',
  // seed: createTypeORMEntitiesSeedConfig(
  //   [User, Product, Order],
  //   sampleData,
  //   { clearBeforeSeed: true, runMigrations: true }
  // ),
  adapters: [createNestAdapter({ typeorm: true, testModule: true })],
  testMode: {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: false // Keep real timers in development
  }
});

// Usage examples:
// 
// For development:
// export default developmentConfig;
//
// For CI/CD:
// export default performanceOptimizedConfig;
//
// For integration tests:
// export default schemaConfig;
//
// For E2E tests:
// export default databaseConfig;
//
// For complex applications:
// export default hybridSavepointSchemaConfig;
