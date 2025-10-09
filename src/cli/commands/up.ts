import chalk from 'chalk';
import { existsSync } from 'fs';
import { EnvironmentOrchestrator } from '../../core/environment-orchestrator';
import { Integr8Config } from '../../types';
import { Logger } from '../../utils/logger';
import { StatusServer } from '../../utils/status-server';
import { loadConfigFromFile } from '../../core/test-globals';
import {
  initializeStatusServer,
  cleanupStatusServer,
  updateComponentStatus
} from '../functions';

const logger = new Logger({ level: 'debug', enabled: true });

let statusServer: StatusServer | null = null;

export async function upCommand(options: {
  config: string;
  testType?: string;
  detach: boolean;
  composeFile?: string;
  fast?: boolean,
}) {
  logger.log(chalk.blue('Starting test environment...'));

  process.env.INTEGR8_SHARED_ENVIRONMENT = 'true';

  try {
    const configPath = autoDetectConfig(options);
    const config = await loadConfigFromFile(options.testType, configPath);
    
    // Initialize status server
    statusServer = await initializeStatusServer(config, logger);
    
    // Create orchestrator
    const orchestrator = new EnvironmentOrchestrator(logger, config);
    
    // Start environment
    if (options.fast) {
      logger.debug('Fast mode: skipping health checks');
    }
    
    // Update components status
    const allComponents = getAllComponents(config);
    updateAllComponentsStatus(allComponents, 'starting');
    
    await orchestrator.start(options.fast || false);
    
    updateAllComponentsStatus(allComponents, 'ready');
    
    logger.log(chalk.green('✅ Test environment started successfully!'));
    
    // Display environment info
    displayEnvironmentInfo(config, orchestrator);
    
    if (options.detach) {
      handleDetachedMode();
    } else {
      await handleAttachedMode(orchestrator);
    }

  } catch (error: any) {
    await cleanupStatusServer(statusServer, logger);
    logger.error(chalk.red('❌ Failed to start test environment'));
    logger.error(error);
    process.exit(1);
  }
}

function autoDetectConfig(options: { config: string; testType?: string }): string {
  let configPath = options.config;
  
  if (options.testType && options.config === 'integr8.api.config.js') {
    const testTypes = [options.testType, 'api', 'e2e', 'integration', 'custom'];
    const extensions = ['js', 'json'];
    
    for (const type of testTypes) {
      for (const ext of extensions) {
        const filename = `integr8.${type}.config.${ext}`;
        if (existsSync(filename)) {
          configPath = filename;
          break;
        }
      }
      if (configPath !== options.config) break;
    }
  }
  
  return configPath;
}

function getAllComponents(config: Integr8Config) {
  return [
    ...config.services || [],
    ...config.databases || [],
    ...config.storages || [],
    ...config.messaging || []
  ];
}

function updateAllComponentsStatus(components: any[], status: 'starting' | 'ready' | 'pending') {
  for (const component of components) {
    updateComponentStatus(statusServer, {
      name: component.name,
      category: component.category,
      status: status
    });
  }
}

function displayEnvironmentInfo(config: Integr8Config, orchestrator: EnvironmentOrchestrator) {
  logger.log(chalk.green('\n✅ Environment ready!'));
  logger.log(chalk.blue('\nServices:'));
  
  for (const service of config.services) {
    logger.log(`  • ${service.name} (${service.category}) (${orchestrator.getAccessPoint(service.name, service.category)})`);
  }

  if (config.databases) {
    logger.log(chalk.blue('\nDatabases:'));
    for (const db of config.databases) {
      logger.log(`  • ${db.name} (${db.category}) (${orchestrator.getAccessPoint(db.name, db.category)})`);
    }
  }

  if (config.storages) {
    logger.log(chalk.blue('\nStorages:'));
    for (const storage of config.storages) {
      logger.log(`  • ${storage.name} (${storage.category}) (${orchestrator.getAccessPoint(storage.name, storage.category)})`);
    }
  }

  if (config.messaging) {
    logger.log(chalk.blue('\nMessaging:'));
    for (const messaging of config.messaging) {
      logger.log(`  • ${messaging.name} (${messaging.category}) (${orchestrator.getAccessPoint(messaging.name, messaging.category)})`);
    }
  }
}

function handleDetachedMode() {
  logger.log(chalk.yellow('\n⚠️  Running in detached mode'));
  logger.log('Use "integr8 down" to stop the environment');
}

async function handleAttachedMode(orchestrator: EnvironmentOrchestrator) {
  logger.log(chalk.yellow('\nPress Ctrl+C to stop the environment'));
  
  let isStopping = false;
  
  process.on('SIGINT', async () => {
    if (isStopping) {
      logger.log(chalk.red('\nForce stopping...'));
      process.exit(1);
    }
    
    isStopping = true;
    logger.log(chalk.yellow('\n\nStopping environment...'));
    
    try {
      await orchestrator.stop();
      await cleanupStatusServer(statusServer, logger);
      logger.log(chalk.green('✅ Environment stopped successfully'));
      process.exit(0);
    } catch (error) {
      logger.error(chalk.red('❌ Error stopping environment:'), error);
      process.exit(1);
    }
  });
  
  // Keep alive
  setInterval(() => {}, 1000);
}
