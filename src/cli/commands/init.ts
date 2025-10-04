import chalk from 'chalk';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { InteractiveInit } from './init-interactive';

export async function initCommand(options: { 
  template?: string;
  testDir?: string;
  format?: 'js' | 'json';
  appType?: string;
  testType?: 'api' | 'e2e' | 'integration' | 'custom';
  interactive?: boolean;
}) {
  // If interactive mode is requested or no template is provided, use interactive flow
  if (options.interactive) {
    const interactiveInit = new InteractiveInit();
    await interactiveInit.run();
    return;
  }

  // Legacy non-interactive flow
  console.log(chalk.blue('Initializing integr8...'));

  try {
    // Set defaults
    const template = options.template || 'express';
    const testDir = options.testDir || 'integr8/tests';
    const configFormat = options.format || 'js';
    const appType = options.appType || 'container';
    const testType = options.testType || 'api';
    const configFile = `integr8.${testType}.config.${configFormat}`;

    // Check if config already exists
    if (existsSync(configFile)) {
      console.error(chalk.red(`❌ ${configFile} already exists`));
      return;
    }

    // Create config file based on template
    const configContent = getConfigTemplate(template, configFormat, testDir, appType, testType);
    writeFileSync(configFile, configContent);

    // Create Docker files if needed
    if (appType === 'docker-compose') {
      await createDockerFiles(template);
    }

    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create sample test file in test type subdirectory
    const relativeConfigPath = join('..', configFile);
    const testContent = getTestTemplate(template, relativeConfigPath);
    const testTypeDir = join(testDir, testType);
    const testFilePath = join(testTypeDir, 'sample.integration.test.ts');
    
    // Ensure test type directory exists
    if (!existsSync(testTypeDir)) {
      mkdirSync(testTypeDir, { recursive: true });
    }
    writeFileSync(testFilePath, testContent);

    // Create .gitignore entry
    const gitignoreContent = '\n# integr8\ntest-artifacts/\n';
    if (existsSync('.gitignore')) {
      const currentGitignore = require('fs').readFileSync('.gitignore', 'utf8');
      if (!currentGitignore.includes('test-artifacts/')) {
        require('fs').appendFileSync('.gitignore', gitignoreContent);
      }
    } else {
      writeFileSync('.gitignore', gitignoreContent);
    }

    console.log(chalk.green('✅ integr8 initialized successfully!'));
    
    console.log(chalk.green('\n✅ Setup complete!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log(`1. Review ${configFile}`);
    console.log(`2. Review ${testFilePath}`);
    console.log('3. Run: integr8 up');
    console.log('4. Run: integr8 run');

  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize integr8'));
    console.error(error);
    process.exit(1);
  }
}

function getConfigTemplate(template: string, format: string, testDir: string, appType: string, testType: string): string {
  const adapterName = getAdapterName(template);
  
  // Setup Handlebars helpers
  Handlebars.registerHelper('json', (context: any) => {
    // Custom JSON stringify that removes quotes from object keys and formats nicely
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
        
        // Always use multi-line format for better readability
        const items = entries.map(([key, val]) => {
          const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
          const formattedValue = formatValue(val, indent + 1);
          return `${spaces}  ${formattedKey}: ${formattedValue}`;
        }).join(',\n');
        
        return `{\n${items}\n${spaces}}`;
      }
      
      return JSON.stringify(value);
    };
    
    return formatValue(context);
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

  // Register helper for relative paths
  Handlebars.registerHelper('relativePath', (from: string, to: string) => {
    if (!from || !to) return to || '';
    const relative = require('path').relative(require('path').dirname(from), to);
    return relative.startsWith('.') ? relative : './' + relative;
  });

  // Register helper for equality comparison
  Handlebars.registerHelper('eq', (a: any, b: any) => {
    return a === b;
  });

  
  // Load template
  const templatePath = join(__dirname, '../../templates', `config.${format}.hbs`);
  const templateSource = readFileSync(templatePath, 'utf8');
  const compiledTemplate = Handlebars.compile(templateSource);
  
  // Prepare config data with new structure
  const config = {
    services: [
      {
        name: 'app',
        category: 'service',
        type: 'http',
        mode: appType === 'local' ? 'local' : 'container',
        communicationType: 'http',
        http: {
          baseUrl: 'http://localhost',
          port: 3000,
          prefix: '/api'
        },
        framework: adapterName.toLowerCase(),
        readiness: {
          enabled: true,
          endpoint: '/health'
        },
        ...(appType === 'local' ? {
          local: {
            command: 'npm start',
            cwd: '.'
          }
        } : {
          container: {
            image: appType === 'docker-compose' ? 'my-app:latest' : 'node:18',
            containerName: 'app',
            ports: [{ host: 3000, container: 3000 }],
            environment: {}
          }
        })
      }
    ],
    databases: [
      {
        name: 'postgres',
        category: 'database',
        type: 'postgres',
        mode: 'container',
        strategy: 'savepoint',
        seeding: {
          strategy: 'once'
        },
        container: {
          image: 'postgres:15',
          containerName: 'postgres',
          ports: [{ host: 5432, container: 5432 }],
          environment: {
            POSTGRES_DB: 'testdb',
            POSTGRES_USER: 'testuser',
            POSTGRES_PASSWORD: 'testpass'
          },
          envMapping: {
            host: 'DB_HOST',
            port: 'DB_PORT',
            username: 'DB_USERNAME',
            password: 'DB_PASSWORD',
            database: 'DB_NAME',
            url: 'DATABASE_URL'
          }
        }
      }
    ],
    testType: testType,
    testDir: join(testDir, testType),
    testFramework: 'jest'
  };
  
  return compiledTemplate({ config, ...config });
}

function getAdapterName(template: string): string {
  switch (template) {
    case 'nest':
      return 'Nest';
    case 'fastify':
      return 'Fastify';
    default:
      return 'Express';
  }
}

function getTestTemplate(template: string, configFile: string): string {
  // Setup Handlebars helpers
  Handlebars.registerHelper('lowercase', (str: string) => {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('eq', (a: string, b: string) => {
    return a === b;
  });

  Handlebars.registerHelper('endsWith', (str: string, suffix: string) => {
    return str.endsWith(suffix);
  });

  Handlebars.registerHelper('relativePath', (from: string, to: string) => {
    if (!from || !to) return to || '';
    const relative = require('path').relative(require('path').dirname(from), to);
    return relative.startsWith('.') ? relative : './' + relative;
  });

  Handlebars.registerHelper('json', (context: any) => {
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
    
    return formatValue(context);
  });

  // Load the endpoint template
  const templatePath = join(__dirname, '../../templates/endpoint.test.hbs');
  const templateSource = readFileSync(templatePath, 'utf8');
  const compiledTemplate = Handlebars.compile(templateSource);

  // Create template data for health check endpoint
  const templateData = {
    endpoint: {
      method: 'GET',
      path: '/health'
    },
    imports: {
      '@soapjs/integr8': ['defineScenario', 'setupEnvironment', 'teardownEnvironment', 'getEnvironmentContext']
    },
    setup: true,
    teardown: true,
    configPath: configFile,
    testFilePath: 'integr8/tests/api/sample.integration.test.ts'
  };

  return compiledTemplate(templateData);
}


async function createDockerFiles(template: string): Promise<void> {
  // Create Dockerfile.integr8
  const dockerfileContent = getDockerfileTemplate(template);
  writeFileSync('Dockerfile.integr8', dockerfileContent);
  
  // Create docker-compose.integr8.yml
  const composeContent = getDockerComposeTemplate(template);
  writeFileSync('docker-compose.integr8.yml', composeContent);
  
  console.log('✅ Created Dockerfile.integr8 and docker-compose.integr8.yml');
}

function getDockerfileTemplate(template: string): string {
  return `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]`;
}

function getDockerComposeTemplate(template: string): string {
  return `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: \${DB_NAME:-soapjs_test}
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-password}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - integr8-network

  app:
    build:
      context: .
      dockerfile: Dockerfile.integr8
    ports:
      - "\${APP_PORT:-3000}:3000"
    environment:
      - NODE_ENV=test
      - TEST_MODE=1
      - DATABASE_URL=postgresql://\${DB_USER:-postgres}:\${DB_PASSWORD:-password}@postgres:5432/\${DB_NAME:-soapjs_test}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - integr8-network

networks:
  integr8-network:
    driver: bridge`;
}
