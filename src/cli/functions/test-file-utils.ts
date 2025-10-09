/**
 * Utilities for generating and merging test files
 */

import chalk from 'chalk';
import { TestTemplateGenerator } from '../../core/test-template-generator';

/**
 * Extracts describe block from test content
 */
export function extractDescribeBlock(content: string): string | null {
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

/**
 * Extracts describe title from a describe block
 */
export function extractDescribeTitle(describeBlock: string): string | null {
  const match = describeBlock.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
  return match ? match[1] : null;
}

/**
 * Checks if a describe block with the given title already exists
 */
export function describeExists(content: string, describeTitle: string): boolean {
  const escapedTitle = describeTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`describe\\s*\\(\\s*['"\`]${escapedTitle}['"\`]`, 'i');
  return pattern.test(content);
}

/**
 * Generates imports for test files
 */
export function generateImports(): Record<string, string[]> {
  return {
    '@soapjs/integr8': ['setupEnvironment', 'teardownEnvironment', 'getEnvironmentContext']
  };
}

/**
 * Generates imports section as string
 */
export function generateImportsSection(imports: Record<string, string[]>): string {
  const importLines: string[] = [];
  
  for (const [module, importsList] of Object.entries(imports)) {
    importLines.push(`import { ${importsList.join(', ')} } from '${module}';`);
  }
  
  return importLines.join('\n');
}

/**
 * Generates setup/teardown section using template
 */
export function generateSetupTeardownFromTemplate(
  generator: TestTemplateGenerator, 
  testFilePath: string, 
  configPath?: string
): string {
  const templateData = {
    setup: true,
    teardown: true,
    configPath: configPath || 'integr8.api.config.js',
    testFilePath: testFilePath
  };
  
  if (generator.setupTeardownTemplate) {
    return generator.setupTeardownTemplate(templateData);
  }
  
  return generateSetupTeardownSection();
}

/**
 * Generates basic setup/teardown section
 */
export function generateSetupTeardownSection(): string {
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

/**
 * Finds the end index of imports section
 */
export function findImportsEndIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '' && i > 0 && lines[i-1].includes('from')) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the start index of describe blocks
 */
export function findDescribeBlocksStartIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('describe(')) {
      return i;
    }
  }
  return -1;
}

/**
 * Merges new test blocks with existing test content
 */
export function mergeTestContent(
  existingContent: string,
  newTestBlocks: string[],
  generator: TestTemplateGenerator,
  testFilePath: string,
  configPath?: string
): string {
  if (!existingContent) {
    // Create new file with all test blocks
    const imports = generateImports();
    const importsSection = generateImportsSection(imports);
    const setupTeardown = generateSetupTeardownFromTemplate(generator, testFilePath, configPath);
    
    return `${importsSection}\n\n${setupTeardown}\n\n${newTestBlocks.join('\n\n')}\n`;
  }
  
  // Filter out test blocks that already exist in the file
  const blocksToAdd: string[] = [];
  
  for (const block of newTestBlocks) {
    const describeTitle = extractDescribeTitle(block);
    
    if (describeTitle && describeExists(existingContent, describeTitle)) {
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
  const importsEndIndex = findImportsEndIndex(lines);
  const describeBlocksStartIndex = findDescribeBlocksStartIndex(lines);
  
  if (importsEndIndex === -1 || describeBlocksStartIndex === -1) {
    // Fallback: append new blocks at the end
    return `${existingContent}\n\n${blocksToAdd.join('\n\n')}\n`;
  }
  
  // Merge: keep existing imports and setup/teardown, add new describe blocks
  const beforeDescribe = lines.slice(0, describeBlocksStartIndex).join('\n');
  const afterDescribe = lines.slice(describeBlocksStartIndex).join('\n');
  
  return `${beforeDescribe}\n\n${blocksToAdd.join('\n\n')}\n\n${afterDescribe}`;
}

