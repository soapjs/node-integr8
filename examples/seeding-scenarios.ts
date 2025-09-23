import { 
  createConfig, 
  createPostgresService, 
  createAppConfig,
  createOnceSeedConfig,
  createPerFileSeedConfig,
  createPerTestSeedConfig,
  createCustomSeedConfig,
  createFlexibleSeedConfig,
  createTypeORMEntitiesSeedConfig
} from '@soapjs/integr8';

// Example entities (would be imported from your app)
// import { User, Product, Order } from './src/entities';

// Sample data for different scenarios
const basicData = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' }
];

const adminData = [
  { name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  { name: 'Super Admin', email: 'superadmin@example.com', role: 'superadmin' }
];

const productData = [
  { name: 'Product A', price: 99.99, stock: 100 },
  { name: 'Product B', price: 149.99, stock: 50 }
];

// 1. SEED RAZ PRZED WSZYSTKIMI TESTAMI
// ✅ Szybkie, ale testy mogą wpływać na siebie
export const onceSeedingConfig = createConfig({
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
  dbStrategy: 'savepoint', // Szybka strategia
  seed: createOnceSeedConfig('npm run seed:basic'),
  // Alternatywnie z TypeORM:
  // seed: createTypeORMEntitiesSeedConfig(
  //   [User, Product],
  //   basicData,
  //   { clearBeforeSeed: true, runMigrations: false }
  // )
});

// 2. SEED RAZ, PRZYWRÓĆ STAN PO KAŻDYM PLIKU
// ✅ Balans między szybkością a izolacją
export const perFileSeedingConfig = createConfig({
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
  dbStrategy: 'schema', // Dobra izolacja
  seed: createPerFileSeedConfig('npm run seed:basic'),
  // Alternatywnie z elastyczną konfiguracją:
  // seed: createFlexibleSeedConfig(
  //   'npm run seed:basic',
  //   'per-file',
  //   'rollback'
  // )
});

// 3. SEED PRZED KAŻDYM TESTEM
// ✅ Maksymalna izolacja, ale wolniejsze
export const perTestSeedingConfig = createConfig({
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
  dbStrategy: 'database', // Kompletna izolacja
  seed: createPerTestSeedingConfig('npm run seed:basic'),
  // Alternatywnie z elastyczną konfiguracją:
  // seed: createFlexibleSeedConfig(
  //   'npm run seed:basic',
  //   'per-test',
  //   'reset'
  // )
});

// 4. SPECJALNE SCENARIUSZE - CUSTOM SEEDING
// ✅ Maksymalna elastyczność
export const customSeedingConfig = createConfig({
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
  seed: createCustomSeedConfig([
    {
      name: 'basic-users',
      description: 'Seed basic users for all tests',
      condition: (context) => true, // Always execute
      seedData: basicData,
      restoreAfter: true
    },
    {
      name: 'admin-users',
      description: 'Seed admin users only for admin tests',
      condition: (context) => context.fileName?.includes('admin'),
      seedData: adminData,
      restoreAfter: true
    },
    {
      name: 'products',
      description: 'Seed products for product tests',
      condition: (context) => context.fileName?.includes('product'),
      seedCommand: 'npm run seed:products',
      restoreAfter: false
    },
    {
      name: 'e2e-data',
      description: 'Seed comprehensive data for E2E tests',
      condition: (context) => context.fileName?.includes('e2e'),
      seedCommand: 'npm run seed:e2e',
      restoreAfter: true
    }
  ])
});

// 5. RÓŻNE STRATEGIE DLA RÓŻNYCH TYPÓW TESTÓW
export const mixedSeedingConfig = createConfig({
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
  seed: createCustomSeedConfig([
    {
      name: 'unit-tests',
      description: 'Minimal data for unit tests',
      condition: (context) => context.fileName?.includes('unit'),
      seedData: basicData.slice(0, 1), // Only one user
      restoreAfter: false
    },
    {
      name: 'integration-tests',
      description: 'Standard data for integration tests',
      condition: (context) => context.fileName?.includes('integration'),
      seedData: basicData,
      restoreAfter: true
    },
    {
      name: 'e2e-tests',
      description: 'Full data for E2E tests',
      condition: (context) => context.fileName?.includes('e2e'),
      seedCommand: 'npm run seed:full',
      restoreAfter: true
    }
  ])
});

// 6. PERFORMANCE-OPTIMIZED SEEDING
export const performanceOptimizedSeedingConfig = createConfig({
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
  dbStrategy: 'savepoint', // Najszybsza strategia
  seed: createFlexibleSeedConfig(
    'npm run seed:minimal',
    'once', // Seed tylko raz
    'none' // Bez przywracania
  )
});

// 7. DEVELOPMENT SEEDING
export const developmentSeedingConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'devdb',
        POSTGRES_USER: 'dev',
        POSTGRES_PASSWORD: 'dev',
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:dev',
    command: 'npm run dev',
    healthcheck: '/health',
    port: 3000,
  }),
  dbStrategy: 'schema',
  seed: createFlexibleSeedConfig(
    'npm run seed:dev',
    'per-file', // Seed przed każdym plikiem
    'rollback' // Przywróć stan po pliku
  )
});

// 8. CI/CD SEEDING
export const cicdSeedingConfig = createConfig({
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
  seed: createFlexibleSeedConfig(
    'npm run seed:ci',
    'per-file', // Izolacja między plikami
    'rollback' // Szybkie przywracanie
  )
});

// 9. MONGODB SEEDING
export const mongoSeedingConfig = createConfig({
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
  dbStrategy: 'database', // MongoDB używa strategii database
  seed: createPerFileSeedConfig('npm run seed:mongo')
});

// 10. COMPLEX SCENARIOS
export const complexSeedingConfig = createConfig({
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
  seed: createCustomSeedConfig([
    {
      name: 'setup',
      description: 'Initial setup for all tests',
      condition: (context) => context.context === 'initialize',
      seedCommand: 'npm run seed:setup',
      restoreAfter: false
    },
    {
      name: 'auth-tests',
      description: 'Authentication test data',
      condition: (context) => context.fileName?.includes('auth'),
      seedData: [
        { name: 'Test User', email: 'test@example.com', password: 'password123' },
        { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' }
      ],
      restoreAfter: true
    },
    {
      name: 'api-tests',
      description: 'API test data',
      condition: (context) => context.fileName?.includes('api'),
      seedCommand: 'npm run seed:api',
      restoreAfter: true
    },
    {
      name: 'cleanup',
      description: 'Cleanup after tests',
      condition: (context) => context.context === 'cleanup',
      seedCommand: 'npm run seed:cleanup',
      restoreAfter: false
    }
  ])
});

// USAGE EXAMPLES:
//
// For development (fast feedback):
// export default developmentSeedingConfig;
//
// For CI/CD (balanced):
// export default cicdSeedingConfig;
//
// For E2E tests (maximum isolation):
// export default perTestSeedingConfig;
//
// For complex scenarios:
// export default complexSeedingConfig;
//
// For performance-critical tests:
// export default performanceOptimizedSeedingConfig;
