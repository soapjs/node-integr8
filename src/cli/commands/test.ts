import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { Integr8Config } from '../../types';
import { jestConfigGenerator } from '../../utils/jest-config-generator';
import { Logger } from '../../utils/logger';
import { StatusClient, EnvironmentStatus } from '../../utils/status-server';

const logger = new Logger({ level: 'debug', enabled: true });

// File-based environment ready flag for cross-process communication
const ENVIRONMENT_READY_FLAG_FILE = join(process.cwd(), '.integr8-environment-ready');

async function checkEnvironmentStatus(config: Integr8Config): Promise<{ status: EnvironmentStatus | null; isCI: boolean }> {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, check for environment variable or assume ready if shared environment is set
      const sharedEnv = process.env.INTEGR8_SHARED_ENVIRONMENT === 'true';
      const envRunning = process.env.INTEGR8_ENVIRONMENT_RUNNING === 'true';
      
      if (sharedEnv || envRunning) {
        logger.debug('CI environment detected - using environment variables for readiness check');
        
        // Create mock status for CI
        const allComponents = [
          ...config.services || [],
          ...config.databases || [],
          ...config.storages || [],
          ...config.messaging || []
        ];
        
        const mockStatus: EnvironmentStatus = {
          ready: true,
          components: allComponents.map(c => ({
            name: c.name,
            category: c.category,
            type: c.type,
            status: 'ready' as const,
            timestamp: new Date().toISOString()
          })),
          totalComponents: allComponents.length,
          readyComponents: allComponents.length,
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        };
        
        return { status: mockStatus, isCI: true };
      }
      
      return { status: null, isCI: true };
    }
    
    // In local environment, try to connect to status server
    if (existsSync(ENVIRONMENT_READY_FLAG_FILE)) {
      const flagContent = readFileSync(ENVIRONMENT_READY_FLAG_FILE, 'utf8');
      const flagData = JSON.parse(flagContent);
      
      // Check if flag is recent (within last 24 hours)
      if (flagData.timestamp) {
        const flagTime = new Date(flagData.timestamp).getTime();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - flagTime > maxAge) {
          logger.debug('Environment ready flag is too old, ignoring');
          return { status: null, isCI: false };
        }
      }
      
      if (flagData.port) {
        const client = new StatusClient(flagData.port, logger);
        const status = await client.getStatus();
        return { status, isCI: false };
      }
    }
    
    return { status: null, isCI: false };
  } catch (error) {
    logger.debug('Failed to check environment status:', error);
    return { status: null, isCI: false };
  }
}

