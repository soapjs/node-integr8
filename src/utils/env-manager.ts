import { ServiceConfig } from '../types';
import { PortManager } from './port-manager';

/**
 * Environment variable management for services
 */
export class EnvironmentManager {
  /**
   * Generate environment variables for a service based on its dependencies
   */
  static generateEnvironmentVars(
    service: ServiceConfig, 
    dependencies: Map<string, { host: string; port: number; env: Record<string, string> }>
  ): Record<string, string> {
    const env: Record<string, string> = {
      ...service.environment
    };

    // Add dependency connection strings
    if (service.dependsOn) {
      for (const depName of service.dependsOn) {
        const dep = dependencies.get(depName);
        if (dep) {
          this.addDependencyEnvVars(env, depName, dep);
        }
      }
    }

    return env;
  }

  /**
   * Add environment variables for a specific dependency
   */
  private static addDependencyEnvVars(
    env: Record<string, string>,
    depName: string,
    dep: { host: string; port: number; env: Record<string, string> }
  ): void {
    const upperName = depName.toUpperCase();
    
    // Generic connection variables
    env[`${upperName}_HOST`] = dep.host;
    env[`${upperName}_PORT`] = dep.port.toString();
    
    // Database-specific variables
    if (depName === 'postgres') {
      env.DATABASE_URL = `postgresql://${dep.env.POSTGRES_USER || 'test'}:${dep.env.POSTGRES_PASSWORD || 'test'}@${dep.host}:${dep.port}/${dep.env.POSTGRES_DB || 'test'}`;
      env.DB_HOST = dep.host;
      env.DB_PORT = dep.port.toString();
      env.DB_USERNAME = dep.env.POSTGRES_USER || 'test';
      env.DB_PASSWORD = dep.env.POSTGRES_PASSWORD || 'test';
      env.DB_DATABASE = dep.env.POSTGRES_DB || 'test';
    } else if (depName === 'mysql') {
      env.DATABASE_URL = `mysql://${dep.env.MYSQL_USER || 'test'}:${dep.env.MYSQL_PASSWORD || 'test'}@${dep.host}:${dep.port}/${dep.env.MYSQL_DATABASE || 'test'}`;
      env.DB_HOST = dep.host;
      env.DB_PORT = dep.port.toString();
      env.DB_USERNAME = dep.env.MYSQL_USER || 'test';
      env.DB_PASSWORD = dep.env.MYSQL_PASSWORD || 'test';
      env.DB_DATABASE = dep.env.MYSQL_DATABASE || 'test';
    } else if (depName === 'mongo') {
      env.MONGODB_URI = `mongodb://${dep.env.MONGO_INITDB_ROOT_USERNAME || 'test'}:${dep.env.MONGO_INITDB_ROOT_PASSWORD || 'test'}@${dep.host}:${dep.port}/${dep.env.MONGO_INITDB_DATABASE || 'test'}?authSource=admin`;
      env.DB_HOST = dep.host;
      env.DB_PORT = dep.port.toString();
      env.DB_USERNAME = dep.env.MONGO_INITDB_ROOT_USERNAME || 'test';
      env.DB_PASSWORD = dep.env.MONGO_INITDB_ROOT_PASSWORD || 'test';
      env.DB_DATABASE = dep.env.MONGO_INITDB_DATABASE || 'test';
    } else if (depName === 'redis') {
      env.REDIS_URL = `redis://:${dep.env.REDIS_PASSWORD || ''}@${dep.host}:${dep.port}`;
      env.REDIS_HOST = dep.host;
      env.REDIS_PORT = dep.port.toString();
      env.REDIS_PASSWORD = dep.env.REDIS_PASSWORD || '';
    }
  }

  /**
   * Get default environment variables for a database service
   */
  static getDefaultDatabaseEnv(type: string): Record<string, string> {
    switch (type) {
      case 'postgres':
        return {
          POSTGRES_DB: 'test',
          POSTGRES_USER: 'test',
          POSTGRES_PASSWORD: 'test'
        };
      case 'mysql':
        return {
          MYSQL_DATABASE: 'test',
          MYSQL_USER: 'test',
          MYSQL_PASSWORD: 'test',
          MYSQL_ROOT_PASSWORD: 'test'
        };
      case 'mongo':
        return {
          MONGO_INITDB_DATABASE: 'test',
          MONGO_INITDB_ROOT_USERNAME: 'test',
          MONGO_INITDB_ROOT_PASSWORD: 'test'
        };
      case 'redis':
        return {
          REDIS_PASSWORD: 'test'
        };
      default:
        return {};
    }
  }

  /**
   * Merge environment variables with defaults
   */
  static mergeWithDefaults(
    customEnv: Record<string, string> = {},
    defaultEnv: Record<string, string> = {}
  ): Record<string, string> {
    return {
      ...defaultEnv,
      ...customEnv
    };
  }
}
