import chalk from 'chalk';
import ora from 'ora';
import { EnvironmentOrchestrator } from '../../core/EnvironmentOrchestrator';

export async function upCommand(options: { config: string; detach: boolean }) {
  const spinner = ora('Starting test environment...').start();

  try {
    // Load config
    const config = await loadConfig(options.config);
    
    // Create orchestrator
    const orchestrator = new EnvironmentOrchestrator(config);
    
    // Start environment
    await orchestrator.start();
    
    spinner.succeed('Test environment started successfully!');
    
    console.log(chalk.green('\n✅ Environment ready!'));
    console.log(chalk.blue('\nServices:'));
    
    for (const service of config.services) {
      console.log(`  • ${service.name} (${service.type})`);
    }
    
    console.log(chalk.blue('\nApp:'));
    console.log(`  • URL: ${orchestrator.getAppUrl()}`);
    
    if (options.detach) {
      console.log(chalk.yellow('\n⚠️  Running in detached mode'));
      console.log('Use "integr8 down" to stop the environment');
    } else {
      console.log(chalk.yellow('\nPress Ctrl+C to stop the environment'));
      
      // Keep the process running
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\nStopping environment...'));
        await orchestrator.stop();
        process.exit(0);
      });
      
      // Keep alive
      setInterval(() => {}, 1000);
    }

  } catch (error) {
    spinner.fail('Failed to start test environment');
    console.error(error);
    process.exit(1);
  }
}

async function loadConfig(configPath: string) {
  try {
    const config = require(require('path').resolve(configPath));
    return config.default || config;
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}
