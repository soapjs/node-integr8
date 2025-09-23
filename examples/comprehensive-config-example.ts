import { 
  createConfig,
  createPostgresService,
  createMongoService,
  createRedisService,
  createMailhogService,
  createAppService,
  createTypeORMAdapter,
  createPrismaAdapter,
  createExpressAdapter,
  createNestAdapter,
  createFastifyAdapter,
  createTestScenario,
  createTestModeConfig,
  createSeedScenario,
  createCustomSeedConfig,
  createVolumeConfig,
  createHealthCheckConfig,
  createCITimeoutConfig,
  createPostgresWithAdapter,
  createAppWithAdapter
} from '../src/utils/config';

/**
 * Comprehensive configuration example showcasing all helper functions
 * This demonstrates the full power of Integr8's configuration system
 */
export default createConfig({
  // Services with full configuration
  services: [
    // PostgreSQL with TypeORM adapter
    createPostgresWithAdapter('postgres', createTypeORMAdapter({
      synchronize: false,
      logging: false,
      entities: ['./src/**/*.entity.ts']
    }), {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      },
      dbStrategy: 'savepoint',
      parallelIsolation: 'schema',
      volumes: [
        createVolumeConfig('./data/postgres', '/var/lib/postgresql/data', 'rw')
      ],
      healthcheck: createHealthCheckConfig('pg_isready -U testuser -d testdb', {
        interval: 1000,
        timeout: 30000,
        retries: 3,
        startPeriod: 5000
      }),
      seed: createCustomSeedConfig([
        createSeedScenario('users', {
          description: 'Create basic user data',
          seedData: [
            { name: 'John Doe', email: 'john@example.com', role: 'user' },
            { name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
          ],
          restoreAfter: true
        }),
        createSeedScenario('products', {
          description: 'Create product catalog',
          condition: (context) => context.testType === 'e2e',
          seedCommand: 'npm run seed:products'
        })
      ])
    }),

    // MongoDB with Prisma adapter
    createMongoService('mongodb', {
      environment: {
        MONGO_INITDB_ROOT_USERNAME: 'test',
        MONGO_INITDB_ROOT_PASSWORD: 'test',
        MONGO_INITDB_DATABASE: 'testdb'
      },
      dbStrategy: 'database',
      adapter: createPrismaAdapter({
        logLevel: 'error',
        datasourceUrl: 'mongodb://test:test@localhost:27017/testdb'
      }),
      healthcheck: createHealthCheckConfig('mongosh --eval "db.adminCommand(\'ping\')"', {
        interval: 2000,
        timeout: 30000,
        retries: 5
      })
    }),

    // Redis for caching
    createRedisService('redis', {
      volumes: [
        createVolumeConfig('./data/redis', '/data', 'rw')
      ],
      healthcheck: createHealthCheckConfig('redis-cli ping', {
        interval: 1000,
        timeout: 30000,
        retries: 3
      })
    }),

    // MailHog for email testing
    createMailhogService('mailhog', {
      healthcheck: createHealthCheckConfig('curl -f http://localhost:8025/api/v2/messages', {
        interval: 2000,
        timeout: 30000,
        retries: 3
      })
    }),

    // Main application with Express adapter
    createAppWithAdapter('app', createExpressAdapter(), {
      image: 'my-app:latest',
      command: 'npm start',
      ports: [3000],
      environment: {
        NODE_ENV: 'test',
        PORT: '3000',
        DATABASE_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
        REDIS_URL: 'redis://localhost:6379',
        SMTP_HOST: 'mailhog',
        SMTP_PORT: '1025'
      },
      volumes: [
        createVolumeConfig('./src', '/app/src', 'ro'),
        createVolumeConfig('./logs', '/app/logs', 'rw')
      ],
      healthcheck: createHealthCheckConfig('curl -f http://localhost:3000/health', {
        interval: 1000,
        timeout: 30000,
        retries: 3,
        startPeriod: 10000
      }),
      dependsOn: ['postgres', 'mongodb', 'redis', 'mailhog']
    })
  ],

  // Test configuration
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest',
  
  // Test scenarios
  testScenarios: [
    createTestScenario('should return 200 for health check', 200),
    createTestScenario('should create user successfully', 201, {
      requestData: { name: 'Test User', email: 'test@example.com' },
      expectedResponse: { id: expect.any(String), name: 'Test User' }
    }),
    createTestScenario('should return 400 for invalid email', 400, {
      requestData: { name: 'Test User', email: 'invalid-email' }
    }),
    createTestScenario('should return 404 for non-existent user', 404, {
      pathParams: { id: 'non-existent-id' }
    }),
    createTestScenario('should list users with pagination', 200, {
      queryParams: { page: 1, limit: 10 }
    })
  ],

  // Timeout configuration using preset
  ...createCITimeoutConfig(),

  // Test mode configuration
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true
  }),

  // Adapters
  adapters: [
    createTypeORMAdapter({
      synchronize: false,
      logging: false
    }),
    createPrismaAdapter({
      logLevel: 'error'
    }),
    createExpressAdapter(),
    createNestAdapter({
      typeorm: true,
      testModule: true
    }),
    createFastifyAdapter({
      logger: false
    })
  ],

  // URL prefix for API tests
  urlPrefix: '/api/v1'
});

/**
 * Alternative configuration for E2E tests with different timeouts
 */
export const e2eConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      dbStrategy: 'schema', // Better isolation for E2E
      parallelIsolation: 'schema'
    }),
    createAppService('app', {
      image: 'my-app:latest',
      dependsOn: ['postgres']
    })
  ],
  testType: 'e2e',
  testDirectory: './tests/e2e',
  testFramework: 'jest',
  testTimeout: 120000,    // 2 minutes for E2E tests
  setupTimeout: 30000,    // 30 seconds for setup
  teardownTimeout: 15000, // 15 seconds for teardown
  testMode: createTestModeConfig({
    enableFakeTimers: false // E2E tests might need real timers
  })
});

/**
 * Unit test configuration with database mocking
 */
export const unitConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      dbStrategy: 'savepoint' // Fastest for unit tests
    })
  ],
  testType: 'unit-db',
  testDirectory: './tests/unit',
  testFramework: 'jest',
  testTimeout: 15000,     // Shorter timeouts for unit tests
  setupTimeout: 5000,
  teardownTimeout: 2000,
  testMode: createTestModeConfig({
    enableFakeTimers: true // Mock timers for unit tests
  })
});
