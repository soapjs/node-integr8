import { DatabaseConfig, ServiceConfig } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';

export interface LoggerConfig {
  level?: LogLevel;
  serviceName?: string;
  enabled: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private serviceName: string;

  constructor(config: LoggerConfig, serviceName: string = '') {
    this.config = config;
    this.serviceName = serviceName;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Handle string levels
    const levelHierarchy: Record<string, number> = {
      'error': 0,
      'warn': 1,
      'log': 2,
      'info': 3,
      'debug': 4
    };

    const currentLevel = typeof this.config.level === 'string' ? this.config.level : 'log';
    const requestedLevel = typeof level === 'string' ? level : 'log';

    return levelHierarchy[requestedLevel] <= levelHierarchy[currentLevel];
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const servicePrefix = this.serviceName ? `[${this.serviceName}]` : '';
    return `${timestamp} ${servicePrefix} [${level.toUpperCase()}] ${message} ${args.join(' ')}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  log(message: string, ...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(this.formatMessage('log', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }
}

// Global logger registry
const loggers = new Map<string, Logger>();

export function createLogger(serviceConfig: ServiceConfig | DatabaseConfig, serviceName: string): Logger {
  const loggingConfig = serviceConfig.logging;
  
  // Default logging configuration
  let level: LogLevel = 'log';
  let enabled = true;

  if (loggingConfig === false) {
    enabled = false;
  } else if (loggingConfig === true) {
    level = 'debug'; // Show everything when explicitly enabled
  } else if (typeof loggingConfig === 'string') {
    level = loggingConfig;
  }
  // If loggingConfig is undefined, use defaults (enabled = true, level = 'log')

  const config: LoggerConfig = {
    level,
    enabled,
    serviceName
  };

  const logger = new Logger(config, serviceName);
  loggers.set(serviceName, logger);
  return logger;
}

export function getLogger(serviceName: string): Logger | undefined {
  return loggers.get(serviceName);
}

export function getOrCreateLogger(serviceConfig: ServiceConfig, serviceName: string): Logger {
  const existing = loggers.get(serviceName);
  if (existing) {
    return existing;
  }
  return createLogger(serviceConfig, serviceName);
}

// Utility function to create a logger for a specific service
export function createServiceLogger(serviceConfig: ServiceConfig | DatabaseConfig, serviceName: string): Logger {
  return createLogger(serviceConfig, serviceName);
}