export async function testCommand(
  options: { config: string; testType?: string; pattern?: string; watch: boolean; waitForReady?: boolean; waitTimeout?: number }
) {
  logger.log(chalk.blue('Loading configuration...'));

  try {
    let config: Integr8Config = await loadConfig(options.config);

    if (!config.testDir) {
      logger.error(chalk.red('❌ No test directory specified in configuration'));
      process.exit(1);
    }

    logger.log(chalk.blue('Running integration tests...'));

    const testDir = resolve(config.testDir);
    
    if (!existsSync(testDir)) {
      logger.error(chalk.red(`❌ Test directory not found: ${testDir}`));
      process.exit(1);
    }

    // Check if environment is ready using status server or CI mode
    const { status: environmentStatus, isCI } = await checkEnvironmentStatus(config);
    let environmentRunning = false;
    
    // Check environment readiness using status server or CI mode
    if (environmentStatus) {
      const ciInfo = isCI ? ' [CI Mode]' : '';
      const statusInfo = ` (${environmentStatus.readyComponents}/${environmentStatus.totalComponents} components ready)`;
      const timeInfo = environmentStatus.lastUpdate ? 
        ` (last update: ${new Date(environmentStatus.lastUpdate).toLocaleString()})` : '';
      
      if (environmentStatus.ready) {
        logger.log(chalk.green(`✅ Environment fully ready - all components initialized${statusInfo}${ciInfo}${timeInfo}`));
      } else {
        logger.log(chalk.yellow(`⏳ Environment partially ready${statusInfo}${ciInfo}${timeInfo}`));
        
        // Show component status
        for (const component of environmentStatus.components) {
          const statusIcon = component.status === 'ready' ? '✅' : 
                           component.status === 'starting' ? '🔄' : 
                           component.status === 'failed' ? '❌' : '⏳';
          logger.log(`  ${statusIcon} ${component.name} (${component.category}): ${component.status}`);
        }
      }
      
      environmentRunning = true;
    } else if (!environmentRunning) {
      // If waitForReady is enabled and we're in local mode, try to wait for environment
      if (options.waitForReady && !isCI && existsSync(ENVIRONMENT_READY_FLAG_FILE)) {
        try {
          const flagContent = readFileSync(ENVIRONMENT_READY_FLAG_FILE, 'utf8');
          const flagData = JSON.parse(flagContent);
          
          if (flagData.port) {
            logger.log(chalk.blue('Waiting for environment to be ready...'));
            const client = new StatusClient(flagData.port, logger);
            const waitTimeout = options.waitTimeout || 300000; // 5 minutes default
            
            const finalStatus = await client.waitForReady(waitTimeout);
            
            if (finalStatus && finalStatus.ready) {
              logger.log(chalk.green(`✅ Environment is now ready (${finalStatus.readyComponents}/${finalStatus.totalComponents} components)!`));
              environmentRunning = true;
            } else {
              logger.warn(chalk.yellow(`⚠️  Environment not ready after ${waitTimeout/1000}s timeout. Proceeding anyway...`));
              environmentRunning = true; // Proceed anyway
            }
          }
        } catch (error) {
          logger.debug('Failed to wait for environment:', error);
        }
      }
      
      if (!environmentRunning) {
        logger.warn(chalk.yellow('⚠️  Environment status server not detected. Make sure to run "integr8 up" first and wait for it to complete.'));
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
                   logger.log(chalk.yellow('\n⚠️  No tests found in the specified directory'));
                   logger.log(chalk.blue(`   Test directory: ${testDir}`));
                   logger.log(chalk.blue('   Make sure you have test files with .integration.test.ts or .test.ts extension'));
                 } else {
                   logger.log(chalk.green('\n✅ All tests passed!'));
                 }
                 resolve();
               } else {
                 if (output.includes('No tests found')) {
                   logger.log(chalk.yellow('\n⚠️  No tests found in the specified directory'));
                   logger.log(chalk.blue(`   Test directory: ${testDir}`));
                   logger.log(chalk.blue('   Make sure you have test files with .integration.test.ts or .test.ts extension'));
                   resolve(); // Don't treat "no tests found" as a failure
                 } else {
                   logger.log(chalk.red('\n❌ Some tests failed!'));
                   // Don't reject, just show the error and exit with proper code
                   process.exit(code);
                 }
               }
             });

             jestProcess.on('error', (error) => {
               // Clean up the temporary Jest config file on error
               require('fs').unlinkSync(jestConfigPath);
               logger.error(chalk.red(`Error: ${error.message}`));
               reject(error);
             });
           });

  } catch (error: any) {
    logger.error(chalk.red('❌ Failed to run tests'));
    logger.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

async function loadConfig(configPath: string): Promise<Integr8Config> {
  try {
    if (configPath.endsWith('.js')) {
      const config = require(require('path').resolve(configPath));
      return config.default || config;
    } else if (configPath.endsWith('.json')) {
      const config = require('fs').readFileSync(require('path').resolve(configPath), 'utf8');
      return JSON.parse(config);
    } else {
      logger.error(chalk.red(`❌ Unsupported config file type: ${configPath}`));
      process.exit(1);
    }
  } catch (error: any) {
    logger.error(chalk.red(`❌ Failed to load config from ${configPath}: ${error.message}`));
    process.exit(1);
  }
}
