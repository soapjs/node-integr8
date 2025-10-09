import chalk from 'chalk';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { InteractiveInit } from './init-interactive';
import {
  generateConfigTemplate,
  generateTestTemplate,
  createDockerFiles
} from '../functions';

export async function initCommand(options: {
  template?: string;
  testDir?: string;
  format?: 'js' | 'json';
  appType?: string;
  testType?: 'api' | 'e2e' | 'integration' | 'custom';
  interactive?: boolean;
}) {
  // If interactive mode is requested or no template is provided, use interactive flow
  if (options.interactive) {
    const interactiveInit = new InteractiveInit();
    await interactiveInit.run();
    return;
  }

  // Legacy non-interactive flow
  console.log(chalk.blue('Initializing integr8...'));

  try {
    // Set defaults
    const template = options.template || 'express';
    const testDir = options.testDir || 'integr8/tests';
    const configFormat = options.format || 'js';
    const appType = options.appType || 'container';
    const testType = options.testType || 'api';
    const configFile = `integr8.${testType}.config.${configFormat}`;

    // Check if config already exists
    if (existsSync(configFile)) {
      console.error(chalk.red(`❌ ${configFile} already exists`));
      return;
    }

    // Create config file based on template
    const configContent = generateConfigTemplate(template, configFormat, testDir, appType, testType);
    writeFileSync(configFile, configContent);

    // Create Docker files if needed
    if (appType === 'docker-compose') {
      await createDockerFiles(template);
    }

    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create sample test file in test type subdirectory
    const relativeConfigPath = join('..', configFile);
    const testContent = generateTestTemplate(template, relativeConfigPath);
    const testTypeDir = join(testDir, testType);
    const testFilePath = join(testTypeDir, 'sample.integration.test.ts');
    
    // Ensure test type directory exists
    if (!existsSync(testTypeDir)) {
      mkdirSync(testTypeDir, { recursive: true });
    }
    writeFileSync(testFilePath, testContent);

    // Create .gitignore entry
    createGitignoreEntry();

    console.log(chalk.green('✅ integr8 initialized successfully!'));
    
    displayNextSteps(configFile, testFilePath);

  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize integr8'));
    console.error(error);
    process.exit(1);
  }
}

function createGitignoreEntry(): void {
  const gitignoreContent = '\n# integr8\ntest-artifacts/\n';
  
  if (existsSync('.gitignore')) {
    const currentGitignore = require('fs').readFileSync('.gitignore', 'utf8');
    if (!currentGitignore.includes('test-artifacts/')) {
      require('fs').appendFileSync('.gitignore', gitignoreContent);
    }
  } else {
    writeFileSync('.gitignore', gitignoreContent);
  }
}

function displayNextSteps(configFile: string, testFilePath: string): void {
  console.log(chalk.green('\n✅ Setup complete!'));
  console.log(chalk.blue('\nNext steps:'));
  console.log(`1. Review ${configFile}`);
  console.log(`2. Review ${testFilePath}`);
  console.log('3. Run: integr8 up');
  console.log('4. Run: integr8 run');
}
