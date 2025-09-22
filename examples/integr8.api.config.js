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
      name: 'app',
      type: 'service',
      mode: 'container',
      image: 'my-app:latest',
      ports: [3000],
      command: 'npm start',
      healthcheck: {
        command: '/health'
      },
      containerName: 'app',
      dependsOn: ['postgres']
    }
  ],
  testType: 'api',
  testDirectory: 'integr8/api',
  testFramework: 'jest'
};
