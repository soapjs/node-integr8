#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { initCommand } from './commands/init';
import { upCommand } from './commands/up';
import { downCommand } from './commands/down';
import { runCommand } from './commands/run';
import { generateCommand } from './commands/generate';
import { addEndpointCommand } from './commands/add-endpoint';
import { ciCommand } from './commands/ci';

const program = new Command();

program
  .name('integr8')
  .description('Framework-agnostic integration testing with Testcontainers')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize integr8 in your project')
  .option('-t, --template <template>', 'Template to use (express, nest, fastify)', 'express')
  .action(initCommand);

program
  .command('up')
  .description('Start the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file', 'integr8.config.ts')
  .option('-d, --detach', 'Run in detached mode')
  .action(upCommand);

program
  .command('down')
  .description('Stop the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file', 'integr8.config.ts')
  .action(downCommand);

program
  .command('run')
  .description('Run integration tests')
  .option('-c, --config <path>', 'Path to integr8 config file', 'integr8.config.ts')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-w, --watch', 'Watch mode')
  .action(runCommand);

program
  .command('ci')
  .description('Run integration tests in CI mode (up + run + down)')
  .option('-c, --config <path>', 'Path to integr8 config file', 'integr8.config.ts')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-t, --timeout <ms>', 'Total timeout for CI run', '600000')
  .option('--verbose', 'Verbose output')
  .option('--no-cleanup', 'Skip cleanup (for debugging)')
  .action(ciCommand);

program
  .command('generate')
  .description('Generate test templates from route discovery command')
  .option('-c, --command <command>', 'Command to discover routes (overrides config)')
  .option('-o, --output <path>', 'Output directory for test files', './tests/integration')
  .option('-f, --framework <framework>', 'Test framework (jest|vitest)', 'jest')
  .option('--setup', 'Include setup/teardown in templates', true)
  .option('--no-setup', 'Exclude setup/teardown from templates')
  .option('--teardown', 'Include teardown in templates', true)
  .option('--no-teardown', 'Exclude teardown from templates')
  .option('-t, --type <type>', 'Template type (controller|endpoint)', 'controller')
  .option('--scenarios', 'Generate multiple test scenarios per endpoint', false)
  .option('--no-scenarios', 'Generate single test per endpoint', true)
  .option('--format <format>', 'Output format (json|text|auto)')
  .option('--timeout <ms>', 'Command timeout in milliseconds')
  .option('--cwd <path>', 'Working directory for command execution')
  .option('--config <path>', 'Path to integr8 config file', 'integr8.config.ts')
  .action(generateCommand);

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

program.parse();
