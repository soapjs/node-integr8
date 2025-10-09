import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { DecoratorScanner } from '../../core/decorator-scanner';
import { RouteInfo, Integr8Config } from '../../types';
import { loadConfigFromFile } from '../../core/test-globals';

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

export interface ExtendedRouteInfo extends RouteInfo {
  resource?: string; // Resource name for test file naming (e.g., "users")
  endpoint?: string; // Explicit endpoint name for test file naming (fallback)
  expectedStatus?: number; // Expected HTTP status code (e.g., from decorators)
  request?: {
    headers?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
  };
  response?: Record<string, any>;
  description?: string;
  testScenarios?: TestScenario[];
}

export interface TestScenario {
  description: string;
  expectedStatus: number;
  requestData?: any;
  queryParams?: any;
  pathParams?: any;
  expectedResponse?: any;
}

export class ScanCommand {
  private config!: Integr8Config;

  async execute(options: ScanOptions): Promise<void> {
    console.log('Starting endpoint scan...');
    
    try {
      // Validate --file and --dir options
      if ((options.file || options.dir) && !options.decorators) {
        throw new Error('--file and --dir options can only be used with --decorators flag');
      }

      // Always load config from file (override default config)
      this.config = await loadConfigFromFile(options.type, options.config);

      // 1. Discovery
      let routes: ExtendedRouteInfo[] = [];
      
      if (options.decorators) {
        console.log('Scanning decorators...');
        const decoratorRoutes = await this.scanDecorators(options);
        routes.push(...decoratorRoutes);
        console.log(`Found ${decoratorRoutes.length} endpoints from decorators`);
      }
      
      if (!options.decorators || routes.length === 0) {
        const discoveredRoutes = await this.discoverRoutes(options);
        routes.push(...discoveredRoutes);
        console.log(`Found ${discoveredRoutes.length} endpoints from discovery`);
      }
      
      // 2. Filter
      const filteredRoutes = await this.filterRoutes(routes, options);
      console.log(`${options.type === 'only-new' ? 'New' : 'All'} endpoints: ${filteredRoutes.length}`);
      

      const outputPath = options.output || this.config.scan?.output || 'endpoints.json';
      // 3. Output results
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

  private async discoverRoutes(options: ScanOptions): Promise<ExtendedRouteInfo[]> {
    if (options.command) {
      return await this.discoverFromCommand(options.command, options.timeout);
    } else if (options.json) {
      return await this.discoverFromFile(options.json);
    } else if (this.config.scan?.discovery?.command) {
      return await this.discoverFromCommand(
        this.config.scan.discovery.command, 
        options.timeout || Number(this.config.scan.discovery.timeout)
      );
    } else {
      throw new Error('Either --command, --json must be provided, or scan.discovery.command must be configured in integr8.config.js');
    }
  }

  private async discoverFromCommand(command: string, timeout?: number): Promise<ExtendedRouteInfo[]> {
    console.log(chalk.blue(`Running command: ${chalk.bold(command)}`));
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: Number(timeout || 10000)
      });
      
      const routes = JSON.parse(output);
      return this.normalizeRoutes(routes);
      
    } catch (error) {
      throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async discoverFromFile(filePath: string): Promise<ExtendedRouteInfo[]> {
    console.log(chalk.cyan(`Reading from file: ${chalk.bold(filePath)}`));
    
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const routes = JSON.parse(content);
      return this.normalizeRoutes(routes);
      
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private normalizeRoutes(routes: any[]): ExtendedRouteInfo[] {
    return routes.map(route => ({
      method: route.method?.toUpperCase() || 'GET',
      path: this.normalizePath(route.path || '/'),
      resource: route.resource, // Use resource name if provided
      endpoint: route.endpoint, // Use explicit endpoint name if provided
      group: route.group || route.resource || 'api',
      middleware: route.middleware || [],
      params: route.params || [],
      request: route.request || {},
      response: route.response || {},
      description: route.description || ''
    }));
  }

  private normalizePath(path: string): string {
    // Remove protocol and domain if present
    let normalizedPath = path;
    
    // Handle full URLs like http://localhost:3000/api/v1/users
    if (path.includes('://')) {
      try {
        const url = new URL(path);
        normalizedPath = url.pathname;
      } catch (error) {
        // If URL parsing fails, try to extract path manually
        const match = path.match(/\/[^?]*/);
        if (match) {
          normalizedPath = match[0];
        }
      }
    }
    
    // Handle malformed URLs like /http:localhost:3000/api/v1/users
    if (normalizedPath.startsWith('/http:') || normalizedPath.startsWith('/https:')) {
      const match = normalizedPath.match(/\/https?:\/\/[^\/]+(\/.*)/);
      if (match) {
        normalizedPath = match[1];
      }
    }
    
    // Ensure path starts with /
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    
    return normalizedPath;
  }

  private async filterRoutes(routes: ExtendedRouteInfo[], options: ScanOptions): Promise<ExtendedRouteInfo[]> {
    if (options.type !== 'only-new') {
      return routes;
    }
    
    const outputDir = options.output || this.config.testDir || './integr8/tests';
    const existingFiles = new Set<string>();
    
    // Scan existing test files
    if (existsSync(outputDir)) {
      const files = require('fs').readdirSync(outputDir);
      files.forEach((file: string) => {
        if (file.endsWith('.test.ts')) {
          // Extract endpoint and method from filename
          const match = file.match(/^(.+)\.(\w+)\.test\.ts$/);
          if (match) {
            const [, endpoint, method] = match;
            existingFiles.add(`${method.toUpperCase()}:${endpoint}`);
          }
        }
      });
    }
    
    // Filter out existing endpoints
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
      
    // Update options with resolved testDir
    options.output = outputDir;
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(chalk.green(`Created output directory: ${chalk.bold(outputDir)}`));
    }
    
    // Group routes by resource (like create command does)
    const groupedRoutes = this.groupRoutesByResource(routes);
    
    // Generate merged test files for each resource
    for (const [resourceName, resourceRoutes] of groupedRoutes) {
      await this.generateMergedTestFile(resourceRoutes, outputDir, configPath);
    }
  }

  private groupRoutesByResource(routes: ExtendedRouteInfo[]): Map<string, ExtendedRouteInfo[]> {
    const grouped = new Map<string, ExtendedRouteInfo[]>();
    
    for (const route of routes) {
      // Use resource if available, otherwise extract from path
      const resourceName = route.resource || this.extractResourceName(route.path);
      
      if (!grouped.has(resourceName)) {
        grouped.set(resourceName, []);
      }
      grouped.get(resourceName)!.push(route);
    }
    
    return grouped;
  }

  private async generateMergedTestFile(routes: ExtendedRouteInfo[], outputDir: string, configPath: string): Promise<void> {
    if (routes.length === 0) return;
    
    const { TestTemplateGenerator } = require('../../core/test-template-generator');
    
    // Use resource from first route to determine file naming
    const firstRoute = routes[0];
    const resourceName = firstRoute.resource || this.extractResourceName(firstRoute.path);
    const fileName = `${resourceName}.api.test.ts`;
    const filePath = join(outputDir, fileName);
    
    // Check if file already exists
    let existingContent = '';
    if (existsSync(filePath)) {
      console.log(chalk.yellow(`Merging with existing file: ${fileName}`));
      existingContent = readFileSync(filePath, 'utf8');
    }
    
    // Create test template generator
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: outputDir,
      testFramework: 'jest',
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: configPath,
      routesConfig: {}
    });
    
