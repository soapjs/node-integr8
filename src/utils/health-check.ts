import { Wait } from 'testcontainers';

/**
 * Health check utilities for different database types
 */
export class HealthCheckManager {
  /**
   * Get native health check for PostgreSQL using pg_isready
   * Uses internal container port (5432) - health checks run inside container
   */
  static getPostgresHealthCheck() {
    return Wait.forSuccessfulCommand('pg_isready -h localhost -p 5432 -U test')
      .withStartupTimeout(30000);
  }

  /**
   * Get native health check for MySQL using mysqladmin
   * Uses internal container port (3306) - health checks run inside container
   */
  static getMysqlHealthCheck() {
    return Wait.forSuccessfulCommand('mysqladmin ping -h localhost -P 3306 -u test -ptest')
      .withStartupTimeout(30000);
  }

  /**
   * Get native health check for MongoDB using mongosh
   * Uses internal container port (27017) - health checks run inside container
   */
  static getMongoHealthCheck() {
    return Wait.forSuccessfulCommand('mongosh --port 27017 --eval "db.adminCommand(\\"ping\\")"')
      .withStartupTimeout(30000);
  }

  /**
   * Get native health check for Redis using redis-cli
   * Uses internal container port (6379) - health checks run inside container
   */
  static getRedisHealthCheck() {
    return Wait.forSuccessfulCommand('redis-cli -p 6379 ping')
      .withStartupTimeout(30000);
  }

  /**
   * Get TCP port health check (fallback)
   */
  static getTcpPortHealthCheck(port: number) {
    return Wait.forListeningPorts()
      .withStartupTimeout(30000);
  }

  /**
   * Get HTTP health check
   */
  static getHttpHealthCheck(path: string, port: number) {
    return Wait.forHttp(path, port)
      .withStartupTimeout(30000);
  }

  /**
   * Get health check based on database type
   */
  static getHealthCheckForType(type: string) {
    switch (type) {
      case 'postgres':
        return this.getPostgresHealthCheck();
      case 'mysql':
        return this.getMysqlHealthCheck();
      case 'mongo':
        return this.getMongoHealthCheck();
      case 'redis':
        return this.getRedisHealthCheck();
      default:
        // Fallback to TCP port check
        return this.getTcpPortHealthCheck(3000);
    }
  }

  /**
   * Get health check with custom timeout
   */
  static getHealthCheckWithTimeout(type: string, timeoutMs: number) {
    const baseHealthCheck = this.getHealthCheckForType(type);
    return baseHealthCheck.withStartupTimeout(timeoutMs);
  }

  /**
   * Get hybrid health check (TCP + custom command)
   */
  static getHybridHealthCheck(type: string, port: number) {
    // Use command-based health check (runs inside container with internal ports)
    return this.getHealthCheckForType(type);
  }

  /**
   * Get custom health check with specific command
   */
  static getCustomHealthCheck(command: string) {
    return Wait.forSuccessfulCommand(command)
      .withStartupTimeout(30000);
  }

  /**
   * Get log-based health check (fallback)
   */
  static getLogHealthCheck(message: string, count: number = 1) {
    return Wait.forLogMessage(message, count)
      .withStartupTimeout(30000);
  }
}
