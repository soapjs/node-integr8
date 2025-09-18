import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function initCommand(options: { template: string }) {
  const spinner = ora('Initializing integr8...').start();

  try {
    // Check if config already exists
    if (existsSync('integr8.config.ts')) {
      spinner.fail('integr8.config.ts already exists');
      return;
    }

    // Create config file based on template
    const configContent = getConfigTemplate(options.template);
    writeFileSync('integr8.config.ts', configContent);

    // Create sample test file
    const testContent = getTestTemplate(options.template);
    writeFileSync('tests/sample.integration.test.ts', testContent);

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
    console.log('1. Review integr8.config.ts');
    console.log('2. Run: integr8 up');
    console.log('3. Run: integr8 run');

  } catch (error) {
    spinner.fail('Failed to initialize integr8');
    console.error(error);
    process.exit(1);
  }
}

function getConfigTemplate(template: string): string {
  const baseConfig = `import { createConfig, createPostgresService, createAppConfig, createSeedConfig, createExpressAdapter } from 'integr8';

export default createConfig({
  services: [
    createPostgresService(),
  ],
  app: createAppConfig({
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  seed: createSeedConfig('npm run seed'),
  dbStrategy: 'savepoint',
  adapters: [
    createExpressAdapter(),
  ],
});`;

  switch (template) {
    case 'nest':
      return baseConfig.replace('createExpressAdapter()', 'createNestAdapter()');
    case 'fastify':
      return baseConfig.replace('createExpressAdapter()', 'createFastifyAdapter()');
    default:
      return baseConfig;
  }
}

function getTestTemplate(template: string): string {
  return `import { defineScenario, setupEnvironment, teardownEnvironment } from 'integr8';

// Global setup
beforeAll(async () => {
  const config = require('../integr8.config.ts').default;
  await setupEnvironment(config);
});

// Global teardown
afterAll(async () => {
  await teardownEnvironment();
});

describe('Sample Integration Tests', () => {
  test('should respond to health check', async ({ http }) => {
    const response = await http.get('/health');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
  });

  test('should create and retrieve user', async ({ http, db }) => {
    // Create user
    const createResponse = await http.post('/users', {
      name: 'John Doe',
      email: 'john@example.com'
    });
    
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty('id');
    
    const userId = createResponse.data.id;
    
    // Retrieve user
    const getResponse = await http.get(\`/users/\${userId}\`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.data).toHaveProperty('name', 'John Doe');
  });
});`;
}
