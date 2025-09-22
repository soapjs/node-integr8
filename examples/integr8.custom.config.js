module.exports = {
  services: [
    {
      name: 'postgres',
      type: 'postgres',
      image: 'postgres:15-alpine',
      ports: [5432],
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      }
    },
    {
      name: 'kafka',
      type: 'kafka',
      image: 'confluentinc/cp-kafka:latest',
      ports: [9092],
      environment: {
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      }
    },
    {
      name: 'app',
      type: 'service',
      mode: 'local',
      command: 'npm run test:custom',
      ports: [3000],
      workingDirectory: '.',
      dependsOn: ['postgres', 'kafka']
    }
  ],
  testType: 'custom',
  testDirectory: 'integr8/custom',
  testFramework: 'jest'
};
