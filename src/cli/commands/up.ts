import chalk from 'chalk';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { EnvironmentOrchestrator } from '../../core/environment-orchestrator';
import { Integr8Config } from '../../types';
import { Logger } from '../../utils/logger';
import { StatusServer, ComponentStatus } from '../../utils/status-server';
import { loadConfigFromFile } from '../../core/test-globals';

const logger = new Logger({ level: 'debug', enabled: true });

// Status server for cross-process communication
let statusServer: StatusServer | null = null;
const ENVIRONMENT_READY_FLAG_FILE = join(process.cwd(), '.integr8-environment-ready');

async function initializeStatusServer(config: Integr8Config): Promise<StatusServer | null> {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, just set environment variables
      process.env.INTEGR8_ENVIRONMENT_READY = 'true';
      process.env.INTEGR8_SHARED_ENVIRONMENT = 'true';
      logger.debug('CI environment detected - using environment variables for readiness flag');
      return null;
    }

    // In local environment, start status server
    statusServer = new StatusServer(0, logger); // 0 = random available port
    const port = await statusServer.start();
    
    // Save port to file for other processes to find
    writeFileSync(ENVIRONMENT_READY_FLAG_FILE, JSON.stringify({
      port: port,
      timestamp: new Date().toISOString(),
      pid: process.pid
    }), 'utf8');
    
    // Initialize components tracking
    const allComponents = [
      ...config.services || [],
      ...config.databases || [],
      ...config.storages || [],
      ...config.messaging || []
    ];
    
    statusServer.setComponentsTotal(allComponents.length);
    
    // Initialize all components as pending
    for (const component of allComponents) {
      statusServer.updateComponentStatus({
        name: component.name,
        category: component.category,
        status: 'pending'
      });
    }
    
    logger.debug(`Status server started on port ${port} - tracking ${allComponents.length} components`);
    return statusServer;
  } catch (error) {
    logger.error(chalk.red('Failed to initialize status server:'), error);
    return null;
  }
}

async function cleanupStatusServer() {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, clear environment variables
      delete process.env.INTEGR8_ENVIRONMENT_READY;
      delete process.env.INTEGR8_SHARED_ENVIRONMENT;
      logger.debug('🧹 CI environment detected - cleared environment variables');
      return;
    }

    // In local environment, stop status server and remove flag file
    if (statusServer) {
      await statusServer.stop();
      statusServer = null;
    }
    
    if (existsSync(ENVIRONMENT_READY_FLAG_FILE)) {
      unlinkSync(ENVIRONMENT_READY_FLAG_FILE);
    }
    
    logger.debug('Status server stopped and flag file removed');
  } catch (error) {
    logger.error(chalk.red('Failed to cleanup status server:'), error);
  }
}

function updateComponentStatus(component: ComponentStatus) {
  if (statusServer) {
    statusServer.updateComponentStatus(component);
  }
}

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
    // Auto-detect config file if testType is provided and config is default
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
    
    // Load config
    const config = await loadConfigFromFile(options.testType, configPath);
    
    // Initialize status server (or CI mode)
    await initializeStatusServer(config);
    
    // Create orchestrator
    const orchestrator = new EnvironmentOrchestrator(logger, config);
    
    // Start environment
    if (options.fast) {
      logger.debug('Fast mode: skipping health checks');
    }
    
    // Update all components to starting status
    const allComponents = [
      ...config.services || [],
      ...config.databases || [],
      ...config.storages || [],
      ...config.messaging || []
    ];
    
    for (const component of allComponents) {
      updateComponentStatus({
        name: component.name,
        category: component.category,
        status: 'starting'
      });
    }
    
    await orchestrator.start(options.fast || false);
    
    // Update all components to ready status
    for (const component of allComponents) {
      updateComponentStatus({
        name: component.name,
        category: component.category,
        status: 'ready'
      });
    }
    
    logger.log(chalk.green('✅ Test environment started successfully!'));
    
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
    
    if (options.detach) {
      logger.log(chalk.yellow('\n⚠️  Running in detached mode'));
      logger.log('Use "integr8 down" to stop the environment');
    } else {
      logger.log(chalk.yellow('\nPress Ctrl+C to stop the environment'));
      
      let isStopping = false;
      
      // Keep the process running
      process.on('SIGINT', async () => {
        if (isStopping) {
          logger.log(chalk.red('\nForce stopping...'));
          process.exit(1);
        }
        
        isStopping = true;
        logger.log(chalk.yellow('\n\nStopping environment...'));
        
        try {
          await orchestrator.stop();
          // Cleanup status server when stopping
          await cleanupStatusServer();
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

  } catch (error: any) {
    // Cleanup status server on error
    await cleanupStatusServer();
    logger.error(chalk.red('❌ Failed to start test environment'));
    logger.error(error);
    process.exit(1);
  }
}
