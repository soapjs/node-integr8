import chalk from 'chalk';
import { existsSync } from 'fs';
import { TestFileUpdater, TestFileUpdateOptions } from '../../core/test-file-updater';
import { RouteInfo } from '../../types';

export async function addEndpointCommand(options: {
  endpoint: string;
  file?: string;
  controller?: string;
  scenarios: boolean;
  backup: boolean;
  dryRun: boolean;
}) {
  console.log(chalk.blue('➕ Adding endpoint to test file...'));

  try {
    // Parse endpoint string (e.g., "GET /users/:id")
    const endpoint = parseEndpointString(options.endpoint);
    
    // Determine target file
    const targetFile = await determineTargetFile(endpoint, options.file, options.controller);
    
    if (!targetFile) {
      console.error(chalk.red('❌ Could not determine target file. Use --file to specify explicitly.'));
      return;
    }

    if (!existsSync(targetFile)) {
      console.error(chalk.red(`❌ Target file does not exist: ${targetFile}`));
      return;
    }

    // Check if endpoint already exists
    const exists = await TestFileUpdater.endpointExistsInFile(targetFile, endpoint);
    if (exists) {
      console.error(chalk.red(`❌ Endpoint ${endpoint.method} ${endpoint.path} already exists in ${targetFile}`));
      return;
    }

    if (options.dryRun) {
      console.log(chalk.green('✅ Dry run completed - no changes made'));
      console.log(chalk.blue('\nWould add endpoint:'));
      console.log(`  Method: ${endpoint.method}`);
      console.log(`  Path: ${endpoint.path}`);
      console.log(`  File: ${targetFile}`);
      console.log(`  Scenarios: ${options.scenarios ? 'Multiple' : 'Single'}`);
      return;
    }

    // Generate scenarios if requested
    const scenarios = options.scenarios ? undefined : undefined; // Will use default scenarios

    // Update file
    const updater = new TestFileUpdater();
    await updater.addEndpointToFile({
      filePath: targetFile,
      endpoint,
      scenarios,
      backup: options.backup
    });

    console.log(chalk.green(`✅ Successfully added ${endpoint.method} ${endpoint.path} to ${targetFile}`));
    
    console.log(chalk.green('\n✅ Endpoint added successfully!'));
    console.log(chalk.blue('\nAdded to file:'));
    console.log(`  • ${targetFile}`);
    
    console.log(chalk.yellow('\n⚠️  Remember to:'));
    console.log('1. Review the generated test code');
    console.log('2. Remove the failing assertion: expect(true).toBe(false)');
    console.log('3. Add proper test data and assertions');
    console.log('4. Run tests to verify they work correctly');

  } catch (error: any) {
    console.error(chalk.red('❌ Failed to add endpoint'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

function parseEndpointString(endpointStr: string): RouteInfo {
  // Parse strings like "GET /users/:id" or "POST /users"
  const match = endpointStr.match(/^(\w+)\s+(.+)$/);
  
  if (!match) {
    throw new Error(`Invalid endpoint format: ${endpointStr}. Expected format: "METHOD /path"`);
  }

  const [, method, path] = match;
  
  return {
    method: method.toUpperCase(),
    path: path.startsWith('/') ? path : `/${path}`,
    controller: 'unknown' // Will be determined later
  };
}

async function determineTargetFile(
  endpoint: RouteInfo, 
  explicitFile?: string, 
  controller?: string
): Promise<string | null> {
  // If file is explicitly specified, use it
  if (explicitFile) {
    return explicitFile;
  }

  // Try to determine from controller
  if (controller) {
    const possibleFiles = [
      `./tests/integration/${controller}.integration.test.ts`,
      `./tests/${controller}.integration.test.ts`,
      `./${controller}.integration.test.ts`
    ];

    for (const file of possibleFiles) {
      if (existsSync(file)) {
        return file;
      }
    }
  }

  // Try to determine from endpoint path
  const pathParts = endpoint.path.split('/').filter((part: string) => part && !part.startsWith(':'));
  if (pathParts.length > 0) {
    const controllerName = pathParts[0];
    const possibleFiles = [
      `./tests/integration/${controllerName}.integration.test.ts`,
      `./tests/${controllerName}.integration.test.ts`,
      `./${controllerName}.integration.test.ts`
    ];

    for (const file of possibleFiles) {
      if (existsSync(file)) {
        return file;
      }
    }
  }

  return null;
}
