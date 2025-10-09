/**
 * Utilities for discovering endpoints from various sources
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import { DecoratorScanner, DecoratorRouteInfo } from '../../core/decorator-scanner';
import { ExtendedRouteInfo } from './route-utils';
import { extractResourceName, normalizePath } from './path-utils';

/**
 * Discovers routes by running a command
 */
export async function discoverFromCommand(
  command: string,
  timeout?: number,
  normalizePathFn?: (path: string) => string
): Promise<ExtendedRouteInfo[]> {
  console.log(chalk.blue(`Running command: ${chalk.bold(command)}`));
  
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: Number(timeout || 10000)
    });
    
    const routes = JSON.parse(output);
    const normalize = normalizePathFn || normalizePath;
    
    return routes.map((route: any) => ({
      method: route.method?.toUpperCase() || 'GET',
      path: normalize(route.path || '/'),
      resource: route.resource,
      endpoint: route.endpoint,
      group: route.group || route.resource || 'api',
      middleware: route.middleware || [],
      params: route.params || [],
      request: route.request || {},
      response: route.response || {},
      description: route.description || ''
    }));
  } catch (error) {
    throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Discovers routes from a JSON file
 */
export async function discoverFromFile(
  filePath: string,
  normalizePathFn?: (path: string) => string
): Promise<ExtendedRouteInfo[]> {
  console.log(chalk.cyan(`Reading from file: ${chalk.bold(filePath)}`));
  
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const routes = JSON.parse(content);
    const normalize = normalizePathFn || normalizePath;
    
    return routes.map((route: any) => ({
      method: route.method?.toUpperCase() || 'GET',
      path: normalize(route.path || '/'),
      resource: route.resource,
      endpoint: route.endpoint,
      group: route.group || route.resource || 'api',
      middleware: route.middleware || [],
      params: route.params || [],
      request: route.request || {},
      response: route.response || {},
      description: route.description || ''
    }));
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Scans decorators to discover routes
 */
export async function scanDecorators(
  decoratorConfig: any,
  getDefaultStatusFn?: (method: string) => number
): Promise<ExtendedRouteInfo[]> {
  if (!decoratorConfig) {
    console.warn('⚠️  Decorator scanning not configured. Add scan.decorators to your config file');
    return [];
  }

  const scanner = new DecoratorScanner(decoratorConfig);
  const decoratorRoutes = await scanner.scanDecorators();
  const getDefaultStatus = getDefaultStatusFn || ((method: string) => 200);

  return decoratorRoutes.map((route: DecoratorRouteInfo) => ({
    method: route.method,
    path: route.path,
    description: route.description,
    resource: extractResourceName(route.path),
    expectedStatus: route.decorators?.httpCode || getDefaultStatus(route.method),
    sourceFile: route.sourceFile,
    lineNumber: route.lineNumber,
    decorators: route.decorators
  }));
}

/**
 * Scans decorators with custom paths (file or directory override)
 */
export async function scanDecoratorsWithPaths(
  decoratorConfig: any,
  file?: string,
  dir?: string,
  getDefaultStatusFn?: (method: string) => number
): Promise<ExtendedRouteInfo[]> {
  if (!decoratorConfig) {
    console.warn('⚠️  Decorator scanning not configured. Add scan.decorators to your config file');
    return [];
  }

  const scanConfig = { ...decoratorConfig };
  
  if (file || dir) {
    const paths: string[] = [];
    if (file) {
      paths.push(file);
      console.log(chalk.cyan(`Scanning specific file: ${chalk.bold(file)}`));
    }
    if (dir) {
      paths.push(dir);
      console.log(chalk.cyan(`Scanning specific directory: ${chalk.bold(dir)}`));
    }
    scanConfig.paths = paths;
  }

  return scanDecorators(scanConfig, getDefaultStatusFn);
}

