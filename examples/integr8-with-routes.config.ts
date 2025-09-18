import { createConfig } from '@soapjs/integr8';

export default createConfig({
  services: [
    {
      name: 'postgres',
      type: 'postgres',
      ports: [5432],
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      }
    }
  ],
  app: {
    image: 'node:18-alpine',
    context: '.',
    command: 'npm start',
    healthcheck: 'curl -f http://localhost:3000/health || exit 1',
    port: 3000,
    environment: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://testuser:testpass@postgres:5432/testdb'
    },
    dependsOn: ['postgres']
  },
  dbStrategy: 'savepoint',
  seed: {
    command: 'npm run seed',
    timeout: 30000
  },
  // Route discovery configuration
  routes: {
    command: 'npx soap list-routes',
    outputFormat: 'json',
    timeout: 30000,
    workingDirectory: process.cwd(),
    environment: {
      NODE_ENV: 'test'
    }
  }
});
