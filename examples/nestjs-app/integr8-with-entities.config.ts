import { createConfig, createPostgresService, createAppConfig, createTypeORMEntitiesSeedConfig, createNestAdapter } from '@soapjs/integr8';
import { User } from './src/users/user.entity';

// Sample data for seeding
const sampleData = [
  // User data
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Bob Johnson', email: 'bob@example.com' },
  { name: 'Alice Brown', email: 'alice@example.com' },
  { name: 'Charlie Wilson', email: 'charlie@example.com' }
];

export default createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
  ],
  app: createAppConfig({
    image: 'sample-nestjs-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
    environment: {
      NODE_ENV: 'test',
      PORT: '3000',
    }
  }),
  // Use TypeORM entities for seeding
  seed: createTypeORMEntitiesSeedConfig(
    [User], // Entities with decorators
    sampleData, // Sample data
    {
      clearBeforeSeed: true, // Clear existing data before seeding
      runMigrations: false, // Don't run migrations (using synchronize in test)
      timeout: 30000
    }
  ),
  dbStrategy: 'savepoint',
  parallelIsolation: 'schema',
  adapters: [
    createNestAdapter({
      typeorm: true,
      testModule: true
    }),
  ],
  testMode: {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true,
  }
});
