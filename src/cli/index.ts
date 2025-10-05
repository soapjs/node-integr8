#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';

// Ensure Node.js 18+ for native fetch support
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  throw new Error(`Node.js 18+ is required. Current version: ${nodeVersion}`);
}

// Helper function to find config file
function findConfigFile(testType?: string): string {
  const testTypes = testType ? [testType] : ['api', 'e2e', 'integration'];
  const extensions = ['js', 'json'];
  
  for (const type of testTypes) {
    for (const ext of extensions) {
      const filename = `integr8.${type}.config.${ext}`;
      if (existsSync(filename)) {
        return filename;
      }
    }
  }
  
  // Fallback to legacy format
  for (const ext of extensions) {
    const filename = `integr8.config.${ext}`;
    if (existsSync(filename)) {
      return filename;
    }
  }
  
  return 'integr8.api.config.js'; // Default
}

const program = new Command();

const packageJson = readFileSync(require.resolve('../../package.json'), 'utf8');

program
  .name('integr8')
  .description('Framework-agnostic integration testing with Testcontainers')
  .version(JSON.parse(packageJson).version);

program
  .command('init')
  .description('Initialize integr8 in your project')
  // .option('-t, --template <template>', 'Template to use (express, nest, fastify)')
  .option('-d, --test-dir <path>', 'Test directory path', 'integr8')
  .option('-f, --format <format>', 'Config file format (js, json)', 'js')
  // .option('-a, --app-type <type>', 'App type (docker-compose, local, container)', 'docker-compose')
  .option('--test-type <type>', 'Test type (api, e2e, integration, custom)', 'api')
  .option('-i, --interactive', 'Use interactive mode (default if no template specified)')
  .action(async (options) => {
    const { initCommand } = await import('./commands/init');
    await initCommand(options);
  });

program
  .command('up')
  .description('Start the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('-d, --detach', 'Run in detached mode')
  .option('--compose-file <path>', 'Custom Docker Compose file (overrides config)')
  .option('--local <services...>', 'Override specified services to local mode')
  .option('--fast', 'Skip health checks for faster startup')
  .action(async (options) => {
    const { upCommand } = await import('./commands/up');
    await upCommand(options);
  });

program
  .command('down')
  .description('Stop the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .action(async (options) => {
    const { downCommand } = await import('./commands/down');
    await downCommand(options);
  });

program
  .command('test')
  .description('Run integration tests')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-w, --watch', 'Watch mode')
  .action(async (options) => {
    const { testCommand: runCommand } = await import('./commands/test');
    await runCommand(options);
  });

program
  .command('ci')
  .description('Run integration tests in CI mode (up + test + down)')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-t, --timeout <ms>', 'Total timeout for CI run', '600000')
  .option('--verbose', 'Verbose output')
  .option('--no-cleanup', 'Skip cleanup (for debugging)')
  .action(async (options) => {
    const { ciCommand } = await import('./commands/ci');
    await ciCommand(options);
  });



program
  .command('scan')
  .description('Scan service endpoints and generate tests')
  .option('--command <cmd>', 'Command to run for endpoint discovery (e.g., "npm run list-routes")')
  .option('--json <path>', 'Path to JSON file with endpoints')
  .option('--type <type>', 'Scan type: all, only-new', 'all')
  .option('--output <dir>', 'Output directory for tests')
  .option('--config <path>', 'Path to integr8 config file')
  .option('--format <format>', 'Output format: json, yaml', 'json')
  .option('--timeout <ms>', 'Timeout for command execution in milliseconds', '10000')
  .option('--decorators', 'Scan decorators instead of using discovery command')
  .option('--generate-tests', 'Generate test files for discovered endpoints')
  .action(async (options) => {
    const { ScanCommand } = await import('./commands/scan');
    const scanCommand = new ScanCommand();
    await scanCommand.execute(options);
  });

// Add cleanup command with lazy loading
(async () => {
  const { cleanupCommand } = await import('./commands/cleanup');
  program.addCommand(cleanupCommand);
})();

program
  .command('create')
  .description('Create test files from URLs')
  .option('--test-type <type>', 'Test type (currently only api supported)', 'api')
  .option('--test-framework <framework>', 'Test framework (jest, vitest)', 'jest')
  .option('--test-dir <dir>', 'Test directory path')
  .option('--urls <path>', 'Path to JSON file with URLs')
  .option('--url <url>', 'Single URL to create test for')
  .option('--method <method>', 'HTTP method (GET, POST, PUT, DELETE, etc.)', 'GET')
  .option('--body <json>', 'Request body as JSON string')
  .option('--query-params <json>', 'Query parameters as JSON string')
  .option('--path-params <json>', 'Path parameters as JSON string')
  .option('--expected-status <number>', 'Expected HTTP status code')
  .option('--expected-response <json>', 'Expected response as JSON string')
  .option('--config <path>', 'Path to integr8 config file')
  .action(async (options) => {
    const { CreateCommand } = await import('./commands/create');
    const createCommand = new CreateCommand();
    await createCommand.execute(options);
  });

program.parse();
