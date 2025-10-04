import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { TestTemplateGenerator } from '../../core/test-template-generator';
import { RouteInfo, Integr8Config } from '../../types';
import { createConfig } from '../../utils/config';

export interface ScanOptions {
  command?: string;
  json?: string;
  type?: 'all' | 'only-new';
  output?: string;
  config?: string;
  format?: 'json' | 'yaml';
  timeout?: number;
}

export interface ExtendedRouteInfo extends RouteInfo {
  resource?: string; // Resource name for test file naming (e.g., "users")
  endpoint?: string; // Explicit endpoint name for test file naming (fallback)
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
  private config: Integr8Config;

  constructor(config?: Integr8Config) {
    this.config = config || createConfig({});
  }

  async execute(options: ScanOptions): Promise<void> {
    console.log('🔍 Starting endpoint scan...');
    
    try {
      // Load config if not provided
      if (!this.config) {
        this.config = await this.loadConfig(options.config);
      }

      // 1. Discovery
      const routes = await this.discoverRoutes(options);
      console.log(`📡 Found ${routes.length} endpoints`);
      
      // 2. Filter
      const filteredRoutes = await this.filterRoutes(routes, options);
      console.log(`📋 ${options.type === 'only-new' ? 'New' : 'All'} endpoints: ${filteredRoutes.length}`);
      
      // 3. Generate
      await this.generateTests(filteredRoutes, options);
      console.log('✅ Test generation completed!');
      
    } catch (error) {
      console.error('❌ Scan failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async loadConfig(configPath?: string): Promise<Integr8Config> {
    const configFile = configPath || 'integr8.config.js';
    
    if (existsSync(configFile)) {
      try {
        const config = require(resolve(configFile));
        return config.default || config;
      } catch (error) {
        console.log(`⚠️  Could not load config from ${configFile}, using defaults`);
      }
    }
    
    return createConfig({});
  }

  private async discoverRoutes(options: ScanOptions): Promise<ExtendedRouteInfo[]> {
    if (options.command) {
      return await this.discoverFromCommand(options.command, options.timeout);
    } else if (options.json) {
      return await this.discoverFromFile(options.json);
    } else if (this.config.endpointDiscovery?.command) {
      // Use config command if no explicit command provided
      return await this.discoverFromCommand(
        this.config.endpointDiscovery.command, 
        options.timeout || this.config.endpointDiscovery.timeout
      );
    } else {
      throw new Error('Either --command, --json must be provided, or endpointDiscovery.command must be configured');
    }
  }

  private async discoverFromCommand(command: string, timeout?: number): Promise<ExtendedRouteInfo[]> {
    console.log(`🚀 Running command: ${command}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: timeout || 10000
      });
      
      const routes = JSON.parse(output);
      return this.normalizeRoutes(routes);
      
    } catch (error) {
      throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async discoverFromFile(filePath: string): Promise<ExtendedRouteInfo[]> {
    console.log(`📄 Reading from file: ${filePath}`);
    
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
    
    const configPath = options.config || 'integr8.config.js';
    const outputDir = await this.getOutputDirectory(options, configPath);
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
      console.log('No new endpoints to generate tests for');
      return;
    }
    
    const configPath = options.config || 'integr8.config.js';
    const outputDir = await this.getOutputDirectory(options, configPath);
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }
    
    // Generate tests for each route
    for (const route of routes) {
      await this.generateTestForRoute(route, outputDir, configPath);
    }
  }

  private async getOutputDirectory(options: ScanOptions, configPath: string): Promise<string> {
    // If output is explicitly provided, use it
    if (options.output) {
      return options.output;
    }
    
    // Try to load config and get testDir
    try {
      if (existsSync(configPath)) {
        const config = require(resolve(configPath));
        const integr8Config = config.default || config;
        
        if (integr8Config.testDir) {
          return integr8Config.testDir;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not load config from ${configPath}, using default output directory`);
    }
    
    // Fallback to default
    return './integr8/tests';
  }

  private async generateTestForRoute(route: ExtendedRouteInfo, outputDir: string, configPath: string): Promise<void> {
    const { TestTemplateGenerator } = require('../../core/test-template-generator');
    
    // Priority: resource -> endpoint -> extract from path
    const endpointName = route.resource || route.endpoint || this.extractEndpointName(route.path);
    const fileName = `${endpointName}.${route.method.toLowerCase()}.test.ts`;
    const filePath = join(outputDir, fileName);
    
    // Skip if file already exists
    if (existsSync(filePath)) {
      console.log(`⏭️  Skipping existing file: ${fileName}`);
      return;
    }
    
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: outputDir,
      testFramework: 'jest',
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: configPath,
      routesConfig: {} // Empty for individual endpoint tests
    });

    // Enhance route with test scenarios based on response codes
    const enhancedRoute = this.enhanceRouteWithScenarios(route);
    
    const template = generator.generateSingleEndpointTemplate(enhancedRoute);
    
    writeFileSync(filePath, template.content);
    console.log(`📝 Generated: ${fileName}`);
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
      scenarios.push({
        description: `should handle ${route.method} request`,
        expectedStatus: this.getDefaultStatus(route.method),
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
    switch (method.toUpperCase()) {
      case 'GET': return 200;
      case 'POST': return 201;
      case 'PUT': return 200;
      case 'PATCH': return 200;
      case 'DELETE': return 204;
      default: return 200;
    }
  }
}
