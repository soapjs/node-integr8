import chalk from 'chalk';
import { upCommand } from './up';
import { runCommand } from './run';
import { downCommand } from './down';

export async function ciCommand(options: {
  config: string;
  testType?: string;
  pattern?: string;
  timeout: number;
  verbose: boolean;
  noCleanup: boolean;
}) {
  console.log(chalk.blue('🤖 Running integration tests in CI mode...'));
  const startTime = Date.now();

  try {
    // 1. Start environment
    if (options.verbose) {
      console.log(chalk.blue('🚀 Starting test environment...'));
    }
    await upCommand({ config: options.config, testType: options.testType, detach: false });

    // 2. Run tests
    if (options.verbose) {
      console.log(chalk.blue('🧪 Running integration tests...'));
    }
    await runCommand({
      config: options.config,
      testType: options.testType,
      pattern: options.pattern,
      watch: false
    });

    // 3. Cleanup (unless --no-cleanup)
    if (!options.noCleanup) {
      if (options.verbose) {
        console.log(chalk.blue('🧹 Cleaning up environment...'));
      }
      await downCommand({ config: options.config, testType: options.testType });
    }

    const duration = Date.now() - startTime;
    console.log(chalk.green(`✅ CI tests completed successfully in ${(duration / 1000).toFixed(2)}s`));
    
    console.log(chalk.green('\n✅ All integration tests passed!'));
    
    if (options.verbose) {
      console.log(chalk.blue('\nCI Summary:'));
      console.log(`  • Environment: Started and stopped`);
      console.log(`  • Tests: Completed successfully`);
      console.log(`  • Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`  • Cleanup: ${options.noCleanup ? 'Skipped' : 'Completed'}`);
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(chalk.red(`❌ CI tests failed after ${(duration / 1000).toFixed(2)}s`));
    
    console.error(chalk.red('\n❌ Integration tests failed!'));
    console.error(chalk.red(`Error: ${error.message}`));
    
    // Always cleanup on error
    if (!options.noCleanup) {
      try {
        if (options.verbose) {
          console.log(chalk.yellow('\nCleaning up environment after failure...'));
        }
        await downCommand({ config: options.config });
        console.log(chalk.green('Environment cleaned up successfully'));
      } catch (cleanupError: any) {
        console.error(chalk.red(`Cleanup failed: ${cleanupError.message}`));
      }
    }
    
    process.exit(1);
  }
}
