import { 
  createConfig, 
  createPostgresService, 
  createAppService,
  createMongoService,
  createRedisService
} from '@soapjs/integr8';
import { HealthCheckManager } from '../src/utils/health-check';

/**
 * HEALTH CHECK EXAMPLES
 * 
 * This file demonstrates different health check strategies for databases
 * and applications, moving away from log-based checks to more reliable methods.
 */

// ============================================================================
// 1. NATIVE COMMAND HEALTH CHECKS
// ============================================================================

export const nativeCommandConfig = createConfig({
  services: [
    // PostgreSQL with pg_isready
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
      // Health check automatically uses: pg_isready -h localhost -p 5432 -U testuser
    }),
    
    // MongoDB with mongosh ping
    createMongoService('mongodb', {
      environment: {
        MONGO_INITDB_DATABASE: 'testdb',
        MONGO_INITDB_ROOT_USERNAME: 'testuser',
        MONGO_INITDB_ROOT_PASSWORD: 'testpass',
      }
      // Health check automatically uses: mongosh --eval "db.adminCommand(\"ping\")"
    }),
    
    // Redis with redis-cli ping
    createRedisService('redis', {
      environment: {
        REDIS_PASSWORD: 'testpass'
      }
      // Health check automatically uses: redis-cli ping
    }),
    
    // App waits for all databases
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres', 'mongodb', 'redis'],
      environment: {
        NODE_ENV: 'test'
        // All connection strings automatically injected!
      }
    })
  ]
});

// ============================================================================
// 2. TCP PORT HEALTH CHECKS (FASTER)
// ============================================================================

export const tcpPortConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
      // Uses TCP port check (faster than command check)
    }),
    
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres'],
      environment: {
        NODE_ENV: 'test'
      }
    })
  ]
});

// ============================================================================
// 3. HTTP HEALTH CHECKS FOR APPLICATIONS
// ============================================================================

export const httpHealthCheckConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    
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
      // Uses HTTP health check: GET /health
    })
  ]
});

// ============================================================================
// 4. CUSTOM HEALTH CHECKS
// ============================================================================

export const customHealthCheckConfig = createConfig({
  services: [
    // Custom PostgreSQL health check
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
      // Custom health check could be added here
    }),
    
    // App with custom health check
    createAppService('app', {
      image: 'my-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres'],
      healthcheck: {
        test: ['CMD', 'node', '-e', 'process.exit(0)'], // Custom check
        interval: '30s',
        timeout: '10s',
        retries: 3
      }
    })
  ]
});

// ============================================================================
// 5. HEALTH CHECK COMPARISON
// ============================================================================

export const healthCheckComparison = {
  // Native command checks (most reliable)
  nativeCommands: {
    postgres: 'pg_isready -h localhost -p 5432 -U testuser',
    mysql: 'mysqladmin ping -h localhost -P 3306 -u test -ptest',
    mongodb: 'mongosh --eval "db.adminCommand(\\"ping\\")"',
    redis: 'redis-cli ping',
    pros: ['Most reliable', 'Database-specific', 'Tests actual functionality'],
    cons: ['Slower', 'Requires database tools', 'May fail on some images']
  },
  
  // TCP port checks (fastest)
  tcpPorts: {
    method: 'Wait.forListeningPorts()',
    pros: ['Fastest', 'Universal', 'No dependencies'],
    cons: ['Less reliable', 'Port might be open but DB not ready', 'No functionality test']
  },
  
  // HTTP health checks (for applications)
  httpChecks: {
    method: 'Wait.forHttp("/health", 3000)',
    pros: ['Application-specific', 'Tests full stack', 'Custom logic'],
    cons: ['Requires health endpoint', 'Slower than TCP', 'App must be running']
  },
  
  // Log-based checks (fallback)
  logChecks: {
    method: 'Wait.forLogMessage("ready", 1)',
    pros: ['Simple', 'No dependencies'],
    cons: ['Unreliable', 'Image-dependent', 'May miss edge cases']
  }
};

// ============================================================================
// 6. HEALTH CHECK STRATEGIES
// ============================================================================

export const healthCheckStrategies = {
  // Strategy 1: Hybrid (TCP + Command)
  hybrid: {
    description: 'Use TCP port check as primary, command check as fallback',
    implementation: 'HealthCheckManager.getHybridHealthCheck(type, port)',
    useCase: 'Production-like testing with reliability'
  },
  
  // Strategy 2: Command-only
  commandOnly: {
    description: 'Use only native database commands',
    implementation: 'HealthCheckManager.getHealthCheckForType(type)',
    useCase: 'Maximum reliability, slower startup'
  },
  
  // Strategy 3: TCP-only
  tcpOnly: {
    description: 'Use only TCP port checks',
    implementation: 'HealthCheckManager.getTcpPortHealthCheck(port)',
    useCase: 'Fast startup, less reliability'
  },
  
  // Strategy 4: Custom
  custom: {
    description: 'Use custom health check commands',
    implementation: 'HealthCheckManager.getCustomHealthCheck(command)',
    useCase: 'Special requirements or custom applications'
  }
};

// ============================================================================
// 7. TROUBLESHOOTING HEALTH CHECKS
// ============================================================================

export const troubleshooting = {
  commonIssues: {
    'Health check timeout': {
      cause: 'Database takes longer to start than expected',
      solution: 'Increase timeout or use faster health check method'
    },
    'Command not found': {
      cause: 'Database tools not available in container',
      solution: 'Use TCP port check or install tools in Dockerfile'
    },
    'Port not listening': {
      cause: 'Database not binding to expected port',
      solution: 'Check database configuration and port mapping'
    },
    'False positive': {
      cause: 'Port is open but database not ready',
      solution: 'Use command-based health check instead'
    }
  },
  
  debugging: [
    'Check container logs: docker logs container_name',
    'Test health check manually: docker exec container_name pg_isready',
    'Verify port binding: docker exec container_name netstat -tlnp',
    'Check database status: docker exec container_name ps aux | grep postgres'
  ]
};

// ============================================================================
// 8. PERFORMANCE COMPARISON
// ============================================================================

export const performanceComparison = {
  // Startup times (approximate)
  startupTimes: {
    tcpPort: '1-3 seconds',
    command: '3-10 seconds',
    http: '5-15 seconds',
    log: '2-8 seconds'
  },
  
  // Reliability scores (1-10)
  reliability: {
    command: 10,
    http: 9,
    tcpPort: 7,
    log: 5
  },
  
  // Recommended usage
  recommendations: {
    development: 'TCP port checks (fast)',
    testing: 'Command checks (reliable)',
    production: 'HTTP checks (comprehensive)',
    ci: 'Hybrid checks (balanced)'
  }
};

// ============================================================================
// 9. USAGE EXAMPLES
// ============================================================================

// Example 1: Fast development setup
export const fastDevConfig = createConfig({
  services: [
    createPostgresService('postgres'),
    createAppService('app', {
      image: 'my-app:latest',
      ports: [3000],
      dependsOn: ['postgres']
    })
  ]
  // Uses TCP port checks for fast startup
});

// Example 2: Reliable testing setup
export const reliableTestConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
    createAppService('app', {
      image: 'my-app:latest',
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
  // Uses command checks for reliability
});

// USAGE EXAMPLES:
//
// For fast development:
// export default fastDevConfig;
//
// For reliable testing:
// export default reliableTestConfig;
//
// For custom health checks:
// Use HealthCheckManager.getCustomHealthCheck('your-command')
