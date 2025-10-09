/**
 * Template generation utilities for init command
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

/**
 * Registers common Handlebars helpers
 */
export function registerHandlebarsHelpers(): void {
  // JSON formatter helper
  Handlebars.registerHelper('json', (context: any) => {
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
          const formattedValue = formatValue(val, indent + 1);
          return `${spaces}  ${formattedKey}: ${formattedValue}`;
        }).join(',\n');
        
        return `{\n${items}\n${spaces}}`;
      }
      
      return JSON.stringify(value);
    };
    
    return formatValue(context);
  });
  
  // Check if object has content
  Handlebars.registerHelper('hasContent', function(this: any, context: any, options: any) {
    if (!context || typeof context !== 'object') {
      return options.inverse(this);
    }
    
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

  // Relative path helper
  Handlebars.registerHelper('relativePath', (from: string, to: string) => {
    if (!from || !to) return to || '';
    const relative = require('path').relative(require('path').dirname(from), to);
    return relative.startsWith('.') ? relative : './' + relative;
  });

  // Equality helper
  Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

  // Lowercase helper
  Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());

  // EndsWith helper
  Handlebars.registerHelper('endsWith', (str: string, suffix: string) => str.endsWith(suffix));
}

/**
 * Gets adapter name from template
 */
export function getAdapterName(template: string): string {
  switch (template) {
    case 'nest':
      return 'Nest';
    case 'fastify':
      return 'Fastify';
    default:
      return 'Express';
  }
}

/**
 * Creates config data structure
 */
export function createConfigData(
  template: string,
  testDir: string,
  appType: string,
  testType: string
): any {
  const adapterName = getAdapterName(template);
  
  return {
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
}

/**
 * Generates config template content
 */
export function generateConfigTemplate(
  template: string,
  format: string,
  testDir: string,
  appType: string,
  testType: string
): string {
  registerHandlebarsHelpers();
  
  const templatePath = join(__dirname, '../../templates', `config.${format}.hbs`);
  const templateSource = readFileSync(templatePath, 'utf8');
  const compiledTemplate = Handlebars.compile(templateSource);
  
  const config = createConfigData(template, testDir, appType, testType);
  
  return compiledTemplate({ config, ...config });
}

/**
 * Generates test template content
 */
export function generateTestTemplate(template: string, configFile: string): string {
  registerHandlebarsHelpers();

  const templatePath = join(__dirname, '../../templates/endpoint.test.hbs');
  const templateSource = readFileSync(templatePath, 'utf8');
  const compiledTemplate = Handlebars.compile(templateSource);

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

/**
 * Creates Docker files from templates
 */
export async function createDockerFiles(template: string): Promise<void> {
  registerHandlebarsHelpers();
  
  // Create Dockerfile.integr8
  const dockerfileTemplate = join(__dirname, '../../templates/docker.file.hbs');
  const dockerfileTemplateSource = readFileSync(dockerfileTemplate, 'utf8');
  const dockerfileTemplateCompiled = Handlebars.compile(dockerfileTemplateSource);
  const dockerfileContent = dockerfileTemplateCompiled({ template });
  writeFileSync('Dockerfile.integr8', dockerfileContent);
  
  // Create docker-compose.integr8.yml
  const dockerComposeTemplate = join(__dirname, '../../templates/docker.compose.hbs');
  const dockerComposeTemplateSource = readFileSync(dockerComposeTemplate, 'utf8');
  const dockerComposeTemplateCompiled = Handlebars.compile(dockerComposeTemplateSource);
  const composeContent = dockerComposeTemplateCompiled({ template });
  writeFileSync('docker-compose.integr8.yml', composeContent);
  
  console.log('✅ Created Dockerfile.integr8 and docker-compose.integr8.yml');
}

