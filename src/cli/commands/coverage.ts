import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { execSync } from 'child_process';
import { DecoratorScanner, DecoratorRouteInfo } from '../../core/decorator-scanner';
import { Integr8Config, CoverageReport, ExtendedRouteInfo } from '../../types';
import { loadConfigFromFile } from '../../core/test-globals';

export interface CoverageOptions {
  config?: string;
  type?: 'api' | 'e2e' | 'integration';
  threshold?: number;
  output?: string;
}

export class CoverageCommand {
  private config!: Integr8Config;

  async execute(options: CoverageOptions): Promise<void> {
    console.log(chalk.blue('Analyzing endpoint coverage...\n'));
    try {
      this.config = await loadConfigFromFile(options.type, options.config);
      // 1. Scan all available endpoints
      console.log(chalk.blue('Scanning available endpoints...'));
      const allEndpoints = await this.scanAllEndpoints(options);
      console.log(chalk.gray(`   Found ${allEndpoints.length} endpoints\n`));

      // 2. Scan test files for tested endpoints
      console.log(chalk.blue('Scanning test files...'));
      const testedEndpoints = await this.scanTestFiles(options);
      console.log(chalk.gray(`   Found ${testedEndpoints.length} tested endpoints\n`));

      // 3. Calculate coverage
      const report = this.calculateCoverage(allEndpoints, testedEndpoints);

      // 4. Output report to console
      this.printReport(report);

      // 5. Save to JSON file
      const outputPath = options.output || this.config.coverage?.output || 'coverage-report.json';
      this.saveReport(report, outputPath);

      // 6. Check threshold
      const threshold = options.threshold ?? this.config.coverage?.threshold;
      if (threshold && threshold > 0) {
        if (report.summary.percentage < threshold) {
          console.log(chalk.red(`\n❌ Coverage ${report.summary.percentage.toFixed(1)}% is below threshold ${threshold}%`));
          process.exit(1);
        } else {
          console.log(chalk.green(`\n✅ Coverage ${report.summary.percentage.toFixed(1)}% meets threshold ${threshold}%`));
        }
      }

    } catch (error) {
      console.error(chalk.red('❌ Coverage analysis failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async scanAllEndpoints(options: CoverageOptions): Promise<ExtendedRouteInfo[]> {
    try {
      // Use scan with decorators if configured
      if (this.config.scan?.decorators) {
        const scanner = new DecoratorScanner(this.config.scan.decorators);
        const decoratorRoutes = await scanner.scanDecorators();
        
        return decoratorRoutes.map((route: DecoratorRouteInfo) => ({
          method: route.method,
          path: route.path,
          description: route.description,
          resource: this.extractResourceName(route.path),
          sourceFile: route.sourceFile,
          lineNumber: route.lineNumber,
          decorators: route.decorators
        }));
      }
      
      // Fallback to discovery command
      if (this.config.scan?.discovery?.command) {
        return await this.discoverFromCommand(
          this.config.scan.discovery.command,
          this.config.scan.discovery.timeout
        );
      }
      
      throw new Error('No scan configuration found. Add scan.decorators or scan.discovery to your config.');
    } catch (error) {
      throw new Error(`Failed to scan endpoints: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async discoverFromCommand(command: string, timeout?: number): Promise<ExtendedRouteInfo[]> {
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
      throw new Error(`Discovery command failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private normalizeRoutes(routes: any[]): ExtendedRouteInfo[] {
    return routes.map(route => ({
      method: route.method?.toUpperCase() || 'GET',
      path: route.path || '/',
      resource: route.resource || this.extractResourceName(route.path || '/'),
      endpoint: route.endpoint,
      description: route.description || ''
    }));
  }

  private extractResourceName(path: string): string {
    const parts = path.split('/').filter(part => part.length > 0 && !part.startsWith(':'));
    const meaningfulParts = parts.filter(part => part !== 'api' && part !== 'v1' && part !== 'v2');
    return meaningfulParts[0] || 'endpoint';
  }

  private async scanTestFiles(options: CoverageOptions): Promise<Array<{ method: string; path: string; testFile: string }>> {
    const testDir = this.config.testDir || './integr8/tests';
    
    if (!existsSync(testDir)) {
      console.warn(chalk.yellow(`⚠️  Test directory not found: ${testDir}`));
      return [];
    }

    const testedEndpoints: Array<{ method: string; path: string; testFile: string }> = [];
    const testFiles = this.findTestFiles(testDir);

    for (const testFile of testFiles) {
      try {
        const content = readFileSync(testFile, 'utf8');
        const endpoints = this.extractTestedEndpoints(content, testFile);
        testedEndpoints.push(...endpoints);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not read test file: ${testFile}`));
      }
    }

    return testedEndpoints;
  }

  private findTestFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.findTestFiles(fullPath));
        } else if (this.isTestFile(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directories that can't be read
    }
    
    return files;
  }

  private isTestFile(filePath: string): boolean {
    const ext = extname(filePath);
    const name = filePath.toLowerCase();
    return (ext === '.ts' || ext === '.js') && 
           (name.includes('.test.') || name.includes('.spec.'));
  }

  private extractTestedEndpoints(content: string, testFile: string): Array<{ method: string; path: string; testFile: string }> {
    const endpoints: Array<{ method: string; path: string; testFile: string }> = [];
    
    // Regex patterns to match HTTP calls:
    // ctx.getHttp().get('/users')
    // ctx.getHttp('app').post('/users', data)
    // await ctx.getHttp().delete('/users/123')
    
    const patterns = [
      // getHttp().method(path)
      /getHttp\(\)\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      // getHttp('name').method(path)
      /getHttp\s*\(\s*['"`][^'"`]*['"`]\s*\)\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let path = match[2];
        
        // Normalize path - remove query params
        path = this.normalizePath(path);
        
        endpoints.push({
          method,
          path,
          testFile
        });
      }
    }

    return endpoints;
  }

  private normalizePath(path: string): string {
    // Remove query parameters
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      path = path.substring(0, queryIndex);
    }
    
    // Ensure starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return path;
  }

  private calculateCoverage(
    allEndpoints: ExtendedRouteInfo[], 
    testedEndpoints: Array<{ method: string; path: string; testFile: string }>
  ): CoverageReport {
    const tested: Array<{ method: string; path: string; testFile?: string }> = [];
    const untested: Array<{ method: string; path: string; source?: string }> = [];
    const byMethod: Record<string, { total: number; tested: number; percentage: number }> = {};

    // Create a set of tested endpoints for quick lookup
    const testedSet = new Set(
      testedEndpoints.map(e => `${e.method}:${this.normalizePathForComparison(e.path)}`)
    );

    // Check each endpoint
    for (const endpoint of allEndpoints) {
      const normalizedPath = this.normalizePathForComparison(endpoint.path);
      const key = `${endpoint.method}:${normalizedPath}`;
      
      // Initialize method stats
      if (!byMethod[endpoint.method]) {
        byMethod[endpoint.method] = { total: 0, tested: 0, percentage: 0 };
      }
      byMethod[endpoint.method].total++;

      // Check if tested
      if (testedSet.has(key)) {
        const testInfo = testedEndpoints.find(e => 
          e.method === endpoint.method && 
          this.normalizePathForComparison(e.path) === normalizedPath
        );
        
        tested.push({
          method: endpoint.method,
          path: endpoint.path,
          testFile: testInfo?.testFile
        });
        byMethod[endpoint.method].tested++;
      } else {
        untested.push({
          method: endpoint.method,
          path: endpoint.path,
          source: (endpoint as any).sourceFile
        });
      }
    }

    // Calculate percentages
    for (const method in byMethod) {
      const stats = byMethod[method];
      stats.percentage = stats.total > 0 ? (stats.tested / stats.total) * 100 : 0;
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: allEndpoints.length,
        tested: tested.length,
        untested: untested.length,
        percentage: allEndpoints.length > 0 ? (tested.length / allEndpoints.length) * 100 : 0
      },
      byMethod,
      tested,
      untested
    };
  }

  private normalizePathForComparison(path: string): string {
    // Normalize path parameters for comparison
    // /users/123 -> /users/:id
    // /users/abc -> /users/:id
    // /posts/456/comments/789 -> /posts/:id/comments/:id
    
    return path.split('/').map(segment => {
      // If segment looks like a path param (number, uuid, etc.)
      if (this.looksLikeParam(segment)) {
        return ':id';
      }
      return segment;
    }).join('/');
  }

  private looksLikeParam(segment: string): boolean {
    // Check if segment looks like a parameter value
    if (!segment || segment.length === 0) return false;
    
    // Already a path param pattern
    if (segment.startsWith(':')) return false;
    
    // Looks like a number
    if (/^\d+$/.test(segment)) return true;
    
    // Looks like a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
    
    // Looks like MongoDB ObjectId
    if (/^[0-9a-f]{24}$/i.test(segment)) return true;
    
    // Very short segments might be IDs (but exclude common words)
    const commonWords = ['api', 'v1', 'v2', 'new', 'all', 'me'];
    if (segment.length <= 3 && /^[a-z0-9]+$/i.test(segment) && !commonWords.includes(segment.toLowerCase())) {
      return true;
    }
    
    return false;
  }

  private printReport(report: CoverageReport): void {
    console.log(chalk.bold.cyan('Endpoint Coverage Report'));
    console.log(chalk.cyan('━'.repeat(50)));
    console.log();

    // Summary
    const { summary } = report;
    console.log(chalk.bold('Summary:'));
    console.log(`  Total Endpoints:    ${chalk.bold(summary.total)}`);
    console.log(`  Tested Endpoints:   ${chalk.green(summary.tested)} (${chalk.green(summary.percentage.toFixed(1) + '%')})`);
    console.log(`  Untested Endpoints: ${chalk.red(summary.untested)} (${chalk.red((100 - summary.percentage).toFixed(1) + '%')})`);
    console.log();

    // By Method
    if (Object.keys(report.byMethod).length > 0) {
      console.log(chalk.bold('By HTTP Method:'));
      const methods = Object.keys(report.byMethod).sort();
      
      for (const method of methods) {
        const stats = report.byMethod[method];
        const bar = this.createProgressBar(stats.percentage);
        const color = this.getColorForPercentage(stats.percentage);
        
        const testedStr = stats.tested.toString().padStart(3);
        const totalStr = stats.total.toString().padStart(3);
        const fraction = `${testedStr}/${totalStr}`;
        
        console.log(`  ${method.padEnd(7)} ${fraction}  (${color(stats.percentage.toFixed(1) + '%').padEnd(6)})  ${bar}`);
      }
      console.log();
    }

    // Untested endpoints
    if (report.untested.length > 0) {
      console.log(chalk.bold.yellow(`⚠️  Untested Endpoints (${report.untested.length}):`));
      const limit = 20; // Show max 20
      const toShow = report.untested.slice(0, limit);
      
      for (const endpoint of toShow) {
        console.log(chalk.red(`  ❌ ${endpoint.method.padEnd(7)} ${endpoint.path}`));
        if (endpoint.source) {
          console.log(chalk.gray(`     Source: ${endpoint.source}`));
        }
      }
      
      if (report.untested.length > limit) {
        console.log(chalk.gray(`  ... and ${report.untested.length - limit} more`));
      }
      console.log();
    }
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  private getColorForPercentage(percentage: number): (text: string) => string {
    if (percentage >= 80) return chalk.green;
    if (percentage >= 60) return chalk.yellow;
    return chalk.red;
  }

  private saveReport(report: CoverageReport, outputPath: string): void {
    try {
      const json = JSON.stringify(report, null, 2);
      writeFileSync(outputPath, json, 'utf8');
      console.log(chalk.gray(`Report saved to: ${outputPath}`));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not save report to file'));
    }
  }
}
