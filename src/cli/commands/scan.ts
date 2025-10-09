import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { RouteInfo, Integr8Config } from '../../types';
import { loadConfigFromFile } from '../../core/test-globals';
import { TestTemplateGenerator } from '../../core/test-template-generator';
import {
  discoverFromCommand,
  discoverFromFile,
  scanDecoratorsWithPaths,
  ExtendedRouteInfo,
  normalizeRoutes,
  groupRoutesByResource,
  enhanceRouteWithScenarios,
  extractDescribeBlock,
  mergeTestContent
} from '../functions';

export interface ScanOptions {
  command?: string;
  json?: string;
  type?: 'all' | 'only-new';
  output?: string;
  config?: string;
  format?: 'json' | 'yaml';
  timeout?: number;
  decorators?: boolean;
  generateTests?: boolean;
  file?: string;
  dir?: string;
}

export class ScanCommand {
  private config!: Integr8Config;

  async execute(options: ScanOptions): Promise<void> {
    console.log('Starting endpoint scan...');
    
    try {
      // Validate options
      if ((options.file || options.dir) && !options.decorators) {
        throw new Error('--file and --dir options can only be used with --decorators flag');
      }

      this.config = await loadConfigFromFile(options.type, options.config);

      // 1. Discovery
      const routes = await this.discoverRoutes(options);
      
      // 2. Filter
      const filteredRoutes = await this.filterRoutes(routes, options);
      console.log(`${options.type === 'only-new' ? 'New' : 'All'} endpoints: ${filteredRoutes.length}`);
      
      // 3. Output results
      const outputPath = options.output || this.config.scan?.output || 'endpoints.json';
      if (outputPath) {
        await this.saveResults(filteredRoutes, outputPath, options);
      }
      
      // 4. Generate tests (only if requested)
      if (options.generateTests) {
        await this.generateTests(filteredRoutes, options);
        console.log('✅ Test generation completed!');
      } else {
        console.log('✅ Scan completed! Use --generate-tests to create test files.');
      }
      
      // 5. Show coverage if configured
      if (this.config.coverage) {
        console.log('\n');
        await this.showCoverage(options);
      }
      
    } catch (error) {
      console.error('❌ Scan failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async discoverRoutes(options: ScanOptions): Promise<ExtendedRouteInfo[]> {
    let routes: ExtendedRouteInfo[] = [];
    
    if (options.decorators) {
      console.log('Scanning decorators...');
      const decoratorRoutes = await scanDecoratorsWithPaths(
        this.config.scan?.decorators,
        options.file,
        options.dir
      );
      routes.push(...decoratorRoutes);
      console.log(`Found ${decoratorRoutes.length} endpoints from decorators`);
    }
    
    if (!options.decorators || routes.length === 0) {
      if (options.command) {
        routes = await discoverFromCommand(options.command, options.timeout);
      } else if (options.json) {
        routes = await discoverFromFile(options.json);
      } else if (this.config.scan?.discovery?.command) {
        routes = await discoverFromCommand(
          this.config.scan.discovery.command,
          options.timeout || Number(this.config.scan.discovery.timeout)
        );
      } else {
        throw new Error('Either --command, --json must be provided, or scan.discovery.command must be configured');
      }
      console.log(`Found ${routes.length} endpoints from discovery`);
    }
    
    return routes;
  }

  private async filterRoutes(routes: ExtendedRouteInfo[], options: ScanOptions): Promise<ExtendedRouteInfo[]> {
    if (options.type !== 'only-new') {
      return routes;
    }
    
    const outputDir = options.output || this.config.testDir || './integr8/tests';
    const existingFiles = new Set<string>();
    
    if (existsSync(outputDir)) {
      const files = require('fs').readdirSync(outputDir);
      files.forEach((file: string) => {
        if (file.endsWith('.test.ts')) {
          const match = file.match(/^(.+)\.(\w+)\.test\.ts$/);
          if (match) {
            const [, endpoint, method] = match;
            existingFiles.add(`${method.toUpperCase()}:${endpoint}`);
          }
        }
      });
    }
    
    return routes.filter(route => {
      const key = `${route.method}:${route.path}`;
      return !existingFiles.has(key);
    });
  }

  private async generateTests(routes: ExtendedRouteInfo[], options: ScanOptions): Promise<void> {
    if (routes.length === 0) {
      console.log(chalk.gray('No new endpoints to generate tests for'));
      return;
    }
    
    const configPath = options.config || 'integr8.config.js';
    const outputDir = options.output || this.config.testDir || './integr8/tests';
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(chalk.green(`Created output directory: ${chalk.bold(outputDir)}`));
    }
    
    const groupedRoutes = groupRoutesByResource(routes);
    
    for (const [resourceName, resourceRoutes] of groupedRoutes) {
      await this.generateMergedTestFile(resourceRoutes, outputDir, configPath);
    }
  }

  private async generateMergedTestFile(
    routes: ExtendedRouteInfo[],
    outputDir: string,
    configPath: string
  ): Promise<void> {
    if (routes.length === 0) return;
    
    const firstRoute = routes[0];
    const resourceName = firstRoute.resource || firstRoute.path.split('/').filter(Boolean)[0] || 'api';
    const fileName = `${resourceName}.api.test.ts`;
    const filePath = join(outputDir, fileName);
    
    let existingContent = '';
    if (existsSync(filePath)) {
      console.log(chalk.yellow(`Merging with existing file: ${fileName}`));
      existingContent = readFileSync(filePath, 'utf8');
    }
    
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: outputDir,
      testFramework: 'jest',
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: configPath,
      routesConfig: {}
    });
    
    const newTestBlocks: string[] = [];
    
    for (const route of routes) {
      const enhancedRoute = enhanceRouteWithScenarios(route);
      const template = generator.generateSingleEndpointTemplate(enhancedRoute);
      const describeBlock = extractDescribeBlock(template.content);
      if (describeBlock) {
        newTestBlocks.push(describeBlock);
      }
    }
    
    const finalContent = mergeTestContent(existingContent, newTestBlocks, generator, filePath, configPath);
    
    writeFileSync(filePath, finalContent);
    console.log(chalk.green(`Created/Updated: ${chalk.bold(fileName)}`));
  }

  private async saveResults(routes: ExtendedRouteInfo[], outputPath: string, options: ScanOptions): Promise<void> {
    const format = options.format || 'json';
    
    let content: string;
    
    if (format === 'json') {
      content = JSON.stringify(routes, null, 2);
    } else if (format === 'yaml') {
      content = routes.map(route =>
        `- method: ${route.method}\n  path: ${route.path}\n  resource: ${route.resource || 'unknown'}`
      ).join('\n');
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    writeFileSync(outputPath, content, 'utf8');
    console.log(chalk.gray(`Results saved to: ${chalk.bold(outputPath)}`));
  }

  private async showCoverage(options: ScanOptions): Promise<void> {
    try {
      const { CoverageCommand } = await import('./coverage');
      const coverageCommand = new CoverageCommand();
      
      await coverageCommand.execute({
        config: options.config,
        type: 'api'
      });
    } catch (error) {
      console.warn('⚠️  Could not generate coverage report:', error instanceof Error ? error.message : String(error));
    }
  }
}