    // Generate content for all routes
    const newTestBlocks: string[] = [];
    
    for (const route of routes) {
      const enhancedRoute = this.enhanceRouteWithScenarios(route);
      const template = generator.generateSingleEndpointTemplate(enhancedRoute);
      
      // Extract just the describe block from the generated content
      const describeBlock = this.extractDescribeBlock(template.content);
      if (describeBlock) {
        newTestBlocks.push(describeBlock);
      }
    }
    
    // Merge with existing content or create new file
    const finalContent = this.mergeTestContent(existingContent, newTestBlocks, generator, filePath, configPath);
    
    // Write file
    writeFileSync(filePath, finalContent);
    console.log(chalk.green(`Created/Updated: ${chalk.bold(fileName)}`));
  }

  private extractDescribeBlock(content: string): string | null {
    // Extract the describe block from the generated test content
    const lines = content.split('\n');
    let describeStartIndex = -1;
    let braceCount = 0;
    
    // Find the start of describe block
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('describe(')) {
        describeStartIndex = i;
        break;
      }
    }
    
    if (describeStartIndex === -1) {
      return null;
    }
    
    // Count braces to find the end of describe block
    for (let i = describeStartIndex; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        // When we close the describe block
        if (braceCount === 0 && i > describeStartIndex) {
          return lines.slice(describeStartIndex, i + 1).join('\n');
        }
      }
    }
    
    return null;
  }

  private mergeTestContent(existingContent: string, newTestBlocks: string[], generator: any, testFilePath: string, configPath?: string): string {
    if (!existingContent) {
      // Create new file with all test blocks
      const imports = this.generateImports();
      const importsSection = this.generateImportsSection(imports);
      
      // Generate setup/teardown using template
      const setupTeardown = this.generateSetupTeardownFromTemplate(generator, testFilePath, configPath);
      
      return `${importsSection}\n\n${setupTeardown}\n\n${newTestBlocks.join('\n\n')}\n`;
    }
    
    // Filter out test blocks that already exist in the file
    const blocksToAdd: string[] = [];
    
    for (const block of newTestBlocks) {
      const describeTitle = this.extractDescribeTitle(block);
      
      if (describeTitle && this.describeExists(existingContent, describeTitle)) {
        console.log(chalk.yellow(`   Skipping existing test: ${describeTitle}`));
        continue;
      }
      
      blocksToAdd.push(block);
    }
    
    // If no new blocks to add, return existing content unchanged
    if (blocksToAdd.length === 0) {
      console.log(chalk.gray(`  No new tests to add`));
      return existingContent;
    }
    
    // Parse existing content and merge
    const lines = existingContent.split('\n');
    const importsEndIndex = this.findImportsEndIndex(lines);
    const describeBlocksStartIndex = this.findDescribeBlocksStartIndex(lines);
    
    if (importsEndIndex === -1 || describeBlocksStartIndex === -1) {
      // Fallback: append new blocks at the end
      return `${existingContent}\n\n${blocksToAdd.join('\n\n')}\n`;
    }
    
    // Merge: keep existing imports and setup/teardown, add new describe blocks
    const beforeDescribe = lines.slice(0, describeBlocksStartIndex).join('\n');
    const afterDescribe = lines.slice(describeBlocksStartIndex).join('\n');
    
    return `${beforeDescribe}\n\n${blocksToAdd.join('\n\n')}\n\n${afterDescribe}`;
  }

  private extractDescribeTitle(describeBlock: string): string | null {
    // Extract the title from describe('title', () => { ... })
    const match = describeBlock.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  }

  private describeExists(content: string, describeTitle: string): boolean {
    // Check if a describe block with this title already exists
    const escapedTitle = describeTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`describe\\s*\\(\\s*['"\`]${escapedTitle}['"\`]`, 'i');
    return pattern.test(content);
  }

  private generateImports(): Record<string, string[]> {
    return {
      '@soapjs/integr8': ['setupEnvironment', 'teardownEnvironment', 'getEnvironmentContext']
    };
  }

  private generateImportsSection(imports: Record<string, string[]>): string {
    const importLines: string[] = [];
    
    for (const [module, importsList] of Object.entries(imports)) {
      importLines.push(`import { ${importsList.join(', ')} } from '${module}';`);
    }
    
    return importLines.join('\n');
  }

  private generateSetupTeardownFromTemplate(generator: any, testFilePath: string, configPath?: string): string {
    // Use the setup-teardown template from the generator
    const templateData = {
      setup: true,
      teardown: true,
      configPath: configPath || 'integr8.config.js',
      testFilePath: testFilePath
    };
    
    // Access the setup-teardown template from the generator
    if (generator.setupTeardownTemplate) {
      return generator.setupTeardownTemplate(templateData);
    }
    
    // Fallback to manual generation if template not available
    return this.generateSetupTeardownSection();
  }

  private generateSetupTeardownSection(): string {
    return `// Global setup
beforeAll(async () => {
  const configModule = require('../integr8.config.js');
  const config = configModule.default || configModule;
  
  await setupEnvironment(config);
});

// Global teardown
afterAll(async () => {
  await teardownEnvironment();
});`;
  }

  private findImportsEndIndex(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 0 && lines[i-1].includes('from')) {
        return i;
      }
    }
    return -1;
  }

  private findDescribeBlocksStartIndex(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('describe(')) {
        return i;
      }
    }
    return -1;
  }

  private extractEndpointName(path: string): string {
    let normalizedPath = path.trim();
    
    // Remove leading slash
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    // Remove trailing slash
    if (normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Split by slash and take the last meaningful part
    const parts = normalizedPath.split('/').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return 'root';
    }
    
    // Get the last part and clean it up
    let endpointName = parts[parts.length - 1];
    
    // Replace path parameters with descriptive names
    endpointName = endpointName.replace(/:([^/]+)/g, (match, paramName) => {
      return `-${paramName}`;
    });
    
    // Remove any remaining special characters
    endpointName = endpointName.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Remove multiple consecutive dashes
    endpointName = endpointName.replace(/-+/g, '-');
    
    // Remove leading/trailing dashes
    endpointName = endpointName.replace(/^-+|-+$/g, '');
    
    return endpointName || 'endpoint';
  }

  private enhanceRouteWithScenarios(route: ExtendedRouteInfo): ExtendedRouteInfo {
    const scenarios = [];
    
    // Generate scenarios based on response codes
    if (route.response) {
      Object.keys(route.response).forEach((statusCode: string) => {
        const status = parseInt(statusCode);
        if (!isNaN(status)) {
          scenarios.push({
            description: `should return ${status}`,
            expectedStatus: status,
            requestData: route.request?.body,
            queryParams: route.request?.query,
            pathParams: this.generatePathParams(route.path),
            expectedResponse: route.response?.[statusCode] || {}
          });
        }
      });
    }
    
    // If no response codes defined, add default scenarios
    if (scenarios.length === 0) {
      // Use expectedStatus from route if available (e.g., from decorators), otherwise use default
      const expectedStatus = route.expectedStatus || this.getDefaultStatus(route.method);
      scenarios.push({
        description: `should handle ${route.method} request`,
        expectedStatus: expectedStatus,
        requestData: route.request?.body,
        queryParams: route.request?.query,
        pathParams: this.generatePathParams(route.path)
      });
    }
    
    return {
      ...route,
      testScenarios: scenarios
    };
  }

  private generatePathParams(path: string): any {
    const pathParams = path.match(/:([^/]+)/g);
    if (pathParams) {
      const params: any = {};
      pathParams.forEach(param => {
        const paramName = param.substring(1);
        params[paramName] = `test-${paramName}`;
      });
      return params;
    }
    return undefined;
  }

  private getDefaultStatus(method: string): number {
    // Returns conventional HTTP status codes for REST APIs
    // Note: DELETE can return 200 (with body) or 204 (no content) - 204 is used as default
    // If your API uses different status codes, specify them in decorators (@HttpCode) or endpoint config
    switch (method.toUpperCase()) {
      case 'GET': return 200;
      case 'POST': return 201;
      case 'PUT': return 200;
      case 'PATCH': return 200;
      case 'DELETE': return 204; // Some APIs return 200 instead
      default: return 200;
    }
  }

  private async scanDecorators(options: ScanOptions): Promise<ExtendedRouteInfo[]> {
    const decoratorConfig = this.config?.scan?.decorators;
    
    if (!decoratorConfig) {
      console.warn('⚠️  Decorator scanning not configured. Add scan.decorators to your config file');
      return [];
    }

    // Override paths if --file or --dir options are provided
    const scanConfig = { ...decoratorConfig };
    if (options.file || options.dir) {
      const paths: string[] = [];
      if (options.file) {
        paths.push(options.file);
        console.log(chalk.cyan(`Scanning specific file: ${chalk.bold(options.file)}`));
      }
      if (options.dir) {
        paths.push(options.dir);
        console.log(chalk.cyan(`Scanning specific directory: ${chalk.bold(options.dir)}`));
      }
      scanConfig.paths = paths;
    }

    const scanner = new DecoratorScanner(scanConfig);
    const decoratorRoutes = await scanner.scanDecorators();

    return decoratorRoutes.map(route => ({
      method: route.method,
      path: route.path,
      description: route.description,
      resource: this.extractResourceName(route.path),
      expectedStatus: route.decorators?.httpCode || this.getDefaultStatus(route.method),
      sourceFile: route.sourceFile,
      lineNumber: route.lineNumber,
      decorators: route.decorators
    }));
  }

  private async saveResults(routes: ExtendedRouteInfo[], outputPath: string, options: ScanOptions): Promise<void> {
    const format = options.format || 'json';
    
    let content: string;
    
    if (format === 'json') {
      content = JSON.stringify(routes, null, 2);
    } else if (format === 'yaml') {
      // Simple YAML-like output (you might want to use a proper YAML library)
      content = routes.map(route => 
        `- method: ${route.method}\n  path: ${route.path}\n  resource: ${route.resource || 'unknown'}`
      ).join('\n');
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    writeFileSync(outputPath, content, 'utf8');
    console.log(chalk.gray(`Results saved to: ${chalk.bold(outputPath)}`));
  }

  private extractResourceName(path: string): string {
    const parts = path.split('/').filter(part => part.length > 0 && !part.startsWith(':'));
    const meaningfulParts = parts.filter(part => part !== 'api' && part !== 'v1');
    return meaningfulParts[0] || 'endpoint';
  }
}
