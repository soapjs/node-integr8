#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { initCommand } from './commands/init';
import { upCommand } from './commands/up';
import { downCommand } from './commands/down';
import { runCommand } from './commands/run';

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

program.parse();
