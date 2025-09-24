import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import Handlebars from 'handlebars';
import { Integr8Config, ServiceConfig } from '../../types';
import { PromptsConfig, InitAnswers } from '../types';
import { PROMPTS } from '../prompts';
import { join } from 'path';
import { buildFullPath } from '../../utils/url.utils';

export class InteractiveInit {
  private prompts: PromptsConfig;
  private answers: InitAnswers = {
    testType: '',
    appStructure: '',
    testDirectory: '',
    mainServiceName: '',
    readinessEndpoint: false,
    readinessPath: '',
    urlPrefix: '',
    databases: [],
    additionalServices: false,
    services: [],
    configFileType: '',
    databaseConfigs: {}
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
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
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
      await this.askAppStructure();
      await this.askTestConfig();
      await this.askDatabaseSelection();
      await this.askDatabaseConfigs();
      // Only ask for additional services if user selected monorepo
      if (this.answers.appStructure === 'monorepo') {
        await this.askAdditionalServices();
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

  private async askAppStructure(): Promise<void> {
    const { appStructure } = await inquirer.prompt([
      {
        type: 'list',
        name: 'appStructure',
        message: this.prompts.appStructure.question,
        choices: this.prompts.appStructure.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);
    this.answers.appStructure = appStructure;
  }

  private async askTestConfig(): Promise<void> {
    const { mainServiceName, urlPrefix, readinessEndpoint, readinessPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'mainServiceName',
        message: this.prompts.testConfig.mainServiceName.question,
        default: this.prompts.testConfig.mainServiceName.default
      },
      {
        type: 'input',
        name: 'urlPrefix',
        message: this.prompts.testConfig.urlPrefix.question,
        default: this.prompts.testConfig.urlPrefix.default
      },
      {
        type: 'confirm',
        name: 'readinessEndpoint',
        message: this.prompts.testConfig.readinessEndpoint.question,
        default: this.prompts.testConfig.readinessEndpoint.default
      },
      {
        type: 'input',
        name: 'readinessPath',
        message: this.prompts.testConfig.readinessPath.question,
        default: (answers: any) => {
          const basePath = this.prompts.testConfig.readinessPath.default;
          if (answers.urlPrefix && answers.urlPrefix.trim()) {
            const prefix = answers.urlPrefix.trim();
            // Ensure prefix starts with / and doesn't end with /
            const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
            const cleanPrefix = normalizedPrefix.endsWith('/') ? normalizedPrefix.slice(0, -1) : normalizedPrefix;
            return `${cleanPrefix}${basePath}`;
          }
          return basePath;
        },
        when: (answers: any) => answers.readinessEndpoint
      }
    ]);

    this.answers.testDirectory = 'integr8'; // Fixed default
    this.answers.mainServiceName = mainServiceName;
    this.answers.readinessEndpoint = readinessEndpoint;
    this.answers.readinessPath = readinessPath;
    this.answers.urlPrefix = urlPrefix;
  }

  private async askDatabaseSelection(): Promise<void> {
    const { databases } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'databases',
        message: this.prompts.databaseSelection.question,
        choices: this.prompts.databaseSelection.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      }
    ]);
    this.answers.databases = databases;
  }

  private async askDatabaseConfigs(): Promise<void> {
    for (const db of this.answers.databases) {
      if (db === 'none') continue;

      console.log(`\n📊 Configuring ${db.toUpperCase()}:`);

      const { strategy, seeding, seedCommand, seedFile } = await inquirer.prompt([
        {
          type: 'list',
          name: 'strategy',
          message: this.prompts.databaseConfig.strategy.question,
          choices: this.prompts.databaseConfig.strategy.choices.map(choice => ({
            name: `${choice.name} - ${choice.description}`,
            value: choice.value
          }))
        },
        {
          type: 'list',
          name: 'seeding',
          message: this.prompts.databaseConfig.seeding.question,
          choices: this.prompts.databaseConfig.seeding.choices.map(choice => ({
            name: `${choice.name} - ${choice.description}`,
            value: choice.value
          }))
        },
        {
          type: 'input',
          name: 'seedCommand',
          message: this.prompts.databaseConfig.seedCommand.question,
          default: this.prompts.databaseConfig.seedCommand.default,
          when: (answers: any) => answers.seeding === 'command'
        },
        {
          type: 'input',
          name: 'seedFile',
          message: this.prompts.databaseConfig.seedFile.question,
          default: this.prompts.databaseConfig.seedFile.default,
          when: (answers: any) => answers.seeding === 'file'
        }
      ]);

      this.answers.databaseConfigs[db] = {
        strategy,
        seeding,
        seedCommand,
        seedFile
      };
    }
  }

  private async askAdditionalServices(): Promise<void> {
    const { additionalServices } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'additionalServices',
        message: this.prompts.additionalServices.question,
        default: this.prompts.additionalServices.default
      }
    ]);

    this.answers.additionalServices = additionalServices;

    if (additionalServices) {
      await this.askForService();
    }
  }

  private async askForService(): Promise<void> {
    const { serviceType, serviceName, containerName, image } = await inquirer.prompt([
      {
        type: 'list',
        name: 'serviceType',
        message: this.prompts.additionalServices.serviceType.question,
        choices: this.prompts.additionalServices.serviceType.choices.map(choice => ({
          name: `${choice.name} - ${choice.description}`,
          value: choice.value
        }))
      },
      {
        type: 'input',
        name: 'serviceName',
        message: this.prompts.additionalServices.serviceName.question,
        default: this.prompts.additionalServices.serviceName.default
      },
      {
        type: 'input',
        name: 'containerName',
        message: this.prompts.additionalServices.containerName.question,
        default: this.prompts.additionalServices.containerName.default
      },
      {
        type: 'input',
        name: 'image',
        message: this.prompts.additionalServices.image.question,
        default: this.prompts.additionalServices.image.default,
        when: (answers: any) => answers.serviceType === 'custom'
      }
    ]);

    this.answers.services.push({
      type: serviceType,
      name: serviceName,
      containerName: containerName,
      image: serviceType === 'custom' ? image : undefined
    });

    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add another service?',
        default: false
      }
    ]);

    if (addMore) {
      await this.askForService();
    }
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

  private async generateConfig(): Promise<void> {
    const config = this.buildConfig();
    const filename = this.getConfigFilename();
    
    if (fs.existsSync(filename)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: this.prompts.errors.fileExists,
          default: false
        }
      ]);

      if (!overwrite) {
        console.log('❌ Configuration creation cancelled.');
        return;
      }
    }

    try {
      const content = this.formatConfig(config, this.answers.configFileType);
      fs.writeFileSync(filename, content);
      console.log(`📄 Configuration saved to ${filename}`);
      
      // Create test directory with sample test file
      await this.createTestDirectory();
    } catch (error) {
      throw new Error(`${this.prompts.errors.createError} ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildConfig(): Integr8Config {
    const services: ServiceConfig[] = [];

    // Add main app service
    if (this.answers.appStructure === 'single') {
      services.push({
        name: this.answers.mainServiceName,
        type: 'service',
        mode: 'local', // Default to local mode
        command: 'npm start', // Required command for local mode
        ports: [3000],
        healthcheck: this.answers.readinessEndpoint ? { command: this.answers.readinessPath } : undefined,
        containerName: this.answers.mainServiceName,
        dependsOn: this.answers.databases.filter(db => db !== 'none'),
        logging: 'debug' // Enable debug logging for app service by default
      });
    }

    // Add database services
    for (const db of this.answers.databases) {
      if (db === 'none') continue;

      const dbConfig: ServiceConfig = {
        name: db,
        type: db as any,
        mode: 'container', // Default to container mode for databases
        containerName: `my-app-${db}`,
        dependsOn: [],
        environment: this.getDefaultEnvironment(db)
      };

      // Add database-specific configuration
      const dbAnswers = this.answers.databaseConfigs[db];
      if (dbAnswers) {
        dbConfig.dbStrategy = dbAnswers.strategy as any;

        // Add default environment mapping for databases
        dbConfig.envMapping = this.getDefaultEnvMapping(db);
        dbConfig.logging = 'debug'; // Enable debug logging for databases by default

        if (dbAnswers.seeding !== 'none') {
          dbConfig.seed = {
            command: dbAnswers.seedCommand,
            strategy: 'per-file',
            restoreStrategy: 'rollback'
          };
        }
      }

      services.push(dbConfig);
    }

    // Add additional services
    for (const service of this.answers.services) {
      services.push({
        name: service.name,
        type: service.type as any,
        image: service.image || this.getDefaultImage(service.type),
        containerName: service.containerName
      });
    }

    return { 
      services,
      testType: this.answers.testType as 'api' | 'e2e' | 'unit-db' | 'custom',
      testDirectory: join(this.answers.testDirectory, this.answers.testType),
      testFramework: 'jest',
      urlPrefix: this.answers.urlPrefix
    };
  }

  private getDefaultImage(serviceType: string): string {
    const images: Record<string, string> = {
      redis: 'redis:7-alpine',
      mailhog: 'mailhog/mailhog:latest'
    };
    return images[serviceType] || 'custom:latest';
  }

  private getDefaultEnvironment(dbType: string): any {
    const environments: Record<string, any> = {
      postgres: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      },
      mysql: {
        MYSQL_DATABASE: 'myapp',
        MYSQL_USER: 'myuser',
        MYSQL_PASSWORD: 'mypassword',
        MYSQL_ROOT_PASSWORD: 'rootpassword'
      },
      mongo: {
        MONGO_INITDB_DATABASE: 'myapp',
        MONGO_INITDB_ROOT_USERNAME: 'myuser',
        MONGO_INITDB_ROOT_PASSWORD: 'mypassword'
      },
      redis: {
        REDIS_PASSWORD: 'mypassword'
      }
    };
    return environments[dbType] || {};
  }

  private getDefaultEnvMapping(dbType: string): any {
    const mappings: Record<string, any> = {
      postgres: {
        host: 'DB_HOST',
        port: 'DB_PORT',
        username: 'DB_USERNAME',
        password: 'DB_PASSWORD',
        database: 'DB_NAME',
        url: 'DATABASE_URL'
      },
      mysql: {
        host: 'DB_HOST',
        port: 'DB_PORT',
        username: 'DB_USERNAME',
        password: 'DB_PASSWORD',
        database: 'DB_NAME',
        url: 'DATABASE_URL'
      },
      mongo: {
        host: 'MONGO_HOST',
        port: 'MONGO_PORT',
        username: 'MONGO_USERNAME',
        password: 'MONGO_PASSWORD',
        database: 'MONGO_DATABASE',
        url: 'MONGO_URL'
      },
      redis: {
        host: 'REDIS_HOST',
        port: 'REDIS_PORT',
        username: 'REDIS_USERNAME',
        password: 'REDIS_PASSWORD',
        url: 'REDIS_URL'
      }
    };
    return mappings[dbType] || {
      host: 'DB_HOST',
      port: 'DB_PORT',
      username: 'DB_USERNAME',
      password: 'DB_PASSWORD',
      database: 'DB_NAME',
      url: 'DATABASE_URL'
    };
  }

  private getConfigFilename(): string {
    const testType = this.answers.testType || 'api';
    const extensions: Record<string, string> = {
      js: `integr8.${testType}.config.js`,
      json: `integr8.${testType}.config.json`,
      ts: `integr8.${testType}.config.ts`
    };
    return extensions[this.answers.configFileType] || `integr8.${testType}.config.js`;
  }

  private formatConfig(config: Integr8Config, type: string): string {
    const templatePath = join(__dirname, '../../templates', `config.${type}.hbs`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    
    // For JSON template, pass the full config object
    if (type === 'json') {
      return template({ config });
    }
    
    // For JS/TS templates, spread the config properties
    return template({ ...config });
  }

  private async createTestDirectory(): Promise<void> {
    const testDir = this.answers.testDirectory;
    const testType = this.answers.testType;
    const testspath = join(testDir, testType);
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testspath)) {
      fs.mkdirSync(testspath, { recursive: true });
      console.log(`📁 Created test directory: ${testspath}`);
    }

    // Create readiness endpoint test file if specified
    if (this.answers.readinessEndpoint) {
      const endpointName = this.extractEndpointName(this.answers.readinessPath);
      const testFileName = `${endpointName}.get.test.ts`;
      const testFile = join(testspath, testFileName);
      
      if (!fs.existsSync(testFile)) {
        const testContent = this.generateReadinessTest(testspath, this.getConfigFilename());
        fs.writeFileSync(testFile, testContent);
        console.log(`📄 Created readiness test file: ${testFile}`);
      }
    } else {
      // Create sample integration test file as fallback
      const sampleTestFile = join(testspath, 'sample.integration.test.ts');
      if (!fs.existsSync(sampleTestFile)) {
        const sampleTestContent = this.generateSampleTest(testspath, this.getConfigFilename());
        fs.writeFileSync(sampleTestFile, sampleTestContent);
        console.log(`📝 Created sample test file: ${sampleTestFile}`);
      }
    }
  }

  private generateReadinessTest(testspath: string, configPath: string): string {
    const { TestTemplateGenerator } = require('../../core/test-template-generator');
    
    const endpointPath = this.answers.readinessPath;
    const urlPrefix = this.answers.urlPrefix || '';
    const fullPath = buildFullPath(urlPrefix, endpointPath);
    const endpointName = this.extractEndpointName(endpointPath);
    
    // Create a mock route info for the readiness endpoint
    const routeInfo = {
      method: 'GET',
      path: fullPath,
      controller: endpointName,
      group: endpointName
    };
    
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: testspath,
      testFramework: 'jest',
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: configPath,
      routesConfig: {} // Empty for readiness test
    });

    const template = generator.generateSingleEndpointTemplate(routeInfo);
    return template.content;
  }

  private generateSampleTest(testspath: string, configPath: string): string {
    const { TestTemplateGenerator } = require('../../core/test-template-generator');
    
    const generator = TestTemplateGenerator.createSampleGenerator({
      outputDir: testspath,
      testFramework: 'jest',
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: configPath
    });

    const template = generator.generateSampleTest();
    return template.content;
  }

  /**
   * Extracts a clean endpoint name from the path for use in file names and controller names
   * Handles cases like:
   * - "/health" -> "health"
   * - "/ping" -> "ping"
   * - "/health/status" -> "health"
   * - "/is-ready" -> "is-ready"
   * - "/api/v1/health" -> "health"
   */
  private extractEndpointName(endpointPath: string): string {
    let normalizedPath = endpointPath.trim();
    
    // Remove leading slash
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    // Remove trailing slash
    if (normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Split by slash and take the last meaningful part
    const parts = normalizedPath.split('/').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return 'root';
    }
    
    // Return the last part (the actual endpoint name)
    return parts[parts.length - 1];
  }
}
