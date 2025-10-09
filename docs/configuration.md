# Configuration Guide

Integr8 uses a configuration file to define your test environment. This guide covers all configuration options.

## Configuration File

Create a configuration file: `integr8.api.config.js` or `integr8.api.config.json`

```bash
npx integr8 init --interactive
```

## Basic Structure

```javascript
module.exports = {
  testType: "api",           // Test type: 'api', 'e2e', 'integration', 'custom'
  testDir: "integr8/tests",  // Test directory
  testFramework: "jest",     // Test framework (jest or vitest)
  
  services: [...],           // Application services
  databases: [...],          // Database services
  storages: [...],           // Storage services (S3, MinIO)
  messaging: [...]           // Message queues (RabbitMQ, Kafka)
};
```

## Services Configuration

### HTTP Service (Local Mode)

```javascript
services: [
  {
    name: "app",
    category: "service",
    type: "http",
    mode: "local",           // Run as local process
    communicationType: "http",
    
    http: {
      baseUrl: "http://localhost",
      port: 3000,
      prefix: "/api"
    },
    
    framework: "nestjs",     // Framework adapter
    
    readiness: {
      enabled: true,
      endpoint: "/health",   // Health check endpoint
      timeout: 30000,
      interval: 1000
    },
    
    local: {
      command: "npm start",  // Startup command
      cwd: ".",
      env: {                 // Environment variables
        NODE_ENV: "test",
        PORT: "3000"
      }
    }
  }
]
```

### HTTP Service (Container Mode)

```javascript
services: [
  {
    name: "app",
    category: "service",
    type: "http",
    mode: "container",       // Run in Docker container
    
    http: {
      baseUrl: "http://localhost",
      port: 3000
    },
    
    container: {
      image: "my-app:latest",
      containerName: "test-app",
      ports: [
        { host: 3000, container: 3000 }
      ],
      environment: {
        NODE_ENV: "test",
        DATABASE_URL: "${DATABASE_URL}"  // Use env mapping
      }
    }
  }
]
```

## Database Configuration

### PostgreSQL

```javascript
databases: [
  {
    name: "postgres",
    category: "database",
    type: "postgres",
    mode: "container",
    
    isolation: "savepoint",  // Isolation strategy
    
    seeding: {
      strategy: "once",      // Seeding strategy
      command: "npm run seed"
    },
    
    container: {
      image: "postgres:15",
      containerName: "test-postgres",
      ports: [
        { host: 5432, container: 5432 }
      ],
      environment: {
        POSTGRES_DB: "testdb",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test"
      },
      envMapping: {
        host: "DB_HOST",
        port: "DB_PORT",
        username: "DB_USER",
        password: "DB_PASSWORD",
        database: "DB_NAME",
        url: "DATABASE_URL"
      }
    }
  }
]
```

### MySQL

```javascript
databases: [
  {
    name: "mysql",
    category: "database",
    type: "mysql",
    mode: "container",
    isolation: "schema",
    
    container: {
      image: "mysql:8",
      environment: {
        MYSQL_DATABASE: "testdb",
        MYSQL_USER: "test",
        MYSQL_PASSWORD: "test",
        MYSQL_ROOT_PASSWORD: "root"
      }
    }
  }
]
```

### MongoDB

```javascript
databases: [
  {
    name: "mongo",
    category: "database",
    type: "mongodb",
    mode: "container",
    
    container: {
      image: "mongo:7",
      environment: {
        MONGO_INITDB_DATABASE: "testdb"
      }
    }
  }
]
```

## Storage Configuration

### MinIO (S3-compatible)

```javascript
storages: [
  {
    name: "s3",
    category: "storage",
    type: "minio",
    mode: "container",
    
    container: {
      image: "minio/minio",
      command: "server /data",
      ports: [
        { host: 9000, container: 9000 }
      ],
      environment: {
        MINIO_ROOT_USER: "minioadmin",
        MINIO_ROOT_PASSWORD: "minioadmin"
      }
    }
  }
]
```

## Messaging Configuration

### RabbitMQ

```javascript
messaging: [
  {
    name: "rabbitmq",
    category: "messaging",
    type: "rabbitmq",
    mode: "container",
    
    container: {
      image: "rabbitmq:3-management",
      ports: [
        { host: 5672, container: 5672 },
        { host: 15672, container: 15672 }  // Management UI
      ]
    }
  }
]
```

### Kafka

```javascript
messaging: [
  {
    name: "kafka",
    category: "messaging",
    type: "kafka",
    mode: "container",
    
    container: {
      image: "confluentinc/cp-kafka:latest",
      ports: [
        { host: 9092, container: 9092 }
      ]
    }
  }
]
```

## Scanning Configuration

Configure endpoint discovery:

```javascript
scan: {
  decorators: {
    paths: ["src/**/*.controller.ts"],
    decoratorNames: ["Get", "Post", "Put", "Patch", "Delete"],
    routerDecorators: ["Controller"],
    moduleDecorators: ["Module"]
  },
  
  discovery: {
    command: "npm run list-routes",
    timeout: 10000
  },
  
  output: "endpoints.json"
}
```

## Coverage Configuration

```javascript
coverage: {
  threshold: 80,            // Minimum coverage percentage
  output: "coverage.json"   // Coverage report output
}
```

## Logging Configuration

```javascript
logging: {
  level: "info",           // debug, info, warn, error
  enabled: true,
  format: "json"           // json or text
}
```

## Environment Variables

Environment variables can reference other services:

```javascript
environment: {
  DATABASE_URL: "${DATABASE_URL}",           // Auto-populated
  REDIS_HOST: "${services.redis.host}",      // Reference service
  KAFKA_BROKER: "${messaging.kafka.url}"
}
```

## Multiple Configurations

You can have different configs for different test types:

```
integr8.api.config.js      - API tests
integr8.e2e.config.js      - E2E tests
integr8.component.config.js - Component tests
```

Load specific config:

```bash
integr8 up --config integr8.e2e.config.js
integr8 test --test-type e2e
```

## TypeScript Support

Use `.ts` config files with ts-node:

```typescript
// integr8.api.config.ts
import { Integr8Config } from '@soapjs/integr8';

const config: Integr8Config = {
  testType: "api",
  // ... rest of config
};

export default config;
```

## Next Steps

- [Database Strategies](./database-strategies.md)
- [Seeding Configuration](./seeding-database.md)
- [Override System](./override-system.md)
- [Writing Tests](./writing-tests.md)

