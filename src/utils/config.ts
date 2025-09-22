import { Integr8Config, ServiceConfig, SeedConfig, AdapterConfig } from '../types';

export function createConfig(config: Partial<Integr8Config>): Integr8Config {
  const defaultConfig: Integr8Config = {
    services: [],
    testMode: {
      controlPort: 3001,
      overrideEndpoint: '/__test__/override',
      enableFakeTimers: true
    }
  };

  return {
    ...defaultConfig,
    ...config,
    services: config.services || [],
    testMode: config.testMode ? {
      ...defaultConfig.testMode,
      ...config.testMode
    } : defaultConfig.testMode
  };
}

export function createPostgresService(name: string = 'postgres', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'postgres',
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
    ...options
  };
}

export function createMysqlService(name: string = 'mysql', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'mysql',
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
    ...options
  };
}

export function createMongoService(name: string = 'mongo', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'mongo',
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
    ...options
  };
}

export function createRedisService(name: string = 'redis', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'redis',
    image: 'redis:7-alpine',
    ports: [6379],
    healthcheck: {
      command: 'redis-cli ping',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-cache`,
    ...options
  };
}

export function createMailhogService(name: string = 'mailhog', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'mailhog',
    image: 'mailhog/mailhog:latest',
    ports: [1025, 8025],
    healthcheck: {
      command: 'curl -f http://localhost:8025/api/v2/messages',
      interval: 1000,
      timeout: 30000,
      retries: 3
    },
    containerName: options?.containerName || `${name}-mail`,
    ...options
  };
}

export function createAppService(name: string = 'service', options?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name,
    type: 'service',
    mode: options?.mode || 'container',  // Default to container mode
    image: options?.image || 'my-app:latest',
    ports: options?.ports || [3000],
    command: options?.command || 'npm start',
    healthcheck: options?.healthcheck || { command: '/health' },
    containerName: options?.containerName || name,
    workingDirectory: options?.workingDirectory,
    environment: options?.environment,
    volumes: options?.volumes,
    dependsOn: options?.dependsOn,
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
  options?: { clearBeforeSeed?: boolean; runMigrations?: boolean; timeout?: number }
): SeedConfig {
  return {
    timeout: options?.timeout || 30000,
    typeorm: {
      entities,
      data: data || [],
      clearBeforeSeed: options?.clearBeforeSeed ?? true,
      runMigrations: options?.runMigrations ?? false
    }
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
