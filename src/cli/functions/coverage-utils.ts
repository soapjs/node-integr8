/**
 * Utilities for calculating and reporting coverage
 */

import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { CoverageReport, ExtendedRouteInfo } from '../../types';
import { TestedEndpoint } from './test-scanner-utils';
import { normalizePathForComparison } from './path-utils';

/**
 * Calculates coverage from all endpoints and tested endpoints
 */
export function calculateCoverage(
  allEndpoints: ExtendedRouteInfo[],
  testedEndpoints: TestedEndpoint[]
): CoverageReport {
  const tested: Array<{ method: string; path: string; testFile?: string }> = [];
  const untested: Array<{ method: string; path: string; source?: string }> = [];
  const byMethod: Record<string, { total: number; tested: number; percentage: number }> = {};

  // Create a set of tested endpoints for quick lookup
  const testedSet = new Set(
    testedEndpoints.map(e => `${e.method}:${normalizePathForComparison(e.path)}`)
  );

  // Check each endpoint
  for (const endpoint of allEndpoints) {
    const normalizedPath = normalizePathForComparison(endpoint.path);
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
        normalizePathForComparison(e.path) === normalizedPath
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

/**
 * Prints coverage report to console
 */
export function printReport(report: CoverageReport): void {
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
      const bar = createProgressBar(stats.percentage);
      const color = getColorForPercentage(stats.percentage);
      
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

/**
 * Creates a progress bar for coverage percentage
 */
export function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

/**
 * Gets color function based on percentage
 */
export function getColorForPercentage(percentage: number): (text: string) => string {
  if (percentage >= 80) return chalk.green;
  if (percentage >= 60) return chalk.yellow;
  return chalk.red;
}

/**
 * Saves coverage report to a JSON file
 */
export function saveReport(report: CoverageReport, outputPath: string): void {
  try {
    const json = JSON.stringify(report, null, 2);
    writeFileSync(outputPath, json, 'utf8');
    console.log(chalk.gray(`Report saved to: ${outputPath}`));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not save report to file'));
  }
}

