import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TestTemplateGenerator } from '../../core/test-template-generator';
import { RouteInfo, Integr8Config } from '../../types';
import { loadConfigFromFile } from '../../core/test-globals';

export interface CreateOptions {
  testType: 'api';
  testFramework: 'jest' | 'vitest';
  testDir: string;
  urls?: string; // Path to JSON file with URLs
  url?: string; // Single URL
  method?: string;
  body?: string;
  queryParams?: string;
  pathParams?: string;
  expectedStatus?: number;
  expectedResponse?: string;
  config?: string;
}

export interface UrlConfig {
  url: string;
  method?: string;
  resource?: string; // Resource name for test file naming (e.g., "users")
  endpoint?: string; // Explicit endpoint name for test file naming (fallback)
  body?: any;
  queryParams?: any;
  pathParams?: any;
  expectedStatus?: number;
  expectedResponse?: any;
  description?: string;
}

export class CreateCommand {
  private config!: Integr8Config;
  private baseUrl: string = '';
  private templateGenerator?: TestTemplateGenerator;

  async execute(options: CreateOptions): Promise<void> {
    console.log(chalk.blue('Creating test files...'));
    
    try {
      this.config = await loadConfigFromFile(options.testType, options.config);

      // Detect baseUrl from config
      this.baseUrl = this.detectBaseUrl();
      console.log(chalk.blue(`Detected base URL: ${this.baseUrl}`));

      const testDir = options.testDir || this.config.testDir || './integr8/tests';
      
      // Update options with resolved testDir
      options.testDir = testDir;

      // Ensure test directory exists
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
        console.log(chalk.green(`Created test directory: ${testDir}`));
      }
      
      if (options.urls) {
        // Create tests from JSON file
        await this.createFromJsonFile(options);
      } else if (options.url) {
        // Create test from single URL
        await this.createFromSingleUrl(options);
      } else {
        throw new Error('Either --urls or --url must be provided');
      }

      console.log(chalk.green('✅ Test files created successfully!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to create test files:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private detectBaseUrl(): string {
    // Look for app service with http config
    const appService = this.config.services?.find(service => 
      service.type === 'service' && service.http
    );

    if (appService && appService.http) {
      if (appService.http.baseUrl) {
        return appService.http.baseUrl;
      }
      if (appService.http.port) {
        return `http://localhost:${appService.http.port}`;
      }
    }

    // Look for service with container ports
    const containerService = this.config.services?.find(service => 
      service.type === 'service' && service.container?.ports
    );

    if (containerService && containerService.container?.ports && containerService.container.ports.length > 0) {
      const port = containerService.container.ports[0];
      return `http://localhost:${port}`;
    }

    // Fallback to default
    return 'http://localhost:3000';
  }

  private normalizeUrlToPath(url: string | undefined): string {
    // Handle undefined or null
    if (!url) {
      console.warn(chalk.yellow('⚠️  URL is undefined, using default path /'));
      return '/';
    }
    
    try {
      // If URL contains the detected baseUrl, extract the path
      if (url.startsWith(this.baseUrl)) {
        const path = url.substring(this.baseUrl.length);
        return path.startsWith('/') ? path : '/' + path;
      }

      // If URL is a full URL, extract pathname
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch (error) {
      // If URL parsing fails, assume it's already a path
      return url.startsWith('/') ? url : '/' + url;
    }
  }

  private async createFromJsonFile(options: CreateOptions): Promise<void> {
    console.log(chalk.blue(`Reading URLs from: ${options.urls}`));
    
    if (!existsSync(options.urls!)) {
      throw new Error(`File not found: ${options.urls}`);
    }

    try {
      const content = readFileSync(options.urls!, 'utf8');
      let jsonData = JSON.parse(content);
      
      // Normalize JSON structure - handle different formats
      let urlConfigs: UrlConfig[] = [];
      
      if (Array.isArray(jsonData)) {
        urlConfigs = this.normalizeUrlConfigs(jsonData);
      } else if (jsonData.routes && Array.isArray(jsonData.routes)) {
        urlConfigs = this.normalizeUrlConfigs(jsonData.routes);
      } else if (jsonData.endpoints && Array.isArray(jsonData.endpoints)) {
        urlConfigs = this.normalizeUrlConfigs(jsonData.endpoints);
      } else {
        throw new Error('JSON must be an array or contain "routes" or "endpoints" array property');
      }
      
      console.log(chalk.blue(`Found ${urlConfigs.length} URLs to process`));
      
      // Validate that we have at least one valid config
      if (urlConfigs.length === 0) {
        throw new Error('No valid URL configurations found in JSON file');
      }
      
      // Group URLs by resource to merge tests for the same resource
      const groupedConfigs = this.groupUrlsByResource(urlConfigs);
      
      for (const [resourceKey, configs] of groupedConfigs) {
        await this.createMergedTestFile(configs, options, resourceKey);
      }
      
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private normalizeUrlConfigs(items: any[]): UrlConfig[] {
    return items.map(item => {
      // Handle different possible structures
      return {
        url: item.url || item.path || item.endpoint || '',
        method: item.method || item.verb || item.httpMethod || 'GET',
        resource: item.resource || item.name || undefined,
        endpoint: item.endpoint || undefined,
        body: item.body || item.requestBody || item.data || undefined,
        queryParams: item.queryParams || item.query || undefined,
        pathParams: item.pathParams || item.params || undefined,
        expectedStatus: item.expectedStatus || item.status || undefined,
        expectedResponse: item.expectedResponse || item.response || undefined,
        description: item.description || undefined
      };
    }).filter(config => config.url && config.url.length > 0); // Filter out invalid entries
  }

  private async createFromSingleUrl(options: CreateOptions): Promise<void> {
    console.log(chalk.blue(`Creating test for: ${options.url}`));
    
    const urlConfig: UrlConfig = {
      url: options.url!,
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body) : undefined,
      queryParams: options.queryParams ? JSON.parse(options.queryParams) : undefined,
      pathParams: options.pathParams ? JSON.parse(options.pathParams) : undefined,
      expectedStatus: options.expectedStatus,
      expectedResponse: options.expectedResponse ? JSON.parse(options.expectedResponse) : undefined
    };

    await this.createMergedTestFile([urlConfig], options, null);
  }

  private async createTestFile(urlConfig: UrlConfig, options: CreateOptions): Promise<void> {
    // Normalize URL to extract path
    const path = this.normalizeUrlToPath(urlConfig.url);
    const method = (urlConfig.method || 'GET').toUpperCase();
    
    // Create route info
    const route: RouteInfo = {
      method,
      path,
      controller: this.extractControllerFromPath(path),
      group: this.extractGroupFromPath(path)
    };

    // Generate filename: <resource>.<method>.api.test.ts
    // Priority: resource -> endpoint -> extract from path
    const endpointName = urlConfig.resource || urlConfig.endpoint || this.extractEndpointName(path);
    const fileName = `${endpointName}.${method.toLowerCase()}.api.test.ts`;
    const filePath = join(options.testDir, fileName);

    // Skip if file already exists
    if (existsSync(filePath)) {
      console.log(chalk.yellow(`Skipping existing file: ${fileName}`));
      return;
    }

    // Create test template generator
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: options.testDir,
      testFramework: options.testFramework,
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: options.config || 'integr8.api.config.js',
      routesConfig: {}
    });

    // Enhance route with test scenarios
    const enhancedRoute = this.enhanceRouteWithConfig(route, urlConfig);
    
    // Generate test content
    const template = generator.generateSingleEndpointTemplate(enhancedRoute);
    
    // Write file
    writeFileSync(filePath, template.content);
    console.log(chalk.green(`Created: ${fileName}`));
  }

  private extractControllerFromPath(path: string): string {
    const parts = path.split('/').filter(part => part.length > 0);
    if (parts.length === 0) return 'RootController';
    
    // Get the first meaningful part
    const firstPart = parts[0];
    return this.capitalize(firstPart) + 'Controller';
  }

  private extractGroupFromPath(path: string): string {
    const parts = path.split('/').filter(part => part.length > 0);
    if (parts.length === 0) return 'api';
    
    return parts[0];
  }

  private extractParamsFromPath(path: string): string[] {
    const matches = path.match(/:([^/]+)/g);
    return matches ? matches.map(match => match.substring(1)) : [];
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

  private enhanceRouteWithConfig(route: RouteInfo, urlConfig: UrlConfig): any {
    const scenarios = [];
    
    // Create test scenario based on URL config
    const scenario = {
      description: urlConfig.description || `should handle ${route.method} request`,
      expectedStatus: urlConfig.expectedStatus || this.getDefaultStatus(route.method),
      requestData: urlConfig.body,
      queryParams: urlConfig.queryParams,
      pathParams: urlConfig.pathParams,
      expectedResponse: urlConfig.expectedResponse
    };
    
    scenarios.push(scenario);
    
    return {
      ...route,
      testScenarios: scenarios
    };
  }

  private getDefaultStatus(method: string): number {
    // Returns conventional HTTP status codes for REST APIs
    // Note: DELETE can return 200 (with body) or 204 (no content) - 204 is used as default
    // If your API uses different status codes, specify expectedStatus in the URL config
    switch (method.toUpperCase()) {
      case 'GET': return 200;
      case 'POST': return 201;
      case 'PUT': return 200;
      case 'PATCH': return 200;
      case 'DELETE': return 204; // Some APIs return 200 instead
      default: return 200;
    }
  }

  private groupUrlsByResource(urlConfigs: UrlConfig[]): Map<string, UrlConfig[]> {
    const grouped = new Map<string, UrlConfig[]>();
    
    for (const urlConfig of urlConfigs) {
      const path = this.normalizeUrlToPath(urlConfig.url);
      const method = (urlConfig.method || 'GET').toUpperCase();
      
      // Extract resource name from path
      const resourceName = this.extractResourceName(path);
      
      // Group by resource name only, not by method
      if (!grouped.has(resourceName)) {
        grouped.set(resourceName, []);
      }
      grouped.get(resourceName)!.push(urlConfig);
    }
    
    return grouped;
  }

  private extractResourceName(path: string): string {
    // Extract the main resource from path (e.g., /users/:id -> users, /api/users -> users)
    const parts = path.split('/').filter(part => part.length > 0 && !part.startsWith(':'));
    
    if (parts.length === 0) {
      return 'root';
    }
    
    // Skip 'api' and 'v1' if they are the first parts
    const meaningfulParts = parts.filter(part => part !== 'api' && part !== 'v1');
    
    if (meaningfulParts.length === 0) {
      return 'api';
    }
    
    // Get the first meaningful part (main resource name)
    let resourceName = meaningfulParts[0];
    
    // Clean up the resource name
    resourceName = resourceName.replace(/[^a-zA-Z0-9]/g, '');
    
    return resourceName || '';
  }

  private async createMergedTestFile(urlConfigs: UrlConfig[], options: CreateOptions, resourceKey: string | null): Promise<void> {
    if (urlConfigs.length === 0) return;
    
    // Use the first URL config to determine file naming
    const firstConfig = urlConfigs[0];
    const path = this.normalizeUrlToPath(firstConfig.url);
    
    // Generate filename based on resource only (not method)
    const endpointName = firstConfig.resource || this.extractResourceName(path);
    const type = options.testType || 'api';

    const fileName = `${endpointName}.${type}.test.ts`;
    const filePath = join(options.testDir, fileName);
    
    // Check if file already exists
    let existingContent = '';
    if (existsSync(filePath)) {
      console.log(chalk.yellow(`Merging with existing file: ${fileName}`));
      existingContent = readFileSync(filePath, 'utf8');
    }
    
    // Create test template generator
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: options.testDir,
      testFramework: options.testFramework,
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: options.config || 'integr8.api.config.js',
      routesConfig: {}
    });
    
    // Store generator for use in mergeTestContent
    this.templateGenerator = generator;
    
    // Generate content for all URL configs
    const newTestBlocks: string[] = [];
    
    for (const urlConfig of urlConfigs) {
      const route: RouteInfo = {
        method: (urlConfig.method || 'GET').toUpperCase(),
        path: this.normalizeUrlToPath(urlConfig.url),
        controller: this.extractControllerFromPath(this.normalizeUrlToPath(urlConfig.url)),
        group: this.extractGroupFromPath(this.normalizeUrlToPath(urlConfig.url))
      };
      
      const enhancedRoute = this.enhanceRouteWithConfig(route, urlConfig);
      const template = generator.generateSingleEndpointTemplate(enhancedRoute);
      
      // Extract just the describe block from the generated content
      const describeBlock = this.extractDescribeBlock(template.content);
      if (describeBlock) {
        newTestBlocks.push(describeBlock);
      }
    }
    
    // Merge with existing content or create new file
    const configPath = options.config || 'integr8.api.config.js';
    const finalContent = this.mergeTestContent(existingContent, newTestBlocks, generator, filePath, configPath);
    
    // Write file
    writeFileSync(filePath, finalContent);
    console.log(chalk.green(`Created/Updated: ${fileName}`));
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

  private mergeTestContent(existingContent: string, newTestBlocks: string[], generator: TestTemplateGenerator, testFilePath: string, configPath?: string): string {
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
    // Match: describe('GET /users', ...
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


  private generateSetupTeardownFromTemplate(generator: TestTemplateGenerator, testFilePath: string, configPath?: string): string {
    // Use the setup-teardown template from the generator
    const templateData = {
      setup: true,
      teardown: true,
      configPath: configPath || 'integr8.api.config.js', // Pass original config path, let template calculate relative
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
  const configModule = require('../integr8.api.config.js');
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

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
