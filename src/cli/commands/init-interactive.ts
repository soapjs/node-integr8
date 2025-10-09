import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import Handlebars from 'handlebars';
import { Integr8Config, ServiceConfig, DatabaseConfig, MessagingConfig, StorageConfig } from '../../types';
import { PromptsConfig, InitAnswers } from '../types';
import { PROMPTS } from '../prompts';

export class InteractiveInit {
  private prompts: PromptsConfig;
  private answers: InitAnswers = {
    testType: '',
    testDir: '',
    configFileType: '',
    components: [],
    services: [],
    databases: [],
    storages: [],
    messaging: []
  };

  constructor() {
    this.prompts = PROMPTS;
    this.setupHandlebars();
  }

  private setupHandlebars(): void {
    // Register helper for JSON serialization
    Handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context, null, 2);
    });
    
    // Register helper to check if an object has content
    Handlebars.registerHelper('hasContent', function(this: any, context: any, options: any) {
      if (!context || typeof context !== 'object') {
        return options.inverse(this);
      }
      
      // Check if object has any non-empty properties
      const hasContent = Object.keys(context).some(key => {
        const value = context[key];
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value).length > 0;
        }
        return true;
      });
      
      return hasContent ? options.fn(this) : options.inverse(this);
    });
  }

  async run(): Promise<void> {
    console.log(`\n${this.prompts.welcome.title}`);
    console.log(`${this.prompts.welcome.description}\n`);

    try {
      await this.askTestType();
      await this.askTestConfig();
      
      // Main component selection loop
      let addMoreComponents = true;
      while (addMoreComponents) {
        await this.askComponentSelection();
        await this.configureSelectedComponent();
        addMoreComponents = await this.askAddMoreComponents();
      }
      
      await this.askConfigFileType();
      await this.generateConfig();
      
      console.log(`\n${this.prompts.success.title}`);
      console.log(`${this.prompts.success.message}\n`);
    } catch (error) {
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  }

  private async askTestType(): Promise<void> {
    const { testType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'testType',
        message: this.prompts.testType.question,
        choices: this.prompts.testType.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);
    this.answers.testType = testType;
  }

  private async askTestConfig(): Promise<void> {
    const { testDir } = await inquirer.prompt([
      {
        type: 'input',
        name: 'testDir',
        message: this.prompts.testConfig.testDir.question,
        default: this.prompts.testConfig.testDir.default
      }
    ]);

    this.answers.testDir = testDir;
  }

  private async askComponentSelection(): Promise<void> {
    const { componentType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'componentType',
        message: this.prompts.componentSelection.question,
        choices: this.prompts.componentSelection.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);
    
    this.answers.components.push({
      category: componentType,
      name: '',
      config: {}
    });
  }

  private async configureSelectedComponent(): Promise<void> {
    const currentComponent = this.answers.components[this.answers.components.length - 1];
    
    switch (currentComponent.category) {
      case 'service':
        await this.configureService();
        break;
      case 'database':
        await this.configureDatabase();
        break;
      case 'storage':
        await this.configureStorage();
        break;
      case 'messaging':
        await this.configureMessaging();
        break;
      default:
        console.log(`⚠️  Component type '${currentComponent.category}' is coming soon!`);
        this.answers.components.pop(); // Remove the unsupported component
    }
  }

  private getDefaultDatabasePorts(dbType: string): Array<{ host: number; container: number }> {
    const portMap: Record<string, number> = {
      'postgres': 5432,
      'postgresql': 5432,
      'mysql': 3306,
      'mongodb': 27017,
      'mongo': 27017,
      'redis': 6379
    };
    
    const port = portMap[dbType.toLowerCase()] || 5432;
    return [{ host: port, container: port }];
  }

  private getDefaultDatabaseEnvironment(dbType: string): Record<string, string> {
    const envMap: Record<string, Record<string, string>> = {
      'postgres': {
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'password',
        POSTGRES_DB: 'testdb'
      },
      'postgresql': {
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'password',
        POSTGRES_DB: 'testdb'
      },
      'mysql': {
        MYSQL_DATABASE: 'testdb',
        MYSQL_USER: 'test',
        MYSQL_PASSWORD: 'password',
        MYSQL_ROOT_PASSWORD: 'root'
      },
      'mongodb': {
        MONGO_INITDB_DATABASE: 'testdb',
        MONGO_INITDB_ROOT_USERNAME: 'root',
        MONGO_INITDB_ROOT_PASSWORD: 'password'
      },
      'mongo': {
        MONGO_INITDB_DATABASE: 'testdb',
        MONGO_INITDB_ROOT_USERNAME: 'root',
        MONGO_INITDB_ROOT_PASSWORD: 'password'
      },
      'redis': {
        REDIS_PASSWORD: 'password'
      }
    };
    
    return envMap[dbType.toLowerCase()] || {};
  }

  private getDefaultMessagingPorts(msgType: string): Array<{ host: number; container: number }> {
    const portMap: Record<string, Array<{ host: number; container: number }>> = {
      'kafka': [{ host: 9092, container: 9092 }],
      'rabbitmq': [
        { host: 5672, container: 5672 },   // AMQP
        { host: 15672, container: 15672 }  // Management UI
      ],
      'nats': [{ host: 4222, container: 4222 }],
      'redis': [{ host: 6379, container: 6379 }]
    };
    
    return portMap[msgType.toLowerCase()] || [{ host: 9092, container: 9092 }];
  }

  private getDefaultMessagingEnvironment(msgType: string): Record<string, string> {
    const envMap: Record<string, Record<string, string>> = {
      'kafka': {
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      },
      'rabbitmq': {
        RABBITMQ_DEFAULT_USER: 'guest',
        RABBITMQ_DEFAULT_PASS: 'guest'
      },
      'nats': {},
      'redis': {
        REDIS_PASSWORD: 'password'
      }
    };
    
    return envMap[msgType.toLowerCase()] || {};
  }

  private async askAddMoreComponents(): Promise<boolean> {
    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: this.prompts.addMoreComponents.question,
        default: this.prompts.addMoreComponents.default
      }
    ]);
    return addMore;
  }

  private async configureService(): Promise<void> {
    const currentComponent = this.answers.components[this.answers.components.length - 1];
    
    const serviceConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: this.prompts.serviceConfig.name.question,
        default: this.prompts.serviceConfig.name.default
      },
      {
        type: 'list',
        name: 'mode',
        message: this.prompts.serviceConfig.mode.question,
        choices: this.prompts.serviceConfig.mode.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      },
      {
        type: 'list',
        name: 'communicationType',
        message: this.prompts.serviceConfig.communicationType.question,
        choices: this.prompts.serviceConfig.communicationType.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);

    currentComponent.name = serviceConfig.name;
    currentComponent.config = serviceConfig;

    // Configure communication-specific settings
    if (serviceConfig.communicationType === 'http') {
      const httpConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseUrl',
          message: this.prompts.serviceConfig.httpConfig.baseUrl.question,
          default: this.prompts.serviceConfig.httpConfig.baseUrl.default
        },
        {
          type: 'number',
          name: 'port',
          message: this.prompts.serviceConfig.httpConfig.port.question,
          default: this.prompts.serviceConfig.httpConfig.port.default
        },
        {
          type: 'input',
          name: 'prefix',
          message: this.prompts.serviceConfig.httpConfig.prefix.question,
          default: this.prompts.serviceConfig.httpConfig.prefix.default
        }
      ]);
      currentComponent.config.http = httpConfig;
    } else if (serviceConfig.communicationType === 'ws') {
      const wsConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseUrl',
          message: this.prompts.serviceConfig.wsConfig.baseUrl.question,
          default: this.prompts.serviceConfig.wsConfig.baseUrl.default
        },
        {
          type: 'number',
          name: 'port',
          message: this.prompts.serviceConfig.wsConfig.port.question,
          default: this.prompts.serviceConfig.wsConfig.port.default
        },
        {
          type: 'input',
          name: 'prefix',
          message: this.prompts.serviceConfig.wsConfig.prefix.question,
          default: this.prompts.serviceConfig.wsConfig.prefix.default
        }
      ]);
      currentComponent.config.ws = wsConfig;
    }

    // Ask for framework
    const frameworkChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'framework',
        message: this.prompts.serviceConfig.framework.question,
        choices: this.prompts.serviceConfig.framework.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);
    currentComponent.config.framework = frameworkChoice.framework;

    // Configure local or container mode
    if (serviceConfig.mode === 'local') {
      const localConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'command',
          message: this.prompts.serviceConfig.localConfig.command.question,
          default: this.prompts.serviceConfig.localConfig.command.default
        },
        {
          type: 'input',
          name: 'workingDirectory',
          message: this.prompts.serviceConfig.localConfig.workingDirectory.question,
          default: this.prompts.serviceConfig.localConfig.workingDirectory.default
        },
      ]);
      
      currentComponent.config.local = {
        command: localConfig.command,
        workingDirectory: localConfig.workingDirectory
      };
    } else if (serviceConfig.mode === 'container') {
      const containerConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'image',
          message: this.prompts.serviceConfig.containerConfig.image.question,
          default: this.prompts.serviceConfig.containerConfig.image.default
        },
        {
          type: 'input',
          name: 'containerName',
          message: this.prompts.serviceConfig.containerConfig.containerName.question,
          default: this.prompts.serviceConfig.containerConfig.containerName.default
        }
      ]);
      
      // Set default ports based on service type (can be edited in config file)
      const defaultPort = serviceConfig.communicationType === 'http' 
        ? (currentComponent.config.http?.port || 3000)
        : 3001;
      
      currentComponent.config.container = {
        image: containerConfig.image,
        containerName: containerConfig.containerName,
        ports: [{ host: defaultPort, container: defaultPort }],
        environment: {}
      };
    }

    // Ask for health checks
    const { healthCheckType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'healthCheckType',
        message: this.prompts.serviceConfig.readiness.question,
        choices: this.prompts.serviceConfig.readiness.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);

    if (healthCheckType === 'endpoint') {
      const { endpoint } = await inquirer.prompt([
        {
          type: 'input',
          name: 'endpoint',
          message: this.prompts.serviceConfig.readiness.endpoint.question,
          default: this.prompts.serviceConfig.readiness.endpoint.default
        }
      ]);
      currentComponent.config.readiness = {
        enabled: true,
        endpoint: endpoint,
        command: ''
      };
    } else if (healthCheckType === 'command') {
      const { command } = await inquirer.prompt([
        {
          type: 'input',
          name: 'command',
          message: this.prompts.serviceConfig.readiness.command.question,
          default: this.prompts.serviceConfig.readiness.command.default
        }
      ]);
      currentComponent.config.readiness = {
        enabled: true,
        endpoint: '',
        command: command
      };
    } else {
      // Skip health checks
      currentComponent.config.readiness = {
        enabled: false,
        endpoint: '',
        command: ''
      };
    }

    // Add to services array
    this.answers.services.push({
      name: serviceConfig.name,
      category: 'service',
      mode: serviceConfig.mode,
      communicationType: serviceConfig.communicationType,
      ...currentComponent.config
    });
  }

  private async configureDatabase(): Promise<void> {
    const currentComponent = this.answers.components[this.answers.components.length - 1];
    
    const dbConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: this.prompts.databaseConfig.name.question,
        default: this.prompts.databaseConfig.name.default
      },
      {
        type: 'list',
        name: 'mode',
        message: this.prompts.databaseConfig.mode.question,
        choices: this.prompts.databaseConfig.mode.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      },
      {
        type: 'list',
        name: 'type',
        message: this.prompts.databaseConfig.type.question,
        choices: this.prompts.databaseConfig.type.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      },
      {
        type: 'list',
        name: 'isolation',
        message: this.prompts.databaseConfig.isolation.question,
        choices: this.prompts.databaseConfig.isolation.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);

    currentComponent.name = dbConfig.name;
    currentComponent.config = dbConfig;

    // Ask HOW to seed (method)
    const { seedingMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'seedingMethod',
        message: this.prompts.databaseConfig.seedingMethod.question,
        choices: this.prompts.databaseConfig.seedingMethod.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);

    // Only ask for seeding details if not skipped
    if (seedingMethod !== 'skip') {
      // Ask WHEN to seed (strategy)
      const { seedingStrategy } = await inquirer.prompt([
        {
          type: 'list',
          name: 'seedingStrategy',
          message: this.prompts.databaseConfig.seeding.question,
          choices: this.prompts.databaseConfig.seeding.choices.map(choice => ({
            name: `${choice.name} - ${choice.description}`,
            value: choice.value
          }))
        }
      ]);

      currentComponent.config.seeding = seedingStrategy;

      // Ask for specific seeding details based on method
      if (seedingMethod === 'command') {
        const { seedCommand } = await inquirer.prompt([
          {
            type: 'input',
            name: 'seedCommand',
            message: this.prompts.databaseConfig.seedCommand.question,
            default: this.prompts.databaseConfig.seedCommand.default
          }
        ]);
        currentComponent.config.seedCommand = seedCommand;
      } else if (seedingMethod === 'file') {
        const { seedFile } = await inquirer.prompt([
          {
            type: 'input',
            name: 'seedFile',
            message: this.prompts.databaseConfig.seedFile.question,
            default: this.prompts.databaseConfig.seedFile.default
          }
        ]);
        currentComponent.config.seedFile = seedFile;
      }
    } else {
      // Skip seeding
      currentComponent.config.seeding = 'once'; // Default value even if skipped
    }

    // Configure local or container mode for database
    if (dbConfig.mode === 'local') {
      const localDbConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: this.prompts.databaseConfig.localConfig.host.question,
          default: this.prompts.databaseConfig.localConfig.host.default
        },
        {
          type: 'input',
          name: 'port',
          message: this.prompts.databaseConfig.localConfig.port.question,
          default: this.prompts.databaseConfig.localConfig.port.default
        },
        {
          type: 'input',
          name: 'username',
          message: this.prompts.databaseConfig.localConfig.username.question,
          default: this.prompts.databaseConfig.localConfig.username.default
        },
        {
          type: 'input',
          name: 'password',
          message: this.prompts.databaseConfig.localConfig.password.question,
          default: this.prompts.databaseConfig.localConfig.password.default
        }
      ]);
      
      currentComponent.config.local = {
        host: localDbConfig.host,
        port: localDbConfig.port,
        username: localDbConfig.username,
        password: localDbConfig.password
      };
    } else if (dbConfig.mode === 'container') {
      const containerDbConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'image',
          message: this.prompts.databaseConfig.containerConfig.image.question,
          default: this.prompts.databaseConfig.containerConfig.image.default
        },
        {
          type: 'input',
          name: 'containerName',
          message: this.prompts.databaseConfig.containerConfig.containerName.question,
          default: this.prompts.databaseConfig.containerConfig.containerName.default
        }
      ]);
      
      // Set default ports and environment based on database type
      const defaultPorts = this.getDefaultDatabasePorts(dbConfig.type);
      const defaultEnvironment = this.getDefaultDatabaseEnvironment(dbConfig.type);
      
      // Ask for environment mapping
      const envMapping = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: this.prompts.databaseConfig.envMapping.host.question,
          default: this.prompts.databaseConfig.envMapping.host.default
        },
        {
          type: 'input',
          name: 'port',
          message: this.prompts.databaseConfig.envMapping.port.question,
          default: this.prompts.databaseConfig.envMapping.port.default
        },
        {
          type: 'input',
          name: 'username',
          message: this.prompts.databaseConfig.envMapping.username.question,
          default: this.prompts.databaseConfig.envMapping.username.default
        },
        {
          type: 'input',
          name: 'password',
          message: this.prompts.databaseConfig.envMapping.password.question,
          default: this.prompts.databaseConfig.envMapping.password.default
        },
        {
          type: 'input',
          name: 'database',
          message: this.prompts.databaseConfig.envMapping.database.question,
          default: this.prompts.databaseConfig.envMapping.database.default
        },
        {
          type: 'input',
          name: 'url',
          message: this.prompts.databaseConfig.envMapping.url.question,
          default: this.prompts.databaseConfig.envMapping.url.default
        }
      ]);

      currentComponent.config.container = {
        image: containerDbConfig.image,
        containerName: containerDbConfig.containerName,
        ports: defaultPorts,
        environment: defaultEnvironment,
        envMapping: envMapping
      };
    }

    // Add to databases array
    this.answers.databases.push({
      name: dbConfig.name,
      category: 'database',
      mode: dbConfig.mode,
      type: dbConfig.type,
      isolation: dbConfig.isolation,
      seeding: dbConfig.seeding,
      ...(currentComponent.config.seedCommand && { seedCommand: currentComponent.config.seedCommand }),
      ...(currentComponent.config.seedFile && { seedFile: currentComponent.config.seedFile }),
      ...(currentComponent.config.local && { local: currentComponent.config.local }),
      ...(currentComponent.config.container && { container: currentComponent.config.container })
    });
  }

  private async configureStorage(): Promise<void> {
    const currentComponent = this.answers.components[this.answers.components.length - 1];
    
    const storageConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: this.prompts.storageConfig.name.question,
        default: this.prompts.storageConfig.name.default
      },
      {
        type: 'input',
        name: 'type',
        message: this.prompts.storageConfig.type.question,
        default: this.prompts.storageConfig.type.default
      },
      {
        type: 'list',
        name: 'mode',
        message: this.prompts.storageConfig.mode.question,
        choices: this.prompts.storageConfig.mode.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);

    currentComponent.name = storageConfig.name;
    currentComponent.config = storageConfig;

    // Configure local or container mode for storage
    if (storageConfig.mode === 'container') {
      const containerStorageConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'image',
          message: this.prompts.storageConfig.containerConfig.image.question,
          default: this.prompts.storageConfig.containerConfig.image.default
        },
        {
          type: 'input',
          name: 'containerName',
          message: this.prompts.storageConfig.containerConfig.containerName.question,
          default: this.prompts.storageConfig.containerConfig.containerName.default
        }
      ]);
      
      // Set default ports and environment for storage (MinIO)
      const defaultPorts = [
        { host: 9000, container: 9000 },  // API port
        { host: 9001, container: 9001 }   // Console port
      ];
      const defaultEnvironment = {
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin'
      };
      
      // Ask for environment mapping
      const envMapping = await inquirer.prompt([
        {
          type: 'input',
          name: 'endpoint',
          message: this.prompts.storageConfig.envMapping.endpoint.question,
          default: this.prompts.storageConfig.envMapping.endpoint.default
        },
        {
          type: 'input',
          name: 'region',
          message: this.prompts.storageConfig.envMapping.region.question,
          default: this.prompts.storageConfig.envMapping.region.default
        },
        {
          type: 'input',
          name: 'accessKey',
          message: this.prompts.storageConfig.envMapping.accessKey.question,
          default: this.prompts.storageConfig.envMapping.accessKey.default
        },
        {
          type: 'input',
          name: 'secretKey',
          message: this.prompts.storageConfig.envMapping.secretKey.question,
          default: this.prompts.storageConfig.envMapping.secretKey.default
        }
      ]);

      currentComponent.config.container = {
        image: containerStorageConfig.image,
        containerName: containerStorageConfig.containerName,
        ports: defaultPorts,
        environment: defaultEnvironment,
        envMapping: envMapping
      };
    }

    // Add to storages array
    this.answers.storages.push({
      name: storageConfig.name,
      category: 'storage',
      type: storageConfig.type,
      mode: storageConfig.mode,
      ...(currentComponent.config.container && { container: currentComponent.config.container })
    });
  }

  private async configureMessaging(): Promise<void> {
    const currentComponent = this.answers.components[this.answers.components.length - 1];
    
    const messagingConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: this.prompts.messagingConfig.name.question,
        default: this.prompts.messagingConfig.name.default
      },
      {
        type: 'list',
        name: 'type',
        message: this.prompts.messagingConfig.type.question,
        choices: this.prompts.messagingConfig.type.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      },
      {
        type: 'list',
        name: 'mode',
        message: this.prompts.messagingConfig.mode.question,
        choices: this.prompts.messagingConfig.mode.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      },
      {
        type: 'input',
        name: 'brokers',
        message: this.prompts.messagingConfig.brokers.question,
        default: this.prompts.messagingConfig.brokers.default
      },
      {
        type: 'input',
        name: 'topics',
        message: this.prompts.messagingConfig.topics.question,
        default: this.prompts.messagingConfig.topics.default
      },
      {
        type: 'input',
        name: 'queues',
        message: this.prompts.messagingConfig.queues.question,
        default: this.prompts.messagingConfig.queues.default
      }
    ]);

    currentComponent.name = messagingConfig.name;
    currentComponent.config = messagingConfig;

    // Configure local or container mode for messaging
    if (messagingConfig.mode === 'container') {
      const containerMessagingConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'image',
          message: this.prompts.messagingConfig.containerConfig.image.question,
          default: this.prompts.messagingConfig.containerConfig.image.default
        },
        {
          type: 'input',
          name: 'containerName',
          message: this.prompts.messagingConfig.containerConfig.containerName.question,
          default: this.prompts.messagingConfig.containerConfig.containerName.default
        }
      ]);
      
      // Set default ports and environment based on messaging type
      const defaultPorts = this.getDefaultMessagingPorts(messagingConfig.type);
      const defaultEnvironment = this.getDefaultMessagingEnvironment(messagingConfig.type);
      
      // Ask for environment mapping
      const envMapping = await inquirer.prompt([
        {
          type: 'input',
          name: 'brokers',
          message: this.prompts.messagingConfig.envMapping.brokers.question,
          default: this.prompts.messagingConfig.envMapping.brokers.default
        },
        {
          type: 'input',
          name: 'clusterId',
          message: this.prompts.messagingConfig.envMapping.clusterId.question,
          default: this.prompts.messagingConfig.envMapping.clusterId.default
        },
        {
          type: 'input',
          name: 'endpoint',
          message: this.prompts.messagingConfig.envMapping.endpoint.question,
          default: this.prompts.messagingConfig.envMapping.endpoint.default
        },
        {
          type: 'input',
          name: 'region',
          message: this.prompts.messagingConfig.envMapping.region.question,
          default: this.prompts.messagingConfig.envMapping.region.default
        }
      ]);

      currentComponent.config.container = {
        image: containerMessagingConfig.image,
        containerName: containerMessagingConfig.containerName,
        ports: defaultPorts,
        environment: defaultEnvironment,
        envMapping: envMapping
      };
    }

    // Add to messaging array
    this.answers.messaging.push({
      name: messagingConfig.name,
      category: 'messaging',
      type: messagingConfig.type,
      mode: messagingConfig.mode,
      brokers: messagingConfig.brokers,
      topics: messagingConfig.topics,
      queues: messagingConfig.queues,
      ...(currentComponent.config.container && { container: currentComponent.config.container })
    });
  }

  private async askConfigFileType(): Promise<void> {
    const { configFileType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configFileType',
        message: this.prompts.configFile.question,
        choices: this.prompts.configFile.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);
    this.answers.configFileType = configFileType;
  }

  private formatJsConfig(config: any): string {
    // Custom JSON stringify that removes quotes from object keys
    const formatValue = (value: any, indent = 0): string => {
      const spaces = '  '.repeat(indent);
      
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'string') return `"${value}"`;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map(item => `${spaces}  ${formatValue(item, indent + 1)}`).join(',\n');
        return `[\n${items}\n${spaces}]`;
      }
      
      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return '{}';
        
        const items = entries.map(([key, val]) => {
          const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
          return `${spaces}  ${formattedKey}: ${formatValue(val, indent + 1)}`;
        }).join(',\n');
        
        return `{\n${items}\n${spaces}}`;
      }
      
      return JSON.stringify(value);
    };
    
    return formatValue(config);
  }

  private async generateConfig(): Promise<void> {
    const config = this.buildConfig();
    await this.saveConfig(config);
    
    console.log('\nCheck your config file and run your tests!');
  }

  private buildConfig(): Integr8Config {
    return {
      testType: this.answers.testType as any,
      testDir: this.answers.testDir,
      services: this.answers.services.map(service => ({
        name: service.name,
        category: 'service',
        type: service.type,
        mode: service.mode,
        communicationType: service.communicationType,
        http: service.http,
        ws: service.ws,
        framework: service.framework,
        readiness: service.readiness,
        local: service.local,
        container: service.container
      })) as ServiceConfig[],
      databases: this.answers.databases.map(db => ({
        name: db.name,
        category: 'database',
        type: db.type,
        mode: db.mode,
        isolation: db.isolation as any,
        seeding: {
          strategy: db.seeding as any,
          command: db.seedCommand,
          file: db.seedFile
        },
        local: db.local,
        container: db.container
      })) as DatabaseConfig[],
      storages: this.answers.storages.map(storage => ({
        name: storage.name,
        category: 'storage',
        type: storage.type,
        mode: storage.mode,
        ...(storage.container && { container: storage.container })
      })) as StorageConfig[],
      messaging: this.answers.messaging.map(messaging => ({
        name: messaging.name,
        category: 'messaging',
        type: messaging.type,
        mode: messaging.mode,
        brokers: messaging.brokers?.split(',').map(b => b.trim()),
        topics: messaging.topics?.split(',').map(t => t.trim()),
        queues: messaging.queues?.split(',').map(q => q.trim()),
        ...(messaging.container && { container: messaging.container })
      })) as MessagingConfig[]
    };
  }

  private async saveConfig(config: Integr8Config): Promise<void> {
    const configFileName = `integr8.${this.answers.testType}.config.${this.answers.configFileType}`;
    
    if (fs.existsSync(configFileName)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `${configFileName} already exists. Do you want to overwrite it?`,
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log('Configuration generation cancelled.');
        return;
      }
    }

    try {
      if (this.answers.configFileType === 'js') {
        const formattedConfig = this.formatJsConfig(config);
        const configContent = `module.exports = ${formattedConfig};`;
        fs.writeFileSync(configFileName, configContent);
      } else {
        fs.writeFileSync(configFileName, JSON.stringify(config, null, 2));
      }
      
      console.log(`\n✅ Configuration file created: ${configFileName}`);
    } catch (error) {
      console.error(`\n❌ Error creating configuration file: ${error}`);
      throw error;
    }
  }
}
