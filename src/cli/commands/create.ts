import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TestTemplateGenerator } from '../../core/test-template-generator';
import { RouteInfo, Integr8Config } from '../../types';
import { loadConfigFromFile } from '../../core/test-globals';
import {
  normalizeUrlToPath,
  extractControllerFromPath,
  extractGroupFromPath,
  UrlConfig,
  normalizeUrlConfigs,
  groupUrlsByResource,
  enhanceRouteWithConfig,
  extractDescribeBlock,
  mergeTestContent
} from '../functions';

export interface CreateOptions {
  testType: 'api';
  testFramework: 'jest' | 'vitest';
  testDir: string;
  urls?: string;
  url?: string;
  method?: string;
  body?: string;
  queryParams?: string;
  pathParams?: string;
  expectedStatus?: number;
  expectedResponse?: string;
  config?: string;
}

export class CreateCommand {
  private config!: Integr8Config;
  private baseUrl: string = '';

  async execute(options: CreateOptions): Promise<void> {
    console.log(chalk.blue('Creating test files...'));
    
    try {
      this.config = await loadConfigFromFile(options.testType, options.config);

      this.baseUrl = this.detectBaseUrl();
      console.log(chalk.blue(`Detected base URL: ${this.baseUrl}`));

      const testDir = options.testDir || this.config.testDir || './integr8/tests';
      options.testDir = testDir;

      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
        console.log(chalk.green(`Created test directory: ${testDir}`));
      }
      
      if (options.urls) {
        await this.createFromJsonFile(options);
      } else if (options.url) {
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

    const containerService = this.config.services?.find(service =>
      service.type === 'service' && service.container?.ports
    );

    if (containerService && containerService.container?.ports && containerService.container.ports.length > 0) {
      const port = containerService.container.ports[0];
      return `http://localhost:${port}`;
    }

    return 'http://localhost:3000';
  }

  private async createFromJsonFile(options: CreateOptions): Promise<void> {
    console.log(chalk.blue(`Reading URLs from: ${options.urls}`));
    
    if (!existsSync(options.urls!)) {
      throw new Error(`File not found: ${options.urls}`);
    }

    try {
      const content = readFileSync(options.urls!, 'utf8');
      let jsonData = JSON.parse(content);
      
      let urlConfigs: UrlConfig[] = [];
      
      if (Array.isArray(jsonData)) {
        urlConfigs = normalizeUrlConfigs(jsonData);
      } else if (jsonData.routes && Array.isArray(jsonData.routes)) {
        urlConfigs = normalizeUrlConfigs(jsonData.routes);
      } else if (jsonData.endpoints && Array.isArray(jsonData.endpoints)) {
        urlConfigs = normalizeUrlConfigs(jsonData.endpoints);
      } else {
        throw new Error('JSON must be an array or contain "routes" or "endpoints" array property');
      }
      
      console.log(chalk.blue(`Found ${urlConfigs.length} URLs to process`));
      
      if (urlConfigs.length === 0) {
        throw new Error('No valid URL configurations found in JSON file');
      }
      
      const groupedConfigs = groupUrlsByResource(
        urlConfigs,
        (url) => normalizeUrlToPath(url, this.baseUrl)
      );
      
      for (const [resourceKey, configs] of groupedConfigs) {
        await this.createMergedTestFile(configs, options, resourceKey);
      }
      
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  private async createMergedTestFile(
    urlConfigs: UrlConfig[],
    options: CreateOptions,
    resourceKey: string | null
  ): Promise<void> {
    if (urlConfigs.length === 0) return;
    
    const firstConfig = urlConfigs[0];
    const path = normalizeUrlToPath(firstConfig.url, this.baseUrl);
    
    const endpointName = firstConfig.resource || path.split('/').filter(Boolean)[0] || 'api';
    const type = options.testType || 'api';
    const fileName = `${endpointName}.${type}.test.ts`;
    const filePath = join(options.testDir, fileName);
    
    let existingContent = '';
    if (existsSync(filePath)) {
      console.log(chalk.yellow(`Merging with existing file: ${fileName}`));
      existingContent = readFileSync(filePath, 'utf8');
    }
    
    const generator = TestTemplateGenerator.createEndpointGenerator({
      outputDir: options.testDir,
      testFramework: options.testFramework,
      includeSetup: true,
      includeTeardown: true,
      customImports: ['@soapjs/integr8'],
      configPath: options.config || 'integr8.api.config.js',
      routesConfig: {}
    });
    
    const newTestBlocks: string[] = [];
    
    for (const urlConfig of urlConfigs) {
      const route: RouteInfo = {
        method: (urlConfig.method || 'GET').toUpperCase(),
        path: normalizeUrlToPath(urlConfig.url, this.baseUrl),
        controller: extractControllerFromPath(normalizeUrlToPath(urlConfig.url, this.baseUrl)),
        group: extractGroupFromPath(normalizeUrlToPath(urlConfig.url, this.baseUrl))
      };
      
      const enhancedRoute = enhanceRouteWithConfig(route, urlConfig);
      const template = generator.generateSingleEndpointTemplate(enhancedRoute);
      
      const describeBlock = extractDescribeBlock(template.content);
      if (describeBlock) {
        newTestBlocks.push(describeBlock);
      }
    }
    
    const configPath = options.config || 'integr8.api.config.js';
    const finalContent = mergeTestContent(existingContent, newTestBlocks, generator, filePath, configPath);
    
    writeFileSync(filePath, finalContent);
    console.log(chalk.green(`Created/Updated: ${fileName}`));
  }
}
