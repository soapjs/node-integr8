import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import Handlebars from 'handlebars';
import { InteractiveInit } from './init-interactive';

export async function initCommand(options: { 
  template?: string;
  testDir?: string;
  format?: string;
  appType?: string;
  testType?: 'api' | 'e2e' | 'unit-db' | 'custom';
  interactive?: boolean;
}) {
  // If interactive mode is requested or no template is provided, use interactive flow
  if (options.interactive || !options.template) {
    const interactiveInit = new InteractiveInit();
    await interactiveInit.run();
    return;
  }

  // Legacy non-interactive flow
  const spinner = ora('Initializing integr8...').start();

  try {
    // Set defaults
    const testDir = options.testDir || 'integr8';
    const configFormat = options.format || 'js';
    const appType = options.appType || 'docker-compose';
    const testType = options.testType || 'api';
    const configFile = `integr8.${testType}.config.${configFormat}`;

    // Check if config already exists
    if (existsSync(configFile)) {
      spinner.fail(`${configFile} already exists`);
      return;
    }

    // Create config file based on template
    const configContent = getConfigTemplate(options.template, configFormat, testDir, appType, testType);
    writeFileSync(configFile, configContent);

    // Create Docker files if needed
    if (appType === 'docker-compose') {
      await createDockerFiles(options.template);
    }

    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create sample test file in test type subdirectory
    const relativeConfigPath = join('..', configFile);
    const testContent = getTestTemplate(options.template, relativeConfigPath);
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

    spinner.succeed('integr8 initialized successfully!');
    
    console.log(chalk.green('\n✅ Setup complete!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log(`1. Review ${configFile}`);
    console.log(`2. Review ${testFilePath}`);
    console.log('3. Run: integr8 up');
    console.log('4. Run: integr8 run');

  } catch (error) {
    spinner.fail('Failed to initialize integr8');
    console.error(error);
    process.exit(1);
  }
}

function getConfigTemplate(template: string, format: string, testDir: string, appType: string, testType: string): string {
  const adapterName = getAdapterName(template);
  
  // Setup Handlebars helpers
  Handlebars.registerHelper('json', (context: any) => {
    return JSON.stringify(context, null, 2);
  });
  
  // Load template
  const templatePath = join(__dirname, '../../templates', `config.${format}.hbs`);
  const templateSource = readFileSync(templatePath, 'utf8');
  const compiledTemplate = Handlebars.compile(templateSource);
  
  // Prepare config data
  const config = {
    services: [
      {
        name: 'postgres',
        type: 'postgres',
        image: 'postgres:15',
        ports: [5432],
        environment: {
          POSTGRES_DB: 'testdb',
          POSTGRES_USER: 'testuser',
          POSTGRES_PASSWORD: 'testpass'
        }
      },
      getAppServiceConfig(appType, adapterName)
    ],
    testType: testType,
    testDirectory: join(testDir, testType),
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
    configPath: configFile
  };

  return compiledTemplate(templateData);
}

function getAppServiceConfig(appType: string, adapterName: string): any {
  switch (appType) {
    case 'docker-compose':
      return {
        name: 'app',
        type: 'service',
        mode: 'container',
        image: 'my-app:latest',
        ports: [3000],
        command: 'npm start',
        healthcheck: {
          command: '/health'
        },
        containerName: 'app',
        dependsOn: ['postgres']
      };
    case 'local':
      return {
        name: 'app',
        type: 'service',
        mode: 'local',
        command: 'npm start',
        healthcheck: {
          command: '/health'
        },
        ports: [3000],
        workingDirectory: '.',
        dependsOn: ['postgres']
      };
    case 'container':
    default:
      return {
        name: 'app',
        type: 'service',
        mode: 'container',
        image: 'node:18',
        command: 'npm start',
        healthcheck: {
          command: '/health'
        },
        ports: [3000],
        dependsOn: ['postgres']
      };
  }
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
