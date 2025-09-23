import { 
  createConfig, 
  createPostgresService, 
  createAppService,
  createAppWithDependencies,
  createPostgresWithDependencies,
  createMongoWithDependencies,
  createRedisWithDependencies
} from '@soapjs/integr8';

/**
 * DEPENDS ON EXAMPLES
 * 
 * This file demonstrates how to use dependsOn to ensure proper service startup order
 * and automatic environment variable injection for database connections.
 */

// ============================================================================
// 1. BASIC DEPENDS ON CONFIGURATION
// ============================================================================

export const basicDependsOnConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres'], // App waits for postgres
      environment: {
        NODE_ENV: 'test',
        // DATABASE_URL will be automatically injected!
        // DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE will be set
      }
    })
  ]
});

// ============================================================================
// 2. MULTIPLE DEPENDENCIES
// ============================================================================

export const multipleDependenciesConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    createRedisService('redis', {
      environment: {
        REDIS_PASSWORD: 'testpass'
      }
    }),
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres', 'redis'], // App waits for both
      environment: {
        NODE_ENV: 'test',
        // Both DATABASE_URL and REDIS_URL will be automatically injected!
      }
    })
  ]
});

// ============================================================================
// 3. USING HELPER FUNCTIONS
// ============================================================================

export const helperFunctionsConfig = createConfig({
  services: [
    createPostgresWithDependencies('postgres', [], {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    createAppWithDependencies('my-nestjs-app:latest', 3000, ['postgres'], {
      environment: {
        NODE_ENV: 'test'
        // DATABASE_URL will be automatically injected!
      }
    })
  ]
});

// ============================================================================
// 4. COMPLEX DEPENDENCY CHAIN
// ============================================================================

export const complexDependencyConfig = createConfig({
  services: [
    // Database
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    
    // Cache
    createRedisService('redis', {
      environment: {
        REDIS_PASSWORD: 'testpass'
      }
    }),
    
    // Message queue
    createKafkaService('kafka', {
      environment: {
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:9092',
      }
    }),
    
    // App depends on all infrastructure
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres', 'redis', 'kafka'],
      environment: {
        NODE_ENV: 'test',
        // All connection strings will be automatically injected!
        // DATABASE_URL, REDIS_URL, KAFKA_URL, etc.
      }
    })
  ]
});

// ============================================================================
// 5. ENVIRONMENT VARIABLES AUTOMATICALLY INJECTED
// ============================================================================

export const environmentInjectionExample = {
  // When you specify dependsOn: ['postgres'], these variables are automatically added:
  automaticallyInjected: {
    // PostgreSQL connection
    DATABASE_URL: 'postgresql://testuser:testpass@postgres:5432/testdb',
    DB_HOST: 'postgres',
    DB_PORT: '5432',
    DB_USERNAME: 'testuser',
    DB_PASSWORD: 'testpass',
    DB_DATABASE: 'testdb',
    
    // Generic dependency variables
    POSTGRES_HOST: 'postgres',
    POSTGRES_PORT: '5432'
  },
  
  // When you specify dependsOn: ['redis'], these variables are automatically added:
  redisInjection: {
    REDIS_URL: 'redis://:testpass@redis:6379',
    REDIS_HOST: 'redis',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'testpass'
  },
  
  // When you specify dependsOn: ['mongodb'], these variables are automatically added:
  mongoInjection: {
    MONGODB_URI: 'mongodb://testuser:testpass@mongodb:27017/testdb?authSource=admin',
    DB_HOST: 'mongodb',
    DB_PORT: '27017',
    DB_USERNAME: 'testuser',
    DB_PASSWORD: 'testpass',
    DB_DATABASE: 'testdb'
  }
};

// ============================================================================
// 6. STARTUP ORDER EXAMPLES
// ============================================================================

export const startupOrderExamples = {
  // Example 1: Simple chain
  simpleChain: {
    order: ['postgres', 'app'],
    description: 'Postgres starts first, then app starts after postgres is ready'
  },
  
  // Example 2: Multiple dependencies
  multipleDeps: {
    order: ['postgres', 'redis', 'app'],
    description: 'Postgres and redis start in parallel, app waits for both'
  },
  
  // Example 3: Complex chain
  complexChain: {
    order: ['postgres', 'redis', 'kafka', 'app'],
    description: 'Infrastructure starts first, app starts last'
  }
};

// ============================================================================
// 7. HEALTH CHECKS
// ============================================================================

export const healthCheckConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
      // Health check is automatically added using pg_isready equivalent
    }),
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres'],
      healthcheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '10s',
        retries: 3
      }
    })
  ]
});

// ============================================================================
// 8. TROUBLESHOOTING
// ============================================================================

export const troubleshooting = {
  commonIssues: {
    'App starts before database is ready': {
      cause: 'Missing dependsOn configuration',
      solution: 'Add dependsOn: [\'database_name\'] to app service'
    },
    'Wrong connection string': {
      cause: 'Environment variables not injected',
      solution: 'Ensure dependsOn is properly configured'
    },
    'Port conflicts': {
      cause: 'Static port assignment',
      solution: 'Ports are automatically managed by testcontainers'
    },
    'Service not found': {
      cause: 'Typo in dependsOn service name',
      solution: 'Check service names match exactly'
    }
  },
  
  debugging: [
    'Check container logs: docker logs container_name',
    'Verify dependsOn configuration',
    'Check environment variables: docker exec container_name env',
    'Verify service startup order in logs'
  ]
};

// ============================================================================
// 9. USAGE EXAMPLES
// ============================================================================

// Example 1: Simple NestJS app with Postgres
export const simpleNestJSConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    createAppWithDependencies('my-nestjs-app:latest', 3000, ['postgres'])
  ]
});

// Example 2: Full stack app
export const fullStackConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    createRedisService('redis'),
    createAppWithDependencies('my-app:latest', 3000, ['postgres', 'redis'])
  ]
});

// Example 3: Microservices
export const microservicesConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    createRedisService('redis'),
    createAppWithDependencies('user-service:latest', 3001, ['postgres', 'redis']),
    createAppWithDependencies('order-service:latest', 3002, ['postgres', 'redis']),
    createAppWithDependencies('api-gateway:latest', 3000, ['user-service', 'order-service'])
  ]
});

// USAGE EXAMPLES:
//
// For simple app with database:
// export default simpleNestJSConfig;
//
// For full stack app:
// export default fullStackConfig;
//
// For microservices:
// export default microservicesConfig;
