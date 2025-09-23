import { 
  createConfig, 
  createPostgresService, 
  createAppService,
  createMongoService,
  createRedisService
} from '@soapjs/integr8';

/**
 * DYNAMIC PORTS EXAMPLES
 * 
 * This file demonstrates how Integr8 handles dynamic ports from testcontainers
 * and how health checks work with internal container ports.
 */

// ============================================================================
// 1. HOW DYNAMIC PORTS WORK
// ============================================================================

export const dynamicPortsExplanation = {
  // Testcontainers automatically assigns random ports on host
  hostPorts: {
    postgres: '32768', // Random port on host
    mongodb: '32769',  // Random port on host
    redis: '32770',    // Random port on host
    app: '32771'       // Random port on host
  },
  
  // But inside containers, ports remain the same
  containerPorts: {
    postgres: '5432',  // Always 5432 inside container
    mongodb: '27017',  // Always 27017 inside container
    redis: '6379',     // Always 6379 inside container
    app: '3000'        // Always 3000 inside container
  },
  
  // Health checks run INSIDE containers
  healthCheckPorts: {
    postgres: 'pg_isready -h localhost -p 5432',  // Internal port!
    mongodb: 'mongosh --port 27017',              // Internal port!
    redis: 'redis-cli -p 6379',                   // Internal port!
    app: 'curl http://localhost:3000/health'      // Internal port!
  }
};

// ============================================================================
// 2. BASIC CONFIGURATION WITH DYNAMIC PORTS
// ============================================================================

export const basicDynamicPortsConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
      // Health check uses: pg_isready -h localhost -p 5432 (internal port)
    }),
    
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres'],
      environment: {
        NODE_ENV: 'test'
        // DATABASE_URL will use internal container name and port:
        // postgresql://testuser:testpass@postgres:5432/testdb
      }
    })
  ]
});

// ============================================================================
// 3. MULTIPLE SERVICES WITH DYNAMIC PORTS
// ============================================================================

export const multipleServicesConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    
    createMongoService('mongodb', {
      environment: {
        MONGO_INITDB_DATABASE: 'testdb',
        MONGO_INITDB_ROOT_USERNAME: 'testuser',
        MONGO_INITDB_ROOT_PASSWORD: 'testpass',
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
      dependsOn: ['postgres', 'mongodb', 'redis'],
      environment: {
        NODE_ENV: 'test'
        // All connection strings use internal container names and ports:
        // DATABASE_URL: postgresql://testuser:testpass@postgres:5432/testdb
        // MONGODB_URI: mongodb://testuser:testpass@mongodb:27017/testdb
        // REDIS_URL: redis://:testpass@redis:6379
      }
    })
  ]
});

// ============================================================================
// 4. PORT MAPPING EXPLANATION
// ============================================================================

export const portMappingExplanation = {
  // How testcontainers maps ports
  portMapping: {
    'Host Port 32768': 'Container Port 5432 (PostgreSQL)',
    'Host Port 32769': 'Container Port 27017 (MongoDB)',
    'Host Port 32770': 'Container Port 6379 (Redis)',
    'Host Port 32771': 'Container Port 3000 (App)'
  },
  
  // How applications connect
  applicationConnections: {
    'From Host': 'localhost:32768 (for external access)',
    'From Container': 'postgres:5432 (for internal access)',
    'Health Checks': 'localhost:5432 (inside container)'
  },
  
  // Why this works
  whyItWorks: [
    'Health checks run inside containers',
    'Internal ports are always the same (5432, 27017, etc.)',
    'Container networking uses service names (postgres, mongodb)',
    'Host ports are only for external access'
  ]
};

// ============================================================================
// 5. TROUBLESHOOTING DYNAMIC PORTS
// ============================================================================

export const troubleshooting = {
  commonIssues: {
    'Health check fails': {
      cause: 'Using host port instead of container port',
      solution: 'Health checks use internal ports (5432, not 32768)',
      example: 'pg_isready -h localhost -p 5432 (not 32768)'
    },
    'Connection refused': {
      cause: 'Using wrong hostname or port',
      solution: 'Use container names for internal connections',
      example: 'postgres:5432 (not localhost:32768)'
    },
    'Port already in use': {
      cause: 'Static port assignment conflicts',
      solution: 'Testcontainers handles this automatically',
      note: 'Dynamic ports avoid conflicts'
    }
  },
  
  debugging: [
    'Check container logs: docker logs container_name',
    'Verify internal ports: docker exec container_name netstat -tlnp',
    'Test health check: docker exec container_name pg_isready -h localhost -p 5432',
    'Check port mapping: container.getMappedPort(5432)'
  ]
};

// ============================================================================
// 6. ADVANCED CONFIGURATION
// ============================================================================

export const advancedConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      },
      containerName: 'my-postgres' // Custom container name
    }),
    
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres'],
      environment: {
        NODE_ENV: 'test',
        // Still uses internal container name and port
        DATABASE_URL: 'postgresql://testuser:testpass@postgres:5432/testdb'
      },
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
// 7. BENEFITS OF DYNAMIC PORTS
// ============================================================================

export const benefits = {
  noConflicts: 'Multiple test runs can run in parallel',
  automatic: 'No manual port management required',
  reliable: 'Health checks use consistent internal ports',
  scalable: 'Can run many containers simultaneously',
  clean: 'No port cleanup needed'
};

// ============================================================================
// 8. USAGE EXAMPLES
// ============================================================================

// Example 1: Simple app with database
export const simpleAppConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    createAppService('app', {
      image: 'my-app:latest',
      ports: [3000],
      dependsOn: ['postgres']
    })
  ]
});

// Example 2: Full stack app
export const fullStackConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    createRedisService('redis'),
    createAppService('api', {
      image: 'my-api:latest',
      ports: [3001],
      dependsOn: ['postgres', 'redis']
    }),
    createAppService('web', {
      image: 'my-web:latest',
      ports: [3000],
      dependsOn: ['api']
    })
  ]
});

// USAGE EXAMPLES:
//
// For simple app:
// export default simpleAppConfig;
//
// For full stack:
// export default fullStackConfig;
//
// Remember: Health checks use internal ports (5432, 27017, etc.)
// Applications use container names (postgres:5432, mongodb:27017)
// External access uses host ports (localhost:32768, localhost:32769)
