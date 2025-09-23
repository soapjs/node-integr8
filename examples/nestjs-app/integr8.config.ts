import { 
  createConfig, 
  createPostgresService, 
  createAppService, 
  createSeedConfig, 
  createNestAdapter,
  createTypeORMAdapter,
  createTestModeConfig,
  createTestScenario,
  createHealthCheckConfig
} from '../../src/utils/config';

export default createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      },
      dbStrategy: 'savepoint',
      parallelIsolation: 'schema',
      adapter: createTypeORMAdapter({
        synchronize: false,
        logging: false,
        entities: ['./src/**/*.entity.ts']
      })
    }),
    createAppService('app', {
      image: 'sample-nestjs-app:latest',
      command: 'npm start',
      healthcheck: createHealthCheckConfig('/health', {
        interval: 1000,
        timeout: 30000,
        retries: 3
      }),
      ports: [3000],
      environment: {
        NODE_ENV: 'test',
        PORT: '3000',
      },
      dependsOn: ['postgres']
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest',
  testScenarios: [
    createTestScenario('should return 200 for health check', 200),
    createTestScenario('should handle NestJS endpoints', 200)
  ],
  adapters: [
    createNestAdapter({
      typeorm: true,
      testModule: true
    }),
    createTypeORMAdapter()
  ],
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true
  })
});
