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
      },
      dbStrategy: 'schema',
      parallelIsolation: 'schema'
    }
  ],
  testType: 'unit-db',
  testDirectory: 'integr8/unit-db',
  testFramework: 'jest'
};
