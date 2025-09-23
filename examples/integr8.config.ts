import { 
  createConfig, 
  createPostgresService, 
  createAppService, 
  createSeedConfig, 
  createExpressAdapter,
  createTestModeConfig,
  createTestScenario
} from '../src/utils/config';

export default createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      },
      dbStrategy: 'savepoint',
      parallelIsolation: 'schema'
    }),
    createAppService('app', {
      image: 'sample-express-app:latest',
      command: 'npm start',
      healthcheck: {
        command: '/health',
        interval: 1000,
        timeout: 30000,
        retries: 3
      },
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
    createTestScenario('should return health status', 200),
    createTestScenario('should handle invalid requests', 400)
  ],
  adapters: [
    createExpressAdapter()
  ],
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true
  })
});
