const { 
  createConfig, 
  createPostgresService, 
  createAppService,
  createTestModeConfig,
  createHealthCheckConfig
} = require('../src/utils/config');

module.exports = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      },
      dbStrategy: 'schema'
    }),
    {
      name: 'kafka',
      type: 'kafka',
      mode: 'container',
      image: 'confluentinc/cp-kafka:latest',
      ports: [9092],
      environment: {
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      },
      healthcheck: createHealthCheckConfig('kafka-topics --bootstrap-server localhost:9092 --list', {
        interval: 5000,
        timeout: 30000,
        retries: 5
      })
    },
    createAppService('app', {
      mode: 'local',
      command: 'npm run test:custom',
      ports: [3000],
      workingDirectory: '.',
      dependsOn: ['postgres', 'kafka']
    })
  ],
  testType: 'custom',
  testDirectory: 'integr8/custom',
  testFramework: 'jest',
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: false // Custom tests might need real timers
  })
});
