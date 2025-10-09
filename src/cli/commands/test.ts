import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Integr8Config } from '../../types';
import { jestConfigGenerator } from '../../utils/jest-config-generator';
import { Logger } from '../../utils/logger';
import { loadConfigFromFile } from '../../core/test-globals';
import { checkEnvironmentStatus } from '../functions';

const logger = new Logger({ level: 'debug', enabled: true });

export async function testCommand(
  options: { 
    config: string; 
    testType?: string; 
    pattern?: string; 
    watch: boolean; 
    waitForReady?: boolean; 
    waitTimeout?: number 
  }
) {
  logger.log(chalk.blue('Loading configuration...'));

  try {
    let config: Integr8Config = await loadConfigFromFile(options.testType, options.config);

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

    // Check environment status
    const { status: environmentStatus, isCI } = await checkEnvironmentStatus(config, logger);
    await handleEnvironmentStatus(environmentStatus, isCI, options);

    // Set environment variables
    process.env.INTEGR8_ENVIRONMENT_RUNNING = 'true';
    process.env.INTEGR8_SHARED_ENVIRONMENT = 'true';

    // Run tests
    await runJestTests(config, testDir, options);

  } catch (error: any) {
    logger.error(chalk.red('❌ Failed to run tests'));
    logger.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

async function handleEnvironmentStatus(
  environmentStatus: any,
  isCI: boolean,
  options: any
): Promise<void> {
  let environmentRunning = false;
  
  if (environmentStatus) {
    const ciInfo = isCI ? ' [CI Mode]' : '';
    const statusInfo = ` (${environmentStatus.readyComponents}/${environmentStatus.totalComponents} components ready)`;
    const timeInfo = environmentStatus.lastUpdate ?
      ` (last update: ${new Date(environmentStatus.lastUpdate).toLocaleString()})` : '';
    
    if (environmentStatus.ready) {
      logger.log(chalk.green(`✅ Environment fully ready - all components initialized${statusInfo}${ciInfo}${timeInfo}`));
    } else {
      logger.log(chalk.yellow(`⏳ Environment partially ready${statusInfo}${ciInfo}${timeInfo}`));
      displayComponentStatus(environmentStatus.components);
    }
    
    environmentRunning = true;
  } else {
    environmentRunning = await tryWaitForEnvironment(isCI, options);
  }

  if (!environmentRunning) {
    logger.warn(chalk.yellow('⚠️  Environment status server not detected. Make sure to run "integr8 up" first and wait for it to complete.'));
  }
}

function displayComponentStatus(components: any[]): void {
  for (const component of components) {
    const statusIcon = component.status === 'ready' ? '✅' :
                     component.status === 'starting' ? '🔄' :
                     component.status === 'failed' ? '❌' : '⏳';
    logger.log(`  ${statusIcon} ${component.name} (${component.category}): ${component.status}`);
  }
}

async function tryWaitForEnvironment(isCI: boolean, options: any): Promise<boolean> {
  if (!options.waitForReady || isCI) {
    return false;
  }

  const ENVIRONMENT_READY_FLAG_FILE = require('path').join(process.cwd(), '.integr8-environment-ready');
  
  if (!existsSync(ENVIRONMENT_READY_FLAG_FILE)) {
    return false;
  }

  try {
    const { readFileSync } = require('fs');
    const { StatusClient } = require('../../utils/status-server');
    
    const flagContent = readFileSync(ENVIRONMENT_READY_FLAG_FILE, 'utf8');
    const flagData = JSON.parse(flagContent);
    
    if (flagData.port) {
      logger.log(chalk.blue('Waiting for environment to be ready...'));
      const client = new StatusClient(flagData.port, logger);
      const waitTimeout = options.waitTimeout || 300000;
      
      const finalStatus = await client.waitForReady(waitTimeout);
      
      if (finalStatus && finalStatus.ready) {
        logger.log(chalk.green(`✅ Environment is now ready (${finalStatus.readyComponents}/${finalStatus.totalComponents} components)!`));
        return true;
      } else {
        logger.warn(chalk.yellow(`⚠️  Environment not ready after ${waitTimeout/1000}s timeout. Proceeding anyway...`));
        return true;
      }
    }
  } catch (error) {
    logger.debug('Failed to wait for environment:', error);
  }
  
  return false;
}

async function runJestTests(
  config: Integr8Config,
  testDir: string,
  options: any
): Promise<void> {
  // Create a temporary Jest config file
  const jestConfigPath = resolve(process.cwd(), 'jest.integr8.config.js');
  jestConfigGenerator.generateJestConfigFile(config, testDir, jestConfigPath);

  // Build Jest command
  const jestArgs = [
    '--config', jestConfigPath,
    '--verbose',
    '--no-cache',
    '--passWithNoTests'
  ];

  if (options.pattern) {
    jestArgs.push('--testNamePattern', options.pattern);
  }

  if (options.watch) {
    jestArgs.push('--watch');
  }

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
    
    jestProcess.on('close', (code) => {
      // Clean up the temporary Jest config file
      require('fs').unlinkSync(jestConfigPath);

      if (code === 0) {
        handleTestSuccess(output, testDir);
        resolve();
      } else {
        handleTestFailure(code, output, testDir);
        if (!output.includes('No tests found')) {
          process.exit(code);
        }
        resolve();
      }
    });

    jestProcess.on('error', (error) => {
      require('fs').unlinkSync(jestConfigPath);
      logger.error(chalk.red(`Error: ${error.message}`));
      reject(error);
    });
  });
}

function handleTestSuccess(output: string, testDir: string): void {
  if (output.includes('No tests found')) {
    logger.log(chalk.yellow('\n⚠️  No tests found in the specified directory'));
    logger.log(chalk.blue(`   Test directory: ${testDir}`));
    logger.log(chalk.blue('   Make sure you have test files with .integration.test.ts or .test.ts extension'));
  } else {
    logger.log(chalk.green('\n✅ All tests passed!'));
  }
}

function handleTestFailure(code: number | null, output: string, testDir: string): void {
  if (output.includes('No tests found')) {
    logger.log(chalk.yellow('\n⚠️  No tests found in the specified directory'));
    logger.log(chalk.blue(`   Test directory: ${testDir}`));
    logger.log(chalk.blue('   Make sure you have test files with .integration.test.ts or .test.ts extension'));
  } else {
    logger.log(chalk.red('\n❌ Some tests failed!'));
  }
}
