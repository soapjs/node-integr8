import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

export async function removeConflictingContainer(containerName: string): Promise<void> {
  const execAsync = promisify(exec);

  try {
    // Check if container exists
    const { stdout } = await execAsync(`docker ps -a --filter name=${containerName} --format "{{.Names}}"`);

    if (stdout.trim()) {
      console.log(chalk.yellow(`⚠️  Removing conflicting container: ${chalk.cyan(containerName)}`));

      try {
        await execAsync(`docker stop ${containerName}`);
        console.log(chalk.blue(`🛑 Stopped container: ${chalk.cyan(containerName)}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Container ${chalk.cyan(containerName)} already stopped or not running`));
      }

      await execAsync(`docker rm ${containerName}`);
      console.log(chalk.green(`✅ Removed container: ${chalk.cyan(containerName)}`));
    }
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to remove conflicting container ${chalk.cyan(containerName)}:`),
      error instanceof Error ? chalk.gray(error.message) : String(error)
    );
  }
}

export async function findExistingContainer(serviceName: string): Promise<string | null> {
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(`docker ps --filter "label=integr8.service=${serviceName}" --format "{{.Names}}"`);

    if (stdout.trim()) {
      const containerName = stdout.trim().split('\n')[0]; // Take first match
      console.log(
        chalk.blue('🔍 Found existing integr8 container:'),
        chalk.cyan(containerName),
        'for service',
        chalk.magenta(serviceName)
      );
      return containerName;
    }

    return null;
  } catch (error) {
    console.log(
      chalk.red('⚠️  Failed to check for existing container'),
      chalk.magenta(serviceName) + ':',
      error instanceof Error ? chalk.gray(error.message) : String(error)
    );
    return null;
  }
}

export async function getContainerDetails(containerName: string): Promise<{ mappedPort: number } | null> {
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(`docker port ${containerName}`);

    if (stdout.trim()) {
      // Parse port mapping (e.g., "5432/tcp -> 0.0.0.0:32774")
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+)\/tcp -> 0\.0\.0\.0:(\d+)/);
        if (match) {
          const internalPort = parseInt(match[1]);
          const mappedPort = parseInt(match[2]);
          console.log(
            chalk.blue('🔗 Container'),
            chalk.cyan(containerName),
            chalk.gray('port mapping:'),
            chalk.yellow(`${internalPort}`),
            '->',
            chalk.green(`${mappedPort}`)
          );
          return { mappedPort };
        }
      }
    }

    return null;
  } catch (error) {
    console.log(
      chalk.red('⚠️  Failed to get container details for'),
      chalk.cyan(containerName) + ':',
      error instanceof Error ? chalk.gray(error.message) : String(error)
    );
    return null;
  }
}
