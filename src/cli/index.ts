#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';

// Ensure Node.js 18+ for native fetch support
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  throw new Error(`Node.js 18+ is required. Current version: ${nodeVersion}`);
}

/**
 * Find config file with the following priority:
 * 1. Explicit --config flag (handled by caller)
 * 2. .integr8rc file
 * 3. package.json "integr8.config" field
 * 4. Auto-detect by testType
 * 5. Fallback to common names
 */
function findConfigFile(testType?: string, explicitPath?: string): string | null {
  // 1. Explicit path takes highest priority
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`Config file not found: ${explicitPath}`);
    }
    return explicitPath;
  }
  
  // 2. Check .integr8rc
  if (existsSync('.integr8rc')) {
    try {
      const rcContent = readFileSync('.integr8rc', 'utf8');
      const rc = JSON.parse(rcContent);
      if (rc.defaultConfig && existsSync(rc.defaultConfig)) {
        console.log(`Using config from .integr8rc: ${rc.defaultConfig}`);
        return rc.defaultConfig;
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse .integr8rc, ignoring');
    }
  }
  
  // 3. Check package.json
  if (existsSync('package.json')) {
    try {
      const pkgContent = readFileSync('package.json', 'utf8');
      const pkg = JSON.parse(pkgContent);
      if (pkg.integr8?.config && existsSync(pkg.integr8.config)) {
        console.log(`Using config from package.json: ${pkg.integr8.config}`);
        return pkg.integr8.config;
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse package.json, ignoring');
    }
  }
  
  // 4. Auto-detect by testType
  const testTypes = testType ? [testType] : ['api', 'e2e', 'integration'];
  const extensions = ['js', 'json'];
  
  for (const type of testTypes) {
    for (const ext of extensions) {
      const filename = `integr8.${type}.config.${ext}`;
      if (existsSync(filename)) {
        console.log(`Auto-detected config: ${filename}`);
        return filename;
      }
    }
  }
  
  // No config found
  return null;
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
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('-d, --detach', 'Run in detached mode')
  .option('--compose-file <path>', 'Custom Docker Compose file (overrides config)')
  .option('--local <services...>', 'Override specified services to local mode')
  .option('--fast', 'Skip health checks for faster startup')
  .action(async (options) => {
    const configFile = findConfigFile(options.testType, options.config);
    if (!configFile) {
      console.error('❌ No integr8 config file found. Run: npx integr8 init');
      process.exit(1);
    }
    options.config = configFile;
    
    const { upCommand } = await import('./commands/up');
    await upCommand(options);
  });

program
  .command('down')
  .description('Stop the test environment')
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .action(async (options) => {
    const configFile = findConfigFile(options.testType, options.config);
    if (!configFile) {
      console.error('❌ No integr8 config file found. Run: npx integr8 init');
      process.exit(1);
    }
    options.config = configFile;
    
    const { downCommand } = await import('./commands/down');
    await downCommand(options);
  });

program
  .command('test')
  .description('Run integration tests')
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-w, --watch', 'Watch mode')
  .action(async (options) => {
    const configFile = findConfigFile(options.testType, options.config);
    if (!configFile) {
      console.error('❌ No integr8 config file found. Run: npx integr8 init');
      process.exit(1);
    }
    options.config = configFile;
    
    const { testCommand: runCommand } = await import('./commands/test');
    await runCommand(options);
  });

program
  .command('ci')
  .description('Run integration tests in CI mode (up + test + down)')
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('-p, --pattern <pattern>', 'Test pattern to run')
  .option('-t, --timeout <ms>', 'Total timeout for CI run', '600000')
  .option('--verbose', 'Verbose output')
  .option('--no-cleanup', 'Skip cleanup (for debugging)')
  .action(async (options) => {
    const configFile = findConfigFile(options.testType, options.config);
    if (!configFile) {
      console.error('❌ No integr8 config file found. Run: npx integr8 init');
      process.exit(1);
    }
    options.config = configFile;
    
    const { ciCommand } = await import('./commands/ci');
    await ciCommand(options);
  });



program
  .command('scan')
  .description('Scan service endpoints and generate tests')
  .option('--command <cmd>', 'Command to run for endpoint discovery (e.g., "npm run list-routes")')
  .option('--decorators', 'Scan decorators instead of using discovery command')
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration, custom)')
  .option('--json <path>', 'Path to JSON file with endpoints')
  .option('--format <format>', 'Output format: json, yaml', 'json')
  .option('--type <type>', 'Scan type: all, only-new', 'all')
  .option('--output <dir>', 'Output directory for tests')
  .option('--timeout <ms>', 'Timeout for command execution in milliseconds', '10000')
  .option('--generate-tests', 'Generate test files for discovered endpoints')
  .option('--file <path>', 'Scan specific file (only with --decorators)')
  .option('--dir <path>', 'Scan specific directory (only with --decorators)')
  .action(async (options) => {
    // Config is optional for scan - some options don't need it
    if (options.config || options.testType || (!options.command && !options.json)) {
      const configFile = findConfigFile(options.testType, options.config);
      if (!configFile) {
        console.error('❌ No integr8 config file found. Run: npx integr8 init');
        process.exit(1);
      }
      options.config = configFile;
    }
    
    const { ScanCommand } = await import('./commands/scan');
    const scanCommand = new ScanCommand();
    await scanCommand.execute(options);
  });

program
  .command('coverage')
  .description('Analyze endpoint test coverage')
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .option('--test-type <type>', 'Test type to auto-detect config (api, e2e, integration)', 'api')
  .option('--threshold <number>', 'Coverage threshold percentage (overrides config)')
  .option('--output <path>', 'Output path for JSON report (overrides config)')
  .action(async (options) => {
    const configFile = findConfigFile(options.testType, options.config);
    if (!configFile) {
      console.error('❌ No integr8 config file found. Run: npx integr8 init');
      process.exit(1);
    }
    options.config = configFile;
    
    // Parse threshold as number if provided
    if (options.threshold) {
      options.threshold = parseFloat(options.threshold);
    }
    
    const { CoverageCommand } = await import('./commands/coverage');
    const coverageCommand = new CoverageCommand();
    await coverageCommand.execute(options);
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
  .option('-c, --config <path>', 'Path to integr8 config file (optional, auto-detected)')
  .action(async (options) => {
    // Config is optional for create - it's used for defaults but not required
    const configFile = findConfigFile(options.testType, options.config);
    if (!configFile) {
      console.error('❌ No integr8 config file found. Run: npx integr8 init');
      process.exit(1);
    }
    options.config = configFile;
    
    const { CreateCommand } = await import('./commands/create');
    const createCommand = new CreateCommand();
    await createCommand.execute(options);
  });

program.parse();
