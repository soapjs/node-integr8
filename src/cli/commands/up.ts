import chalk from 'chalk';
import { existsSync } from 'fs';
import { EnvironmentOrchestrator } from '../../core/environment-orchestrator';

export async function upCommand(options: { config: string; testType?: string; detach: boolean; composeFile?: string; local?: string[]; fast?: boolean }) {
  console.log(chalk.blue('🚀 Starting test environment...'));

  try {
    // Auto-detect config file if testType is provided and config is default
    let configPath = options.config;
    if (options.testType && options.config === 'integr8.api.config.js') {
      const testTypes = [options.testType, 'api', 'e2e', 'unit-db', 'custom'];
      const extensions = ['js', 'json', 'ts'];
      
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
    const config = await loadConfig(configPath);
    
    // Override service modes if --local flag is provided
    if (options.local && options.local.length > 0) {
      for (const serviceName of options.local) {
        const service = config.services.find((s: any) => s.name === serviceName);
        if (service) {
          service.mode = 'local';
          console.log(chalk.yellow(`🔄 Overriding ${serviceName} to local mode`));
        } else {
          console.log(chalk.red(`⚠️  Service ${serviceName} not found in config`));
        }
      }
    }
    
    // Override compose file if provided
    if (options.composeFile && config.app.type === 'docker-compose') {
      config.app.composeFile = options.composeFile;
    }
    
    // Create orchestrator
    const orchestrator = new EnvironmentOrchestrator(config);
    
    // Start environment
    if (options.fast) {
      console.log(chalk.yellow('🚀 Fast mode: skipping health checks'));
      await orchestrator.startFast();
    } else {
      await orchestrator.start();
    }
    
    console.log(chalk.green('✅ Test environment started successfully!'));
    
    console.log(chalk.green('\n✅ Environment ready!'));
    console.log(chalk.blue('\nServices:'));
    
    for (const service of config.services) {
      console.log(`  • ${service.name} (${service.type})`);
    }
    
    console.log(chalk.blue('\nApp:'));
    const appService = config.services.find((s: any) => s.type === 'service');
    if (appService) {
      console.log(`  • URL: ${orchestrator.getAppUrl()}`);
    } else {
      console.log('  • No app service configured');
    }
    
    if (options.detach) {
      console.log(chalk.yellow('\n⚠️  Running in detached mode'));
      console.log('Use "integr8 down" to stop the environment');
    } else {
      console.log(chalk.yellow('\nPress Ctrl+C to stop the environment'));
      
      let isStopping = false;
      
      // Keep the process running
      process.on('SIGINT', async () => {
        if (isStopping) {
          console.log(chalk.red('\nForce stopping...'));
          process.exit(1);
        }
        
        isStopping = true;
        console.log(chalk.yellow('\n\nStopping environment...'));
        
        try {
          await orchestrator.stop();
          console.log(chalk.green('✅ Environment stopped successfully'));
          process.exit(0);
        } catch (error) {
          console.error(chalk.red('❌ Error stopping environment:'), error);
          process.exit(1);
        }
      });
      
      // Keep alive
      setInterval(() => {}, 1000);
    }

  } catch (error: any) {
    console.error(chalk.red('❌ Failed to start test environment'));
    console.error(error);
    process.exit(1);
  }
}

async function loadConfig(configPath: string) {
  try {
    const config = require(require('path').resolve(configPath));
    return config.default || config;
  } catch (error: any) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}
