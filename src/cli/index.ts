#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { initCommand } from './commands/init';
import { upCommand } from './commands/up';
import { downCommand } from './commands/down';
import { runCommand } from './commands/run';
import { addEndpointCommand } from './commands/add-endpoint';
import { ciCommand } from './commands/ci';
import { ScanCommand } from './commands/scan';

// Helper function to find config file
function findConfigFile(testType?: string): string {
  const testTypes = testType ? [testType] : ['api', 'e2e', 'unit-db', 'custom'];
  const extensions = ['js', 'json', 'ts'];
  
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

program
  .name('integr8')
  .description('Framework-agnostic integration testing with Testcontainers')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize integr8 in your project')
  .option('-t, --template <template>', 'Template to use (express, nest, fastify)')
  .option('-d, --test-dir <path>', 'Test directory path', 'integr8')
  .option('-f, --format <format>', 'Config file format (js, json, ts)', 'js')
  .option('-a, --app-type <type>', 'App type (docker-compose, local, container)', 'docker-compose')
  .option('--test-type <type>', 'Test type (api, e2e, unit-db, custom)', 'api')
  .option('-i, --interactive', 'Use interactive mode (default if no template specified)')
  .action(initCommand);

program
  .command('up')
  .description('Start the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, unit-db, custom)')
  .option('-d, --detach', 'Run in detached mode')
  .option('--compose-file <path>', 'Custom Docker Compose file (overrides config)')
  .option('--local <services...>', 'Override specified services to local mode')
  .option('--fast', 'Skip health checks for faster startup')
  .action(upCommand);

program
  .command('down')
  .description('Stop the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, unit-db, custom)')
  .action(downCommand);

program
  .command('run')
  .description('Run integration tests')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, unit-db, custom)')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-w, --watch', 'Watch mode')
  .action(runCommand);

program
  .command('ci')
  .description('Run integration tests in CI mode (up + run + down)')
  .option('-c, --config <path>', 'Path to integr8 config file', findConfigFile())
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, unit-db, custom)')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-t, --timeout <ms>', 'Total timeout for CI run', '600000')
  .option('--verbose', 'Verbose output')
  .option('--no-cleanup', 'Skip cleanup (for debugging)')
  .action(ciCommand);


program
  .command('add-endpoint')
  .description('Add a single endpoint test to an existing test file')
  .argument('<endpoint>', 'Endpoint to add (e.g., "GET /users/:id")')
  .option('-f, --file <path>', 'Target test file (auto-detected if not specified)')
  .option('-c, --controller <name>', 'Controller name for auto-detection')
  .option('--scenarios', 'Generate multiple test scenarios', false)
  .option('--no-scenarios', 'Generate single test scenario', true)
  .option('--backup', 'Create backup before modification', true)
  .option('--no-backup', 'Skip backup creation')
  .option('--dry-run', 'Show what would be added without making changes', false)
  .action(addEndpointCommand);

program
  .command('scan')
  .description('Scan service endpoints and generate tests')
  .option('--command <cmd>', 'Command to run for endpoint discovery (e.g., "npm run list-routes")')
  .option('--json <path>', 'Path to JSON file with endpoints')
  .option('--type <type>', 'Scan type: all, only-new', 'all')
  .option('--output <dir>', 'Output directory for tests')
  .option('--config <path>', 'Path to integr8 config file')
  .option('--format <format>', 'Output format: json, yaml', 'json')
  .action(async (options) => {
    const scanCommand = new ScanCommand();
    await scanCommand.execute(options);
  });

program.parse();
