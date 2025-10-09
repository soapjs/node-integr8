import chalk from 'chalk';
import { Integr8Config, CoverageReport } from '../../types';
import { loadConfigFromFile } from '../../core/test-globals';
import { 
  scanDecorators, 
  discoverFromCommand as discoverEndpointsFromCommand,
  ExtendedRouteInfo 
} from '../functions';
import { 
  scanTestFiles, 
  TestedEndpoint 
} from '../functions';
import { 
  calculateCoverage, 
  printReport, 
  saveReport 
} from '../functions';

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
      const allEndpoints = await this.scanAllEndpoints();
      console.log(chalk.gray(`   Found ${allEndpoints.length} endpoints\n`));

      // 2. Scan test files for tested endpoints
      console.log(chalk.blue('Scanning test files...'));
      const testDir = this.config.testDir || './integr8/tests';
      const testedEndpoints = await scanTestFiles(testDir);
      console.log(chalk.gray(`   Found ${testedEndpoints.length} tested endpoints\n`));

      // 3. Calculate coverage
      const report = calculateCoverage(allEndpoints, testedEndpoints);

      // 4. Output report to console
      printReport(report);

      // 5. Save to JSON file
      const outputPath = options.output || this.config.coverage?.output || 'coverage-report.json';
      saveReport(report, outputPath);

      // 6. Check threshold
      this.checkThreshold(report, options);

    } catch (error) {
      console.error(chalk.red('❌ Coverage analysis failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async scanAllEndpoints(): Promise<ExtendedRouteInfo[]> {
    try {
      // Use scan with decorators if configured
      if (this.config.scan?.decorators) {
        return await scanDecorators(this.config.scan.decorators);
      }
      
      // Fallback to discovery command
      if (this.config.scan?.discovery?.command) {
        return await discoverEndpointsFromCommand(
          this.config.scan.discovery.command,
          this.config.scan.discovery.timeout
        );
      }
      
      throw new Error('No scan configuration found. Add scan.decorators or scan.discovery to your config.');
    } catch (error) {
      throw new Error(`Failed to scan endpoints: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private checkThreshold(report: CoverageReport, options: CoverageOptions): void {
    const threshold = options.threshold ?? this.config.coverage?.threshold;
    if (threshold && threshold > 0) {
      if (report.summary.percentage < threshold) {
        console.log(chalk.red(`\n❌ Coverage ${report.summary.percentage.toFixed(1)}% is below threshold ${threshold}%`));
        process.exit(1);
      } else {
        console.log(chalk.green(`\n✅ Coverage ${report.summary.percentage.toFixed(1)}% meets threshold ${threshold}%`));
      }
    }
  }
}
