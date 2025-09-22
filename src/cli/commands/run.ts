import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Integr8Config } from '../../types';

export async function runCommand(options: { config: string; testType?: string; pattern?: string; watch: boolean }) {
  const spinner = ora('Loading configuration...').start();

  try {
    // Load configuration
    const configPath = resolve(options.config);
    if (!existsSync(configPath)) {
      spinner.fail(`Configuration file not found: ${configPath}`);
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
      spinner.fail('No test directory specified in configuration');
      process.exit(1);
    }

    spinner.text = 'Running integration tests...';

    // Check if environment is already running
    const testDir = resolve(config.testDirectory);
    
    if (!existsSync(testDir)) {
      spinner.fail(`Test directory not found: ${testDir}`);
      process.exit(1);
    }

    // Check if environment is running by trying to connect to the app
    const appService = config.services?.find(s => s.type === 'service' || s.name === 'app');
    let environmentRunning = false;
    
    if (appService) {
      const appPort = appService.ports?.[0] || 3000;
      const appUrl = `http://localhost:${appPort}`;
      
      try {
        const response = await fetch(`${appUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        
        if (response.ok) {
          environmentRunning = true;
          spinner.text = 'Environment detected, running tests...';
        } else {
          spinner.warn('Environment might not be running. Consider running "integr8 up" first.');
        }
      } catch (error) {
        spinner.warn('Environment not detected. Consider running "integr8 up" first.');
      }
    }

    // Set environment variable to indicate that environment is already running
    if (environmentRunning) {
      process.env.INTEGR8_ENVIRONMENT_RUNNING = 'true';
    }

    // Create a temporary Jest config file for this test run
    const jestConfigPath = resolve(process.cwd(), 'jest.integr8.config.js');
    const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['${testDir}'],
  testMatch: ['**/*.integration.test.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 60000,
  verbose: true,
  cache: false,
  passWithNoTests: true,
  collectCoverage: false
};`;

    // Write the config file
    writeFileSync(jestConfigPath, jestConfig);

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
           spinner.stop();

           // Run Jest
           const jestProcess = spawn('npx', ['jest', ...jestArgs], {
             stdio: 'inherit',
             cwd: process.cwd()
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
    spinner.fail('Failed to run tests');
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
