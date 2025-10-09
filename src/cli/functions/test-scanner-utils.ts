/**
 * Utilities for scanning existing test files
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import chalk from 'chalk';
import { normalizePath } from './path-utils';

export interface TestedEndpoint {
  method: string;
  path: string;
  testFile: string;
}

/**
 * Scans test directory for tested endpoints
 */
export async function scanTestFiles(testDir: string): Promise<TestedEndpoint[]> {
  if (!existsSync(testDir)) {
    console.warn(chalk.yellow(`⚠️  Test directory not found: ${testDir}`));
    return [];
  }

  const testedEndpoints: TestedEndpoint[] = [];
  const testFiles = findTestFiles(testDir);

  for (const testFile of testFiles) {
    try {
      const content = readFileSync(testFile, 'utf8');
      const endpoints = extractTestedEndpoints(content, testFile);
      testedEndpoints.push(...endpoints);
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not read test file: ${testFile}`));
    }
  }

  return testedEndpoints;
}

/**
 * Recursively finds test files in a directory
 */
export function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findTestFiles(fullPath));
      } else if (isTestFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore directories that can't be read
  }
  
  return files;
}

/**
 * Checks if a file is a test file
 */
export function isTestFile(filePath: string): boolean {
  const ext = extname(filePath);
  const name = filePath.toLowerCase();
  return (ext === '.ts' || ext === '.js') && 
         (name.includes('.test.') || name.includes('.spec.'));
}

/**
 * Extracts tested endpoints from test file content
 */
export function extractTestedEndpoints(content: string, testFile: string): TestedEndpoint[] {
  const endpoints: TestedEndpoint[] = [];
  
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
      path = normalizePathFromUrl(path);
      
      endpoints.push({
        method,
        path,
        testFile
      });
    }
  }

  return endpoints;
}

/**
 * Normalizes a path from URL (removes query params, ensures starts with /)
 */
export function normalizePathFromUrl(path: string): string {
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

