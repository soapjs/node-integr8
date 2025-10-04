import chalk from "chalk";
import { Network, StartedNetwork, StartedTestContainer, GenericContainer, Wait } from "testcontainers";
import Docker from "dockerode";

import { ContainerConfig, DatabaseConfig, IRunner, MessagingConfig, ServiceConfig, StorageConfig } from "../../types";
import { Logger } from "../../utils/logger";

export class ContainerRunner implements IRunner {
  private config: ServiceConfig | DatabaseConfig | StorageConfig | MessagingConfig;
  private container?: StartedTestContainer;
  private network?: StartedNetwork;
  private serviceLogger: Logger | undefined;

  constructor(
    config: ServiceConfig | DatabaseConfig | StorageConfig | MessagingConfig,
    private logger: Logger,
  ) {
    if (!config.container) {
      throw new Error('Container config is required');
    }
    this.config = config;

    if (config.logging) {
      this.serviceLogger = new Logger({
        level: typeof config.logging === 'string' ? config.logging : 'debug',
        enabled: true
      });
    }
  }

  private getPort(): number {
    // For now, return default ports based on common services
    // This should be configured per service type
    if (this.config.type === 'postgresql' || this.config.name.includes('postgres') || this.config.name.includes('pg')) {
      return 5432;
    } else if (this.config.type === 'mysql' || this.config.name.includes('mysql')) {
      return 3306;
    } else if (this.config.type === 'mongodb' || this.config.name.includes('mongo')) {
      return 27017;
    } else if (this.config.type === 'redis' || this.config.name.includes('redis')) {
      return 6379;
    } else if (this.config.name.includes('mailhog')) {
      return 8025;
    } else if (this.config.category === 'service') {
      const serviceConfig = this.config as ServiceConfig;
      return serviceConfig.http?.port || serviceConfig.ws?.port || 3000;
    } else {
      // Default port for unknown services
      return 3000;
    }
  }

  private mapEnvVariables(): Record<string, string> {
    if (!this.config.container?.envMapping) {
      return {};
    }

    const variables: Record<string, string> = {};
      if (!this.container) {
        return {};
      }
      
      const host = this.container.getHost();
      const containerPort = this.getPort();
      const mappedPort = this.container.getMappedPort(containerPort);
      
      console.log(`Container ${this.config.name} details:`, {
        host,
        containerPort,
        mappedPort
      });
      
      // Get database credentials from container environment
      const environment = this.config.container?.environment || {};
      const mapping = this.config.container?.envMapping;
      // Generate connection strings based on envMapping
      if (mapping.host) {
        variables[mapping.host] = host;
      }
      if (mapping.port) {
        variables[mapping.port] = mappedPort.toString();
      }
      if (mapping.username) {
        variables[mapping.username] = environment.POSTGRES_USER || environment.MYSQL_USER || environment.MONGO_INITDB_ROOT_USERNAME || 'test';
      }
      if (mapping.password) {
        variables[mapping.password] = environment.POSTGRES_PASSWORD || environment.MYSQL_PASSWORD || environment.MONGO_INITDB_ROOT_PASSWORD || 'test';
      }
      if (mapping.database) {
        variables[mapping.database] = environment.POSTGRES_DB || environment.MYSQL_DATABASE || environment.MONGO_INITDB_DATABASE || 'test';
      }
      if (mapping.url) {
        // Generate full connection URL
        const username = environment.POSTGRES_USER || environment.MYSQL_USER || environment.MONGO_INITDB_ROOT_USERNAME || 'test';
        const password = environment.POSTGRES_PASSWORD || environment.MYSQL_PASSWORD || environment.MONGO_INITDB_ROOT_PASSWORD || 'test';
        const database = environment.POSTGRES_DB || environment.MYSQL_DATABASE || environment.MONGO_INITDB_DATABASE || 'test';
        
        let protocol = 'postgresql';
        if (this.config.name.includes('mysql')) protocol = 'mysql';
        if (this.config.name.includes('mongo')) protocol = 'mongodb';
        
        variables[mapping.url] = `${protocol}://${username}:${password}@${host}:${mappedPort}/${database}`;
      }
    
    // console.log('Generated connection strings:', Object.keys(variables));
    return variables;
  }

