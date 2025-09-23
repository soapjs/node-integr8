const { 
  createConfig, 
  createPostgresService, 
  createAppService,
  createExpressAdapter,
  createHealthCheckConfig,
  createTestScenario,
  createTestModeConfig
} = require('../src/utils/config');

module.exports = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      },
      dbStrategy: 'savepoint'
    }),
    createAppService('app', {
      image: 'my-app:latest',
      ports: [3000],
      command: 'npm start',
      healthcheck: createHealthCheckConfig('/health', {
        interval: 1000,
        timeout: 30000,
        retries: 3
      }),
      containerName: 'app',
      dependsOn: ['postgres'],
      adapter: createExpressAdapter()
    })
  ],
  testType: 'api',
  testDirectory: 'integr8/api',
  testFramework: 'jest',
  testScenarios: [
    createTestScenario('should return 200 for health check', 200),
    createTestScenario('should return 404 for unknown endpoint', 404)
  ],
  adapters: [createExpressAdapter()],
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override'
  })
});
