import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Integr8Config } from '../../types';
import { jestConfigGenerator } from '../../utils/jest-config-generator';
import { buildFullPath } from '../../utils/url.utils';

export async function runCommand(options: { config: string; testType?: string; pattern?: string; watch: boolean }) {
  console.log(chalk.blue('📋 Loading configuration...'));

  try {
    // Load configuration
    const configPath = resolve(options.config);
    if (!existsSync(configPath)) {
      console.error(chalk.red(`❌ Configuration file not found: ${configPath}`));
      process.exit(1);
    }

    // Load configuration file
    let config: Integr8Config;
    
    if (configPath.endsWith('.ts')) {
      // For TypeScript files, use dynamic import
      const configModule = await import(configPath);
      config = configModule.default || configModule;
    } else {
      // For JavaScript/JSON files, use require
      delete require.cache[configPath];
      const configModule = require(configPath);
      config = configModule.default || configModule;
    }

    if (!config.testDirectory) {
      console.error(chalk.red('❌ No test directory specified in configuration'));
      process.exit(1);
    }

    console.log(chalk.blue('🧪 Running integration tests...'));

    // Check if environment is already running
    const testDir = resolve(config.testDirectory);
    
    if (!existsSync(testDir)) {
      console.error(chalk.red(`❌ Test directory not found: ${testDir}`));
      process.exit(1);
    }

    // Check if environment is running by trying to connect to the app
    const appService = config.services?.find(s => s.type === 'service' || s.name === 'app');
    let environmentRunning = false;
    
    if (appService) {
      const appPort = appService.ports?.[0] || 3000;
      
      // Build health check URL using config
      let healthEndpoint = '/health'; // default
      
      // Check if service has custom health check
      if (appService.healthcheck?.command) {
        // Extract URL from health check command (e.g., "curl -f http://localhost:3000/api/v1/health")
        const healthCheckMatch = appService.healthcheck.command.match(/http:\/\/localhost:\d+(\/[^\s]*)/);
        if (healthCheckMatch) {
          healthEndpoint = healthCheckMatch[1];
        }
      }
      
      // Add URL prefix if configured
      const url = config.urlPrefix ? buildFullPath(config.urlPrefix, healthEndpoint) : '';
      const fullHealthUrl = `http://localhost:${appPort}${url}`;
      
      try {
        const response = await fetch(fullHealthUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        
        if (response.ok) {
          environmentRunning = true;
          console.log(chalk.green(`✅ Environment detected at ${fullHealthUrl}, running tests...`));
        } else {
          console.warn(chalk.yellow(`⚠️  Environment might not be running (${response.status}). Consider running "integr8 up" first.`));
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Environment not detected at ${fullHealthUrl}. Consider running "integr8 up" first.`));
      }
    }

    // Always set environment variables for shared environment mode
    // This allows the system to detect and reuse existing containers/processes
    process.env.INTEGR8_ENVIRONMENT_RUNNING = 'true';
    process.env.INTEGR8_SHARED_ENVIRONMENT = 'true';

    // Create a temporary Jest config file for this test run
    const jestConfigPath = resolve(process.cwd(), 'jest.integr8.config.js');
    
    // Generate Jest config using template and configuration
    jestConfigGenerator.generateJestConfigFile(config, testDir, jestConfigPath);

    // Build Jest command using the config file
    const jestArgs = [
      '--config', jestConfigPath,
      '--verbose',
      '--no-cache',
      '--passWithNoTests'
    ];

    // Add pattern if specified
    if (options.pattern) {
      jestArgs.push('--testNamePattern', options.pattern);
    }

    // Add watch mode if specified
    if (options.watch) {
      jestArgs.push('--watch');
    }

           // Stop spinner before running Jest
           // Tests are running...

           // Run Jest
           const jestProcess = spawn('npx', ['jest', ...jestArgs], {
             stdio: 'inherit',
             cwd: process.cwd(),
             env: {
               ...process.env,
               INTEGR8_ENVIRONMENT_RUNNING: process.env.INTEGR8_ENVIRONMENT_RUNNING,
               INTEGR8_SHARED_ENVIRONMENT: process.env.INTEGR8_SHARED_ENVIRONMENT
             }
           });

           return new Promise<void>((resolve, reject) => {
             let output = '';
             
             // Capture output for error handling
             jestProcess.on('close', (code) => {
               // Clean up the temporary Jest config file
               require('fs').unlinkSync(jestConfigPath);

               if (code === 0) {
                 if (output.includes('No tests found')) {
                   console.log(chalk.yellow('\n⚠️  No tests found in the specified directory'));
                   console.log(chalk.blue(`   Test directory: ${testDir}`));
                   console.log(chalk.blue('   Make sure you have test files with .integration.test.ts or .test.ts extension'));
                 } else {
                   console.log(chalk.green('\n✅ All tests passed!'));
                 }
                 resolve();
               } else {
                 if (output.includes('No tests found')) {
                   console.log(chalk.yellow('\n⚠️  No tests found in the specified directory'));
                   console.log(chalk.blue(`   Test directory: ${testDir}`));
                   console.log(chalk.blue('   Make sure you have test files with .integration.test.ts or .test.ts extension'));
                   resolve(); // Don't treat "no tests found" as a failure
                 } else {
                   console.log(chalk.red('\n❌ Some tests failed!'));
                   // Don't reject, just show the error and exit with proper code
                   process.exit(code);
                 }
               }
             });

             jestProcess.on('error', (error) => {
               // Clean up the temporary Jest config file on error
               require('fs').unlinkSync(jestConfigPath);
               console.error(chalk.red(`Error: ${error.message}`));
               reject(error);
             });
           });

  } catch (error: any) {
    console.error(chalk.red('❌ Failed to run tests'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
