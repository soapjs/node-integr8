import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { TestTemplateGenerator, TestTemplateOptions, RouteInfo } from '../../templates/test-template-generator';
import { Integr8Config } from '../../types';

export async function generateCommand(options: { 
  config: string; 
  output: string; 
  framework: string;
  command?: string;
  setup: boolean;
  teardown: boolean;
  type: string;
  scenarios: boolean;
  format?: string;
  timeout?: number;
  cwd?: string;
}) {
  const spinner = ora('Generating test templates...').start();

  try {
    // Load configuration from file
    const config = await loadConfig(options.config);
    
    // Merge CLI options with config
    const routesConfig = {
      command: options.command || config.routes?.command,
      outputFormat: (options.format || config.routes?.outputFormat || 'auto') as 'json' | 'text' | 'auto',
      timeout: options.timeout || config.routes?.timeout || 30000,
      workingDirectory: options.cwd || config.routes?.workingDirectory || process.cwd(),
      environment: config.routes?.environment
    };

    if (!routesConfig.command) {
      spinner.fail('No route discovery command configured. Use --command or configure routes.command in config file.');
      return;
    }

    // Generate templates using command-based route discovery
    const generator = new TestTemplateGenerator({
      outputDir: options.output,
      testFramework: options.framework as 'jest' | 'vitest',
      includeSetup: options.setup,
      includeTeardown: options.teardown,
      templateType: options.type as 'controller' | 'endpoint',
      generateScenarios: options.scenarios,
      routesConfig,
      customImports: [
        "// Add your custom imports here",
        "// import { CustomHelper } from './helpers/custom-helper';"
      ]
    });

    const templates = await generator.generateAllTemplates();
    
    // Create output directory
    if (!existsSync(options.output)) {
      mkdirSync(options.output, { recursive: true });
    }

    // Write templates
    let generatedCount = 0;
    for (const template of templates) {
      const filePath = join(options.output, template.fileName);
      const fileDir = dirname(filePath);
      
      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true });
      }
      
      writeFileSync(filePath, template.content);
      generatedCount++;
    }

    spinner.succeed(`Generated ${generatedCount} test templates!`);
    
    console.log(chalk.green('\n✅ Test templates generated successfully!'));
    console.log(chalk.blue('\nGenerated files:'));
    
    templates.forEach(template => {
      console.log(`  • ${template.fileName}`);
    });
    
    console.log(chalk.yellow('\n⚠️  Remember to:'));
    console.log('1. Review and implement the TODO items in each test');
    console.log('2. Remove the failing assertion: expect(true).toBe(false)');
    console.log('3. Add proper test data and assertions');
    console.log('4. Run tests to verify they work correctly');

  } catch (error: any) {
    spinner.fail('Failed to generate test templates');
    console.error(error);
    process.exit(1);
  }
}

async function loadConfig(configPath: string): Promise<Integr8Config> {
  try {
    const resolvedPath = resolve(configPath);
    const config = require(resolvedPath);
    return config.default || config;
  } catch (error: any) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}