  private async removeExistingContainer(containerName: string): Promise<void> {
    try {
      const docker = new Docker();
      const containers = await docker.listContainers({ all: true });
      
      const existingContainer = containers.find(container => 
        container.Names.some(name => name.includes(containerName))
      );
      
      if (existingContainer) {
        this.logger.info(`Found existing container: ${containerName}, removing...`);
        
        const container = docker.getContainer(existingContainer.Id);
        
        // Stop container if running
        if (existingContainer.State === 'running') {
          await container.stop();
          this.logger.info(`Stopped existing container: ${containerName}`);
        }
        
        // Remove container
        await container.remove({ force: true });
        this.logger.info(`Removed existing container: ${containerName}`);
      }
    } catch (error) {
      // Container doesn't exist or already removed, that's fine
      this.logger.debug(`No existing container to remove: ${containerName}`);
    }
  }

  private configureContainerLogging(container: GenericContainer, logging: 'debug' | 'error' | 'log' | 'info' | 'warn' | boolean): GenericContainer {
    if (this.serviceLogger === undefined) {
      return container.withLogConsumer(() => {});
    }

    return container.withLogConsumer((stream) => {
      stream.on('data', (chunk) => {
        const message = chunk.toString().trim();

        if (typeof logging === 'string') {
          this.serviceLogger![logging](`Container:`, message);
        }
      });
    });
  }

  async isReady(serviceName: string): Promise<boolean> {
    if (!this.container) {
      return false;
    }

    try {
      const { readiness } = this.config;
      if (!readiness) {
        this.logger.info('⚠️  No health check configured, assuming container is ready');
        return true;
      }

      const { command, endpoint, interval, timeout, retries } = readiness;

      if (endpoint) {
        // HTTP health check
        const port = this.getPort();
        const host = this.container.getHost();
        const mappedPort = this.container.getMappedPort(port);
        const url = `http://${host}:${mappedPort}${endpoint}`;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout || 5000);
          
          const response = await fetch(url, { 
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return response.ok;
        } catch (error) {
          this.logger.error(`Health check failed for ${serviceName}:`, error);
          return false;
        }
      }

      if (command) {
        // Command-based health check
        const result = await this.container.exec(command.split(' '));
        return result.exitCode === 0;
      }

      this.logger.error('❌ Readiness check failed. No endpoint or command provided.');
      return false; 
    } catch (error) {
      this.logger.error(`❌ Container ${this.config.name} is not ready: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async start(fast: boolean = false): Promise<void> {
    if (!this.config.container) {
      throw new Error('Container config is required');
    }

    this.logger.info(`Starting container: ${this.config.name}`);

    // Check and remove existing container with same name
    if (this.config.container.containerName) {
      await this.removeExistingContainer(this.config.container.containerName);
    }

    // Create network if not provided
    if (!this.network) {
      this.network = await new Network().start();
    }

    // Create container from image
    let container = new GenericContainer(this.config.container.image);

    // Set container name
    if (this.config.container.containerName) {
      container = container.withName(this.config.container.containerName);
    }

    // Configure ports
    if (this.config.container.ports) {
      const exposedPorts = this.config.container.ports.map(p => p.container);
      container = container.withExposedPorts(...exposedPorts);
    }

    // Configure volumes
    if (this.config.container.volumes) {
      const bindMounts = this.config.container.volumes.map(volume => ({
        source: volume.host,
        target: volume.container,
        mode: volume.mode || 'rw'
      }));
      container = container.withBindMounts(bindMounts);
    }

    // Configure environment variables
    if (this.config.container?.environment) {
      container = container.withEnvironment(this.config.container.environment);
    }

    // Configure health check
    if (this.config.readiness) {
      container = container.withWaitStrategy(Wait.forHealthCheck());
    }

    // Add to network
    container = container.withNetwork(this.network);

    // Configure logging
    if (this.config.logging !== undefined) {
      container = this.configureContainerLogging(container, this.config.logging);
    }

    // Start container
    this.container = await container.start();
    
    // Generate connection strings after container is started
    const connectionStrings = this.mapEnvVariables();
    // this.logger.info(`Generated connection strings for ${this.config.name}:`, Object.keys(connectionStrings));
    
    this.logger.info(`✅ Container ${this.config.name} started`);
  }

  async stop(): Promise<void> {
    if (!this.container) {
      this.logger.info(`Container ${this.config.name} not running`);
      return;
    }

    try {
      await this.container.stop();
      this.logger.info(`✅ Container ${this.config.name} stopped`);
    } catch (error) {
      this.logger.error(`⚠️  Container ${this.config.name} already stopped or not found:`, error instanceof Error ? error.message : String(error));
    } finally {
      this.container = undefined;
    }
  }

  getConnectionStrings(): Record<string, string> {
    return this.mapEnvVariables();
  }
}