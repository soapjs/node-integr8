import { createConfig, createPostgresService, createAppConfig, createSeedConfig, createExpressAdapter } from '@soapjs/integr8';

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
    image: 'sample-express-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
    environment: {
      NODE_ENV: 'test',
      PORT: '3000',
    }
  }),
  seed: createSeedConfig('npm run seed'),
  dbStrategy: 'savepoint',
  parallelIsolation: 'schema',
  adapters: [
    createExpressAdapter(),
  ],
  testMode: {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true,
  }
});
