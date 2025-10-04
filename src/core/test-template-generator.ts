import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RouteDiscoveryService } from './route-discovery-service';
import { RouteInfo, RoutesConfig, TestScenario } from '../types';

export interface TestTemplate {
  fileName: string;
  content: string;
  controller: string;
  routes: RouteInfo[];
}

export interface TestTemplateOptions {
  outputDir: string;
  testFramework: 'jest' | 'vitest';
  includeSetup: boolean;
  includeTeardown: boolean;
  customImports?: string[];
  templateType: 'endpoint' | 'sample';
  generateScenarios?: boolean;
  defaultScenarios?: TestScenario[];
  routesConfig?: RoutesConfig;
  configPath?: string;
}

export class TestTemplateGenerator {
  private options: TestTemplateOptions;
  private endpointTemplate!: HandlebarsTemplateDelegate;
  private sampleTemplate!: HandlebarsTemplateDelegate;
  public setupTeardownTemplate!: HandlebarsTemplateDelegate;

  constructor(options: TestTemplateOptions) {
    this.options = options;
    this.setupHandlebars();
    this.loadTemplates();
  }

  private setupHandlebars(): void {
    // Register helper for lowercase
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str.toLowerCase();
    });

    // Register helper for equality
    Handlebars.registerHelper('eq', (a: string, b: string) => {
      return a === b;
    });

    // Register helper for endsWith
    Handlebars.registerHelper('endsWith', (str: string, suffix: string) => {
      return str.endsWith(suffix);
    });

    // Register helper for calculating relative path
    Handlebars.registerHelper('relativePath', (fromPath: string, toPath: string) => {
      const path = require('path');
      const relative = path.relative(path.dirname(fromPath), toPath);
      return relative.replace(/\\/g, '/'); // Normalize for cross-platform
    });

    // Register helper for JSON serialization
    Handlebars.registerHelper('json', (obj: any) => {
      return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
    });
  }

  private loadTemplates(): void {
    const templatesDir = join(__dirname, '../templates');
    
    // Load setup-teardown template
    const setupTeardownTemplatePath = join(templatesDir, 'setup-teardown.hbs');
    const setupTeardownTemplateSource = readFileSync(setupTeardownTemplatePath, 'utf8');
    this.setupTeardownTemplate = Handlebars.compile(setupTeardownTemplateSource);
    
    // Register setup-teardown partial
    Handlebars.registerPartial('setup-teardown', this.setupTeardownTemplate);
    
    // Load endpoint template
    const endpointTemplatePath = join(templatesDir, 'endpoint.test.hbs');
    const endpointTemplateSource = readFileSync(endpointTemplatePath, 'utf8');
    this.endpointTemplate = Handlebars.compile(endpointTemplateSource);

    // Load sample template
    const sampleTemplatePath = join(templatesDir, 'sample.test.hbs');
    const sampleTemplateSource = readFileSync(sampleTemplatePath, 'utf8');
    this.sampleTemplate = Handlebars.compile(sampleTemplateSource);
  }

  async generateAllTemplates(routes?: RouteInfo[]): Promise<TestTemplate[]> {
    if (this.options.templateType === 'sample') {
      return [this.generateSampleTemplate()];
    }
    
    const routesToUse = routes || await this.discoverRoutes();
    
    if (this.options.templateType === 'endpoint') {
      return this.generateEndpointTemplates(routesToUse);
    } else {
      throw new Error(`Unknown template type: ${this.options.templateType}`);
    }
  }

  // Dedicated methods for each template type
  generateSampleTest(): TestTemplate {
    return this.generateSampleTemplate();
  }

  async generateEndpointTests(routes?: RouteInfo[]): Promise<TestTemplate[]> {
    const routesToUse = routes || await this.discoverRoutes();
    return this.generateEndpointTemplates(routesToUse);
  }

  generateSingleEndpointTemplate(route: RouteInfo): TestTemplate {
    return this.generateEndpointTemplate(route);
  }

  async discoverRoutes(): Promise<RouteInfo[]> {
    if (!this.options.routesConfig) {
      throw new Error('No routes configuration provided');
    }

    const discoveryService = new RouteDiscoveryService(this.options.routesConfig);
    return await discoveryService.discoverRoutes();
  }

  // Static factory methods for easier usage
  static createSampleGenerator(options: Omit<TestTemplateOptions, 'templateType' | 'routesConfig'>): TestTemplateGenerator {
    return new TestTemplateGenerator({
      ...options,
      templateType: 'sample'
    });
  }


  static createEndpointGenerator(options: Omit<TestTemplateOptions, 'templateType'>): TestTemplateGenerator {
    return new TestTemplateGenerator({
      ...options,
      templateType: 'endpoint'
    });
  }


  private generateEndpointTemplates(routes: RouteInfo[]): TestTemplate[] {
    return routes.map(route => this.generateEndpointTemplate(route));
  }


  private generateEndpointTemplate(route: RouteInfo): TestTemplate {
    const fileName = this.generateEndpointFileName(route);
    const testFilePath = join(this.options.outputDir, fileName);
    
    const templateData = {
      endpoint: route,
      imports: this.generateImports(),
      setup: this.options.includeSetup,
      teardown: this.options.includeTeardown,
      configPath: this.options.configPath || '../../integr8.api.config.js',
      testFilePath: testFilePath
    };

    const content = this.endpointTemplate(templateData);

    return {
      fileName,
      content,
      controller: route.controller || 'api',
      routes: [route]
    };
  }

  private generateSampleTemplate(): TestTemplate {
    const fileName = 'sample.integration.test.ts';
    const testFilePath = join(this.options.outputDir, fileName);
    
    const templateData = {
      imports: this.generateImports(),
      setup: this.options.includeSetup,
      teardown: this.options.includeTeardown,
      configPath: this.options.configPath || '../integr8.config.js',
      testFilePath: testFilePath
    };

    const content = this.sampleTemplate(templateData);

    return {
      fileName,
      content,
      controller: 'sample',
      routes: []
    };
  }


  private generateEndpointFileName(route: RouteInfo): string {
    const method = route.method.toLowerCase();
    const path = route.path
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/:/g, '')
      .replace(/\{|\}/g, '')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${method}-${path}.integration.test.ts`;
  }


  private generateTestScenarios(route: RouteInfo): TestScenario[] {
    if (!this.options.generateScenarios) {
      return [{
        description: `should handle ${route.method} ${route.path}`,
        expectedStatus: this.getDefaultStatus(route.method)
      }];
    }

    const scenarios: TestScenario[] = [];
    const method = route.method.toUpperCase();

    // Success scenario
    scenarios.push({
      description: `should successfully handle ${method} ${route.path}`,
      expectedStatus: this.getDefaultStatus(method),
      requestData: this.generateRequestData(method),
      queryParams: this.generateQueryParams(route.path),
      pathParams: this.generatePathParams(route.path)
    });

    // Error scenarios based on method
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      scenarios.push({
        description: `should return 400 for invalid data on ${method} ${route.path}`,
        expectedStatus: 400,
        requestData: this.generateInvalidRequestData(method)
      });
    }

    if (method === 'GET' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      scenarios.push({
        description: `should return 404 for non-existent resource on ${method} ${route.path}`,
        expectedStatus: 404,
        pathParams: this.generateNonExistentPathParams(route.path)
      });
    }

    // Authentication scenarios
    scenarios.push({
      description: `should return 401 for unauthorized access to ${method} ${route.path}`,
      expectedStatus: 401
    });

    return scenarios;
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

  private generateRequestData(method: string): any {
    switch (method.toUpperCase()) {
      case 'POST':
      case 'PUT':
      case 'PATCH':
        return {
          // TODO: Add request data
          name: 'Test Name',
          email: 'test@example.com'
        };
      default:
        return undefined;
    }
  }

  private generateInvalidRequestData(method: string): any {
    return {
      // TODO: Add invalid request data
      name: '',
      email: 'invalid-email'
    };
  }

  private generateQueryParams(path: string): any {
    if (path.includes('?')) {
      return {
        // TODO: Add query parameters
        page: 1,
        limit: 10
      };
    }
    return undefined;
  }

  private generatePathParams(path: string): any {
    if (path.includes(':')) {
      return {
        // TODO: Add path parameters
        id: 'test-id'
      };
    }
    return undefined;
  }

  private generateNonExistentPathParams(path: string): any {
    if (path.includes(':')) {
      return {
        // TODO: Add non-existent path parameters
        id: 'non-existent-id'
      };
    }
    return undefined;
  }

  private generateImports(): Record<string, string[]> {
    const imports: Record<string, string[]> = {};
    
    // Always include basic integr8 imports
    imports['@soapjs/integr8'] = ['setupEnvironment', 'teardownEnvironment', 'getEnvironmentContext'];
    
    // Add custom imports if provided
    if (this.options.customImports) {
      this.options.customImports.forEach(importStr => {
        const parts = importStr.split(' ');
        const module = parts[0];
        const importsList = parts.slice(1);
        if (module && importsList.length > 0) {
          imports[module] = importsList;
        }
      });
    }
    
    return imports;
  }

  // Generate coverage analysis
  generateCoverageReport(testedRoutes: string[]): APICoverageReport {
    // This will be implemented when we have the actual routes
    return {
      totalRoutes: 0,
      testedRoutes: 0,
      untestedRoutes: 0,
      coveragePercentage: 0,
      routes: [],
      untestedRoutesList: []
    };
  }
}

export interface APICoverageReport {
  totalRoutes: number;
  testedRoutes: number;
  untestedRoutes: number;
  coveragePercentage: number;
  routes: RouteCoverage[];
  untestedRoutesList: RouteCoverage[];
}

export interface RouteCoverage {
  method: string;
  path: string;
  controller?: string;
  tested: boolean;
  testFile?: string;
}
