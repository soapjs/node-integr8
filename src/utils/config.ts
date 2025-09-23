import { 
  Integr8Config, 
  ServiceConfig, 
  SeedConfig, 
  AdapterConfig, 
  SeedScenario,
  TestScenario,
  VolumeConfig,
  HealthCheckConfig,
  TestModeConfig,
  EnvironmentMapping
} from '../types';

export function createConfig(config: Partial<Integr8Config>): Integr8Config {
  const defaultConfig: Integr8Config = {
    services: [],
    testType: 'api',
    testDirectory: './tests',
    testFramework: 'jest',
    testMode: {
      controlPort: 3001,
      overrideEndpoint: '/__test__/override',
      enableFakeTimers: true
    },
    testTimeout: 30000,      // 30 seconds default
    setupTimeout: 10000,     // 10 seconds default
    teardownTimeout: 5000,   // 5 seconds default
    urlPrefix: '/api/v1',
    adapters: []
  };

  return {
    ...defaultConfig,
    ...config,
    services: config.services || [],
    testMode: config.testMode ? {
      ...defaultConfig.testMode,
      ...config.testMode
    } : defaultConfig.testMode,
    adapters: config.adapters || []
  };
}

export function createPostgresService(name: string = 'postgres', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'postgres',
    mode: 'container',
    image: 'postgres:15-alpine',
    ports: [5432],
    environment: {
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      ...options?.environment
    },
    healthcheck: {
      command: 'pg_isready -U test -d test',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-db`,
    dbStrategy: options?.dbStrategy || 'schema',
    parallelIsolation: options?.parallelIsolation || 'schema',
    adapter: options?.adapter,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
    workingDirectory: options?.workingDirectory,
    seed: options?.seed,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createMysqlService(name: string = 'mysql', options?: Partial<ServiceConfig>): ServiceConfig {
return {
    name,
    type: 'mysql',
    mode: 'container',
    image: 'mysql:8.0',
    ports: [3306],
    environment: {
      MYSQL_ROOT_PASSWORD: 'test',
      MYSQL_DATABASE: 'test',
      MYSQL_USER: 'test',
      MYSQL_PASSWORD: 'test',
      ...options?.environment
    },
    healthcheck: {
      command: 'mysqladmin ping -h localhost',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-db`,
    dbStrategy: options?.dbStrategy || 'schema',
    parallelIsolation: options?.parallelIsolation || 'schema',
    adapter: options?.adapter,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
    workingDirectory: options?.workingDirectory,
    seed: options?.seed,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createMongoService(name: string = 'mongo', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'mongo',
    mode: 'container',
    image: 'mongo:7.0',
    ports: [27017],
    environment: {
      MONGO_INITDB_ROOT_USERNAME: 'test',
      MONGO_INITDB_ROOT_PASSWORD: 'test',
      MONGO_INITDB_DATABASE: 'test',
      ...options?.environment
    },
    healthcheck: {
      command: 'mongosh --eval "db.adminCommand(\'ping\')"',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-db`,
    dbStrategy: options?.dbStrategy || 'schema',
    parallelIsolation: options?.parallelIsolation || 'schema',
    adapter: options?.adapter,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
    workingDirectory: options?.workingDirectory,
    seed: options?.seed,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createRedisService(name: string = 'redis', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'redis',
    mode: 'container',
    image: 'redis:7-alpine',
    ports: [6379],
    healthcheck: {
      command: 'redis-cli ping',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-cache`,
    adapter: options?.adapter,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
    workingDirectory: options?.workingDirectory,
    environment: options?.environment,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createMailhogService(name: string = 'mailhog', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'mailhog',
    mode: 'container',
    image: 'mailhog/mailhog:latest',
    ports: [1025, 8025],
    healthcheck: {
      command: 'curl -f http://localhost:8025/api/v2/messages',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-mail`,
    adapter: options?.adapter,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
    workingDirectory: options?.workingDirectory,
    environment: options?.environment,
    ...options
  };
}



export function createSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000
  };
}

export function createTypeORMSeedConfig(timeout?: number): SeedConfig {
  return {
    command: 'npm run seed',
    timeout: timeout || 30000
  };
}

export function createTypeORMEntitiesSeedConfig(
  entities: any[], 
  data?: any[], 
  options?: { clearBeforeSeed?: boolean; runMigrations?: boolean; timeout?: number; strategy?: 'once' | 'per-file' | 'per-test' | 'custom'; restoreStrategy?: 'none' | 'rollback' | 'reset' | 'snapshot' }
): SeedConfig {
  return {
    timeout: options?.timeout || 30000,
    entities,
    typeorm: {
      entities,
      data: data || [],
      clearBeforeSeed: options?.clearBeforeSeed ?? true,
      runMigrations: options?.runMigrations ?? false
    },
    strategy: options?.strategy,
    restoreStrategy: options?.restoreStrategy
  };
}

// New seeding strategies
export function createOnceSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'once',
    restoreStrategy: 'none'
  };
}

export function createPerFileSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'per-file',
    restoreStrategy: 'rollback'
  };
}

export function createPerTestSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'per-test',
    restoreStrategy: 'reset'
  };
}

export function createCustomSeedConfig(scenarios: SeedScenario[], timeout?: number): SeedConfig {
  return {
    timeout: timeout || 30000,
    strategy: 'custom',
    restoreStrategy: 'snapshot',
    customScenarios: scenarios
  };
}

export function createFlexibleSeedConfig(
  command: string,
  strategy: 'once' | 'per-file' | 'per-test' = 'per-file',
  restoreStrategy: 'none' | 'rollback' | 'reset' | 'snapshot' = 'rollback',
  timeout?: number
): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy,
    restoreStrategy
  };
}


export function createExpressAdapter(): AdapterConfig {
  return {
    type: 'express',
    config: {}
  };
}

export function createNestAdapter(config?: Record<string, any>): AdapterConfig {
  return {
    type: 'nest',
    config: {
      typeorm: true,
      testModule: true,
      ...config
    }
  };
}

export function createFastifyAdapter(config?: Record<string, any>): AdapterConfig {
  return {
    type: 'fastify',
    config: config || {}
  };
}

// Timeout configuration helpers
export function createTimeoutConfig(
  testTimeout: number = 30000,
  setupTimeout: number = 10000,
  teardownTimeout: number = 5000
): Partial<Integr8Config> {
  return {
    testTimeout,
    setupTimeout,
    teardownTimeout
  };
}

// Quick timeout presets
export function createFastTimeoutConfig(): Partial<Integr8Config> {
  return createTimeoutConfig(15000, 5000, 2000); // Fast execution
}

export function createSlowTimeoutConfig(): Partial<Integr8Config> {
  return createTimeoutConfig(60000, 30000, 10000); // Slow execution
}

export function createCITimeoutConfig(): Partial<Integr8Config> {
  return createTimeoutConfig(45000, 15000, 7000); // Balanced for CI
}

export function createE2ETimeoutConfig(): Partial<Integr8Config> {
  return createTimeoutConfig(120000, 20000, 10000); // E2E tests need more time
}

// Helper functions for creating services with dependencies
export function createAppWithDependencies(
  image: string,
  port: number,
  dependencies: string[],
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createAppService('app', {
    image,
    ports: [port],
    dependsOn: dependencies,
    ...options
  });
}

export function createPostgresWithDependencies(
  name: string = 'postgres',
  dependencies: string[] = [],
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createPostgresService(name, {
    dependsOn: dependencies,
    ...options
  });
}

export function createMongoWithDependencies(
  name: string = 'mongodb',
  dependencies: string[] = [],
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createMongoService(name, {
    dependsOn: dependencies,
    ...options
  });
}

export function createRedisWithDependencies(
  name: string = 'redis',
  dependencies: string[] = [],
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createRedisService(name, {
    dependsOn: dependencies,
    ...options
  });
}

// Services with environment mapping
export function createPostgresWithMapping(
  name: string = 'postgres',
  envMapping: EnvironmentMapping,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createPostgresService(name, {
    envMapping,
    ...options
  });
}

export function createMysqlWithMapping(
  name: string = 'mysql',
  envMapping: EnvironmentMapping,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createMysqlService(name, {
    envMapping,
    ...options
  });
}

export function createMongoWithMapping(
  name: string = 'mongo',
  envMapping: EnvironmentMapping,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createMongoService(name, {
    envMapping,
    ...options
  });
}

export function createRedisWithMapping(
  name: string = 'redis',
  envMapping: EnvironmentMapping,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createRedisService(name, {
    envMapping,
    ...options
  });
}

export function createAppWithDBMapping(
  name: string = 'app',
  dbServiceName: string,
  envMapping: EnvironmentMapping,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createAppService(name, {
    dependsOn: [dbServiceName],
    envMapping,
    ...options
  });
}

// Test configuration helpers
export function createTestScenario(
  description: string,
  expectedStatus: number,
  options?: Partial<TestScenario>
): TestScenario {
  return {
    description,
    expectedStatus,
    requestData: options?.requestData,
    queryParams: options?.queryParams,
    pathParams: options?.pathParams,
    expectedResponse: options?.expectedResponse
  };
}

// Adapter configuration helpers with proper typing
export function createTypeORMAdapter(config?: Record<string, any>): AdapterConfig {
  return {
    type: 'typeorm',
    config: {
      synchronize: false,
      logging: false,
      ...config
    }
  };
}

export function createPrismaAdapter(config?: Record<string, any>): AdapterConfig {
  return {
    type: 'prisma',
    config: {
      logLevel: 'error',
      ...config
    }
  };
}

// App service configuration
export function createAppService(name: string = 'app', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'service',
    mode: 'container',
    ports: [3000],
    containerName: options?.containerName || `${name}-service`,
    adapter: options?.adapter,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
    workingDirectory: options?.workingDirectory,
    environment: options?.environment,
    healthcheck: options?.healthcheck,
    logging: options?.logging || 'info',
    ...options
  };
}

// Service configuration with adapters
export function createPostgresWithAdapter(
  name: string = 'postgres',
  adapter?: AdapterConfig,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createPostgresService(name, {
    adapter,
    ...options
  });
}

export function createAppWithAdapter(
  name: string = 'app',
  adapter?: AdapterConfig,
  options?: Partial<ServiceConfig>
): ServiceConfig {
  return createAppService(name, {
    adapter,
    ...options
  });
}

// Volume configuration helpers
export function createVolumeConfig(
  host: string,
  container: string,
  mode: 'ro' | 'rw' = 'rw'
): VolumeConfig {
  return {
    host,
    container,
    mode
  };
}

// Health check configuration helpers
export function createHealthCheckConfig(
  command: string,
  options?: Partial<HealthCheckConfig>
): HealthCheckConfig {
  return {
    command,
    interval: 1000,
    timeout: 30000,
    retries: 3,
    startPeriod: 0,
    ...options
  };
}

// Seed scenario helpers
export function createSeedScenario(
  name: string,
  options?: Partial<SeedScenario>
): SeedScenario {
  return {
    name,
    description: options?.description,
    condition: options?.condition,
    seedData: options?.seedData,
    seedCommand: options?.seedCommand,
    restoreAfter: options?.restoreAfter ?? true
  };
}

// Test mode configuration helpers
export function createTestModeConfig(
  options?: Partial<TestModeConfig>
): TestModeConfig {
  return {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true,
    ...options
  };
}

// Environment mapping helpers
export function createEnvironmentMapping(
  options?: Partial<EnvironmentMapping>
): EnvironmentMapping {
  return {
    host: options?.host,
    port: options?.port,
    username: options?.username,
    password: options?.password,
    database: options?.database,
    url: options?.url
  };
}

// Common environment mapping presets
export function createStandardDBMapping(): EnvironmentMapping {
  return createEnvironmentMapping({
    host: 'DB_HOST',
    port: 'DB_PORT',
    username: 'DB_USERNAME',
    password: 'DB_PASSWORD',
    database: 'DB_NAME',
    url: 'DATABASE_URL'
  });
}

export function createTypeORMMapping(): EnvironmentMapping {
  return createEnvironmentMapping({
    host: 'TYPEORM_HOST',
    port: 'TYPEORM_PORT',
    username: 'TYPEORM_USERNAME',
    password: 'TYPEORM_PASSWORD',
    database: 'TYPEORM_DATABASE',
    url: 'TYPEORM_URL'
  });
}

export function createPrismaMapping(): EnvironmentMapping {
  return createEnvironmentMapping({
    url: 'DATABASE_URL'
  });
}

export function createSequelizeMapping(): EnvironmentMapping {
  return createEnvironmentMapping({
    host: 'DB_HOST',
    port: 'DB_PORT',
    username: 'DB_USER',
    password: 'DB_PASS',
    database: 'DB_NAME'
  });
}

export function createMongooseMapping(): EnvironmentMapping {
  return createEnvironmentMapping({
    url: 'MONGODB_URI'
  });
}

export function createRedisMapping(): EnvironmentMapping {
  return createEnvironmentMapping({
    host: 'REDIS_HOST',
    port: 'REDIS_PORT',
    url: 'REDIS_URL'
  });
}

// Helper functions for logging configuration
export function createLoggingConfig(level: 'debug' | 'error' | 'log' | 'info' | 'warn' | boolean = 'info'): { logging: typeof level } {
  return { logging: level };
}

// Convenience functions for different logging levels
export function enableDebugLogging(): { logging: 'debug' } {
  return { logging: 'debug' };
}

export function enableInfoLogging(): { logging: 'info' } {
  return { logging: 'info' };
}

export function enableErrorLogging(): { logging: 'error' } {
  return { logging: 'error' };
}

export function enableWarnLogging(): { logging: 'warn' } {
  return { logging: 'warn' };
}

export function disableLogging(): { logging: false } {
  return { logging: false };
}

export function enableAllLogging(): { logging: true } {
  return { logging: true };
}
