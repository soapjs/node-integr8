import { 
  Integr8Config, 
  ServiceConfig, 
  DatabaseConfig,
  MessagingConfig,
  SeedConfig, 
  AdapterConfig, 
  TestScenario,
  VolumeConfig,
  ReadinessConfig,
  ServiceTestModeConfig,
  DatabaseEnvMapping,
  AuthConfig,
  AuthOverrideConfig,
  AuthProfile,
  HttpConfig
} from '../types';

export function createPostgresDatabase(name: string = 'postgres', options?: Partial<DatabaseConfig>): DatabaseConfig {
  return {
    name,
    category: 'database',
    type: 'postgres',
    isolation: options?.isolation || 'schema',
    container: {
      image: 'postgres:15-alpine',
      containerName: options?.container?.containerName || `${name}-db`,
      ports: [{ host: 5432, container: 5432 }],
      volumes: options?.container?.volumes || []
    },
    environment: {
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      ...options?.environment
    },
    readiness: {
      command: 'pg_isready -U test -d test',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    adapter: options?.adapter,
    dependsOn: options?.dependsOn,
    seed: options?.seed,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createMysqlDatabase(name: string = 'mysql', options?: Partial<DatabaseConfig>): DatabaseConfig {
  return {
    name,
    category: 'database',
    type: 'mysql',
    isolation: options?.isolation || 'schema',
    container: {
      image: 'mysql:8.0',
      containerName: options?.container?.containerName || `${name}-db`,
      ports: [{ host: 3306, container: 3306 }],
      volumes: options?.container?.volumes || []
    },
    environment: {
      MYSQL_ROOT_PASSWORD: 'test',
      MYSQL_DATABASE: 'test',
      MYSQL_USER: 'test',
      MYSQL_PASSWORD: 'test',
      ...options?.environment
    },
    readiness: {
      command: 'mysqladmin ping -h localhost',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    adapter: options?.adapter,
    dependsOn: options?.dependsOn,
    seed: options?.seed,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createMongoDatabase(name: string = 'mongo', options?: Partial<DatabaseConfig>): DatabaseConfig {
  return {
    name,
    category: 'database',
    type: 'mongo',
    isolation: options?.isolation || 'schema',
    container: {
      image: 'mongo:7.0',
      containerName: options?.container?.containerName || `${name}-db`,
      ports: [{ host: 27017, container: 27017 }],
      volumes: options?.container?.volumes || []
    },
    environment: {
      MONGO_INITDB_ROOT_USERNAME: 'test',
      MONGO_INITDB_ROOT_PASSWORD: 'test',
      MONGO_INITDB_DATABASE: 'test',
      ...options?.environment
    },
    readiness: {
      command: 'mongosh --eval "db.adminCommand(\'ping\')"',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    adapter: options?.adapter,
    dependsOn: options?.dependsOn,
    seed: options?.seed,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createRedisDatabase(name: string = 'redis', options?: Partial<DatabaseConfig>): DatabaseConfig {
  return {
    name,
    category: 'database',
    type: 'redis',
    isolation: options?.isolation || 'schema',
    container: {
      image: 'redis:7-alpine',
      containerName: options?.container?.containerName || `${name}-cache`,
      ports: [{ host: 6379, container: 6379 }],
      volumes: options?.container?.volumes || []
    },
    readiness: {
      command: 'redis-cli ping',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    adapter: options?.adapter,
    dependsOn: options?.dependsOn,
    environment: options?.environment,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createMailhogService(name: string = 'mailhog', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    category: 'service',
    type: 'mailhog',
    local: options?.local || {
      command: 'mailhog',
      cwd: '.',
      args: []
    },
    http: {
      baseUrl: 'http://localhost',
      port: 8025,
      prefix: 'api/v2'
    },
    container: {
      image: 'mailhog/mailhog:latest',
      containerName: options?.container?.containerName || `${name}-mail`,
      ports: [
        { host: 1025, container: 1025 },
        { host: 8025, container: 8025 }
      ],
      volumes: options?.container?.volumes || []
    },
    readiness: {
      command: 'curl -f http://localhost:8025/api/v2/messages',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    adapter: options?.adapter,
    dependsOn: options?.dependsOn,
    environment: options?.environment,
    logging: options?.logging || 'info',
    ...options
  };
}

// Messaging configuration helpers
export function createKafkaMessaging(name: string = 'kafka', options?: Partial<MessagingConfig>): MessagingConfig {
  return {
    name,
    type: 'kafka',
    category: 'messaging',
    connection: {
      brokers: ['localhost:9092'],
      ...options?.connection
    },
    topics: options?.topics || ['test-topic'],
    auth: options?.auth,
    testMode: {
      mockPublishers: false,
      captureMessages: true,
      isolation: 'topic',
      ...options?.testMode
    },
    container: {
      image: 'confluentinc/cp-kafka:latest',
      containerName: options?.container?.containerName || `${name}-kafka`,
      ports: [{ host: 9092, container: 9092 }],
      volumes: options?.container?.volumes || []
    },
    environment: {
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092',
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
      ...options?.environment
    },
    readiness: {
      command: 'kafka-topics --bootstrap-server localhost:9092 --list',
      interval: 2000,
      timeout: 30000,
      retries: 5
    },
    dependsOn: options?.dependsOn,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createRabbitMQMessaging(name: string = 'rabbitmq', options?: Partial<MessagingConfig>): MessagingConfig {
  return {
    name,
    type: 'rabbitmq',
    category: 'messaging',
    connection: {
      endpoint: 'amqp://localhost:5672',
      ...options?.connection
    },
    queues: options?.queues || ['test-queue'],
    auth: {
      username: 'guest',
      password: 'guest',
      ...options?.auth
    },
    testMode: {
      mockPublishers: false,
      captureMessages: true,
      isolation: 'queue',
      ...options?.testMode
    },
    container: {
      image: 'rabbitmq:3-management',
      containerName: options?.container?.containerName || `${name}-rabbitmq`,
      ports: [
        { host: 5672, container: 5672 },
        { host: 15672, container: 15672 }
      ],
      volumes: options?.container?.volumes || []
    },
    environment: {
      RABBITMQ_DEFAULT_USER: 'guest',
      RABBITMQ_DEFAULT_PASS: 'guest',
      ...options?.environment
    },
    readiness: {
      command: 'rabbitmq-diagnostics -q ping',
      interval: 2000,
      timeout: 30000,
      retries: 5
    },
    dependsOn: options?.dependsOn,
    logging: options?.logging || 'info',
    ...options
  };
}

export function createRedisStreamsMessaging(name: string = 'redis-streams', options?: Partial<MessagingConfig>): MessagingConfig {
  return {
    name,
    category: 'messaging',
    type: 'redis-streams',
    connection: {
      endpoint: 'redis://localhost:6379',
      ...options?.connection
    },
    streams: options?.streams || ['test-stream'],
    testMode: {
      mockPublishers: false,
      captureMessages: true,
      isolation: 'stream',
      ...options?.testMode
    },
    container: {
      image: 'redis:7-alpine',
      containerName: options?.container?.containerName || `${name}-redis`,
      ports: [{ host: 6379, container: 6379 }],
      volumes: options?.container?.volumes || []
    },
    readiness: {
      command: 'redis-cli ping',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    dependsOn: options?.dependsOn,
    logging: options?.logging || 'info',
    ...options
  };
}

// HTTP configuration helpers
export function createHttpConfig(
  baseUrl: string = 'http://localhost',
  port?: number,
  prefix?: string
): HttpConfig {
  return {
    baseUrl,
    port,
    prefix
  };
}

export function createWsConfig(
  baseUrl: string = 'ws://localhost',
  port?: number,
  prefix?: string
): HttpConfig {
  return {
    baseUrl,
    port,
    prefix
  };
}

// Common HTTP config presets
export function createLocalHttpConfig(port: number = 3000, prefix: string = 'api/v1'): HttpConfig {
  return createHttpConfig('http://localhost', port, prefix);
}

export function createLocalWsConfig(port: number = 3001, prefix: string = 'ws'): HttpConfig {
  return createWsConfig('ws://localhost', port, prefix);
}

export function createHttpsConfig(port: number = 443, prefix?: string): HttpConfig {
  return createHttpConfig('https://localhost', port, prefix);
}

export function createWssConfig(port: number = 443, prefix?: string): HttpConfig {
  return createWsConfig('wss://localhost', port, prefix);
}



export function createSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000
  };
}

// New seeding strategies
export function createOnceSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'once',
    restore: 'none'
  };
}

export function createPerFileSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'per-file',
    restore: 'rollback'
  };
}

export function createPerTestSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'per-test',
    restore: 'reset'
  };
}

export function createCustomSeedConfig(command: string, timeout?: number): SeedConfig {
  return {
    command,
    timeout: timeout || 30000,
    strategy: 'custom',
    restore: 'snapshot'
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
    restore: restoreStrategy
  };
}


export function createExpressAdapter(): AdapterConfig {
  return {
    type: 'express',
    config: {}
  };
}

export function createNestJSAdapter(config?: Record<string, any>): AdapterConfig {
  return {
    type: 'nestjs',
    config: {
      enableTestModule: true,
      enableTestMiddleware: true,
      enableTestGuard: true,
      enableTestInterceptor: true,
      enableTestPipe: true,
      ...config
    }
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
    local: options?.local || {
      command: 'node',
      cwd: '.',
      args: []
    },
    container: {
      image,
      containerName: options?.container?.containerName || `app-service`,
      ports: [{ host: port, container: port }]
    },
    dependsOn: dependencies,
    ...options
  });
}

export function createPostgresWithDependencies(
  name: string = 'postgres',
  dependencies: string[] = [],
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createPostgresDatabase(name, {
    dependsOn: dependencies,
    ...options
  });
}

export function createMongoWithDependencies(
  name: string = 'mongodb',
  dependencies: string[] = [],
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createMongoDatabase(name, {
    dependsOn: dependencies,
    ...options
  });
}

export function createRedisWithDependencies(
  name: string = 'redis',
  dependencies: string[] = [],
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createRedisDatabase(name, {
    dependsOn: dependencies,
    ...options
  });
}

// Services with environment mapping
export function createPostgresWithMapping(
  name: string = 'postgres',
  envMapping: DatabaseEnvMapping,
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createPostgresDatabase(name, {
    ...options,
    container: options?.container ? {
      ...options.container,
      envMapping
    } : undefined
  });
}

export function createMysqlWithMapping(
  name: string = 'mysql',
  envMapping: DatabaseEnvMapping,
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createMysqlDatabase(name, {
    ...options,
    container: options?.container ? {
      ...options.container,
      envMapping
    } : undefined
  });
}

export function createMongoWithMapping(
  name: string = 'mongo',
  envMapping: DatabaseEnvMapping,
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createMongoDatabase(name, {
    ...options,
    container: options?.container ? {
      ...options.container,
      envMapping
    } : undefined
  });
}

export function createRedisWithMapping(
  name: string = 'redis',
  envMapping: DatabaseEnvMapping,
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createRedisDatabase(name, {
    ...options,
    container: options?.container ? {
      ...options.container,
      envMapping
    } : undefined
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
    category: 'service',
    type: 'app',
    local: options?.local || {
      command: 'node',
      cwd: '.',
      args: []
    },
    http: {
      baseUrl: 'http://localhost',
      port: 3000,
      prefix: 'api/v1'
    },
    container: {
      image: options?.container?.image || 'node:18-alpine',
      containerName: options?.container?.containerName || `${name}-service`,
      ports: [{ host: 3000, container: 3000 }],
      volumes: options?.container?.volumes || []
    },
    adapter: options?.adapter,
    dependsOn: options?.dependsOn,
    environment: options?.environment,
    readiness: options?.readiness,
    logging: options?.logging || 'info',
    auth: options?.auth,
    testMode: options?.testMode,
    ...options
  };
}

// Service configuration with adapters
export function createPostgresWithAdapter(
  name: string = 'postgres',
  adapter?: AdapterConfig,
  options?: Partial<DatabaseConfig>
): DatabaseConfig {
  return createPostgresDatabase(name, {
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
  options?: Partial<ReadinessConfig>
): ReadinessConfig {
  return {
    command,
    interval: 1000,
    timeout: 30000,
    retries: 3,
    ...options
  };
}

// Seed scenario helpers - removed as SeedScenario type doesn't exist

// Test mode configuration helpers
export function createTestModeConfig(
  options?: Partial<ServiceTestModeConfig>
): ServiceTestModeConfig {
  return {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true,
    ...options
  };
}

// Environment mapping helpers
export function createEnvironmentMapping(
  options?: Partial<DatabaseEnvMapping>
): DatabaseEnvMapping {
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
export function createStandardDBMapping(): DatabaseEnvMapping {
  return createEnvironmentMapping({
    host: 'DB_HOST',
    port: 'DB_PORT',
    username: 'DB_USERNAME',
    password: 'DB_PASSWORD',
    database: 'DB_NAME',
    url: 'DATABASE_URL'
  });
}

export function createTypeORMMapping(): DatabaseEnvMapping {
  return createEnvironmentMapping({
    host: 'TYPEORM_HOST',
    port: 'TYPEORM_PORT',
    username: 'TYPEORM_USERNAME',
    password: 'TYPEORM_PASSWORD',
    database: 'TYPEORM_DATABASE',
    url: 'TYPEORM_URL'
  });
}

export function createPrismaMapping(): DatabaseEnvMapping {
  return createEnvironmentMapping({
    url: 'DATABASE_URL'
  });
}

export function createSequelizeMapping(): DatabaseEnvMapping {
  return createEnvironmentMapping({
    host: 'DB_HOST',
    port: 'DB_PORT',
    username: 'DB_USER',
    password: 'DB_PASS',
    database: 'DB_NAME'
  });
}

export function createMongooseMapping(): DatabaseEnvMapping {
  return createEnvironmentMapping({
    url: 'MONGODB_URI'
  });
}

export function createRedisMapping(): DatabaseEnvMapping {
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

// Authentication configuration helpers
export function createAuthConfig(options?: Partial<AuthConfig>): AuthConfig {
  return {
    override: options?.override || [],
    profiles: options?.profiles || [],
    defaultProfile: options?.defaultProfile
  };
}

// Auth override helpers
export function createAuthOverride(name: string, options?: Partial<AuthOverrideConfig>): AuthOverrideConfig {
  return {
    name,
    middleware: options?.middleware,
    mockUser: options?.mockUser,
    mockPermissions: options?.mockPermissions,
    condition: options?.condition
  };
}

// Common auth override presets
export function createMockAdminOverride(middleware?: string): AuthOverrideConfig {
  return createAuthOverride('mock-admin', {
    middleware: middleware || 'auth-middleware',
    mockUser: { 
      id: 1, 
      role: 'admin',
      permissions: ['*'],
      email: 'admin@test.com'
    },
    mockPermissions: ['read', 'write', 'delete', 'admin']
  });
}

export function createMockUserOverride(middleware?: string): AuthOverrideConfig {
  return createAuthOverride('mock-user', {
    middleware: middleware || 'auth-middleware',
    mockUser: { 
      id: 2, 
      role: 'user',
      permissions: ['read'],
      email: 'user@test.com'
    },
    mockPermissions: ['read']
  });
}

export function createMockGuestOverride(middleware?: string): AuthOverrideConfig {
  return createAuthOverride('mock-guest', {
    middleware: middleware || 'auth-middleware',
    mockUser: { 
      id: null, 
      role: 'guest',
      permissions: [],
      email: null
    },
    mockPermissions: []
  });
}

// Auth profile helpers
export function createAuthProfile(name: string, options: Partial<AuthProfile>): AuthProfile {
  return {
    name,
    type: options.type || 'jwt',
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    tokenUrl: options.tokenUrl,
    scope: options.scope,
    token: options.token,
    apiKey: options.apiKey,
    headerName: options.headerName,
    username: options.username,
    password: options.password,
    cookies: options.cookies
  };
}

// Common auth profile presets
export function createJWTProfile(name: string, token: string): AuthProfile {
  return createAuthProfile(name, {
    type: 'jwt',
    token
  });
}

export function createOAuth2Profile(
  name: string,
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  scope?: string
): AuthProfile {
  return createAuthProfile(name, {
    type: 'oauth2',
    clientId,
    clientSecret,
    tokenUrl,
    scope
  });
}

export function createApiKeyProfile(name: string, apiKey: string, headerName: string = 'X-API-Key'): AuthProfile {
  return createAuthProfile(name, {
    type: 'apikey',
    apiKey,
    headerName
  });
}

export function createBasicAuthProfile(name: string, username: string, password: string): AuthProfile {
  return createAuthProfile(name, {
    type: 'basic',
    username,
    password
  });
}

export function createSessionProfile(name: string, cookies: Record<string, string>): AuthProfile {
  return createAuthProfile(name, {
    type: 'session',
    cookies
  });
}

// Combined auth configuration helpers
export function createTestAuthConfig(): AuthConfig {
  return createAuthConfig({
    override: [
      createMockAdminOverride(),
      createMockUserOverride(),
      createMockGuestOverride()
    ],
    defaultProfile: 'mock-user'
  });
}

export function createStageAuthConfig(profiles: AuthProfile[]): AuthConfig {
  return createAuthConfig({
    profiles,
    defaultProfile: profiles[0]?.name
  });
}

export function createMixedAuthConfig(
  overrides: AuthOverrideConfig[],
  profiles: AuthProfile[],
  defaultProfile?: string
): AuthConfig {
  return createAuthConfig({
    override: overrides,
    profiles,
    defaultProfile
  });
}
