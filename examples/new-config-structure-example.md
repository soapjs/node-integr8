# New Configuration Structure Example

This example shows the new unified configuration structure where everything is defined in the `services` array.

## Basic Configuration

```typescript
import { createConfig, createAppService, createPostgresService, createRedisService } from '@soapjs/integr8';

export default createConfig({
  services: [
    createAppService('app', {
      image: 'my-app:latest',
      ports: [3000],
      healthcheck: '/health',
      dependsOn: ['postgres', 'redis'],
      containerName: 'my-app'
    }),
    createPostgresService('postgres', {
      dbStrategy: 'schema',
      parallelIsolation: 'schema',
      containerName: 'my-app-db',
      seed: {
        script: 'npm run seed:postgres'  // TypeORM seeding
      }
    }),
    createRedisService('redis', {
      containerName: 'my-app-cache',
      seed: {
        data: 'seed/redis/initial-data.json'  // JSON file
      }
    })
  ]
});
```

## Advanced Configuration with Multiple Apps

```typescript
import { createConfig, createAppService, createPostgresService, createMongoService } from '@soapjs/integr8';

export default createConfig({
  services: [
    // API Service
    createAppService('api', {
      image: 'my-api:v1.2.3',
      ports: [3000],
      healthcheck: '/api/health',
      dependsOn: ['postgres', 'mongo'],
      containerName: 'my-api'
    }),
    
    // Web Service
    createAppService('web', {
      image: 'my-web:latest',
      ports: [3001],
      healthcheck: '/health',
      dependsOn: ['api', 'postgres'],
      containerName: 'my-web'
    }),
    
    // Worker Service
    createAppService('worker', {
      image: 'my-worker:latest',
      command: 'npm run worker',
      dependsOn: ['postgres', 'mongo'],
      containerName: 'my-worker'
    }),
    
    // Database Services
    createPostgresService('postgres', {
      dbStrategy: 'schema',
      parallelIsolation: 'schema',
      containerName: 'my-postgres',
      seed: {
        data: 'seed/postgres/schema.sql'  // SQL file
      }
    }),
    
    createMongoService('mongo', {
      dbStrategy: 'database',
      parallelIsolation: 'db',
      containerName: 'my-mongo',
      seed: {
        script: 'mongosh /seed/mongo/init.js'  // MongoDB script
      }
    })
  ]
});
```

## Database Strategies Examples

```typescript
export default createConfig({
  services: [
    // Fast tests with savepoint strategy
    createPostgresService('postgres-fast', {
      dbStrategy: 'savepoint',
      containerName: 'fast-postgres'
    }),
    
    // Isolated tests with schema strategy
    createPostgresService('postgres-isolated', {
      dbStrategy: 'schema',
      parallelIsolation: 'schema',
      containerName: 'isolated-postgres'
    }),
    
    // Complex tests with database strategy
    createPostgresService('postgres-complex', {
      dbStrategy: 'database',
      parallelIsolation: 'db',
      containerName: 'complex-postgres'
    })
  ]
});
```

## Seeding Examples

```typescript
export default createConfig({
  services: [
    // SQL file seeding
    createPostgresService('postgres', {
      seed: {
        data: 'seed/postgres/init.sql'
      }
    }),
    
    // JSON file seeding
    createMongoService('mongo', {
      seed: {
        data: 'seed/mongo/users.json'
      }
    }),
    
    // Script-based seeding
    createPostgresService('postgres', {
      seed: {
        script: 'npm run seed:postgres'  // TypeORM
      }
    }),
    
    // Database command seeding
    createPostgresService('postgres', {
      seed: {
        script: 'psql -U test -d test -f /seed/seed.sql'
      }
    })
  ]
});
```

## Migration from Old Structure

### Old Structure:
```typescript
export default createConfig({
  services: [
    createPostgresService('postgres')
  ],
  app: {
    image: 'my-app:latest',
    port: 3000,
    healthcheck: '/health'
  },
  dbStrategy: 'schema'
});
```

### New Structure:
```typescript
export default createConfig({
  services: [
    createAppService('app', {
      image: 'my-app:latest',
      ports: [3000],
      healthcheck: '/health',
      dependsOn: ['postgres']
    }),
    createPostgresService('postgres', {
      dbStrategy: 'schema'
    })
  ]
});
```

## Benefits

1. **Unified Structure** - Everything in one place
2. **Better Dependencies** - Clear `dependsOn` relationships
3. **Flexible Seeding** - Multiple seeding options per service
4. **Database Strategies** - Per-service database configuration
5. **Container Naming** - Predictable container names
6. **Backward Compatibility** - Old config still works
