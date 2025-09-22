# Container Naming Example

This example shows how to configure custom container names in integr8 to avoid searching for containers by type.

## Basic Configuration

```typescript
import { createConfig, createPostgresService, createRedisService, createAppConfig } from '@soapjs/integr8';

export default createConfig({
  services: [
    createPostgresService('db', {
      containerName: 'my-app-postgres'  // Custom container name
    }),
    createRedisService('cache', {
      containerName: 'my-app-redis'     // Custom container name
    })
  ],
  app: createAppConfig({
    containerName: 'my-app',            // Custom app container name
    image: 'my-app:latest',
    command: 'npm start',
    port: 3000,
    healthcheck: '/health'
  })
});
```

## Advanced Configuration

```typescript
import { createConfig, createMysqlService, createMongoService, createMailhogService } from '@soapjs/integr8';

export default createConfig({
  services: [
    createMysqlService('primary-db', {
      containerName: 'app-primary-mysql',
      environment: {
        MYSQL_DATABASE: 'primary_db'
      }
    }),
    createMongoService('analytics-db', {
      containerName: 'app-analytics-mongo',
      environment: {
        MONGO_INITDB_DATABASE: 'analytics'
      }
    }),
    createMailhogService('email-service', {
      containerName: 'app-email-mailhog'
    })
  ],
  app: {
    containerName: 'my-awesome-app',
    image: 'my-awesome-app:latest',
    command: 'npm start',
    port: 3000,
    healthcheck: '/health'
  }
});
```

## Benefits

1. **Predictable Names**: No more guessing container names like `app-1`, `api-2`, etc.
2. **Easy Debugging**: You can easily find your containers with `docker ps`
3. **Better Logs**: Container names in logs are meaningful
4. **No Type Searching**: No need to search for containers by type (api, web, etc.)

## Default Names

If you don't specify `containerName`, integr8 will use these defaults:
- App container: `app`
- Database services: `{name}-db` (e.g., `postgres-db`, `mysql-db`)
- Cache services: `{name}-cache` (e.g., `redis-cache`)
- Mail services: `{name}-mail` (e.g., `mailhog-mail`)
