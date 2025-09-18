import * as ts from 'typescript';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { RouteInfo, TestScenario } from '../types';

export interface TestFileUpdateOptions {
  filePath: string;
  endpoint: RouteInfo;
  scenarios?: TestScenario[];
  preserveFormatting?: boolean;
  backup?: boolean;
}

export class TestFileUpdater {
  private sourceFile: ts.SourceFile | null = null;
  private originalContent: string = '';

  async addEndpointToFile(options: TestFileUpdateOptions): Promise<void> {
    const { filePath, endpoint, scenarios, preserveFormatting = true, backup = true } = options;

    try {
      // 1. Backup original file
      if (backup) {
        await this.createBackup(filePath);
      }

      // 2. Load and parse file
      await this.loadFile(filePath);

      // 3. Check if endpoint already exists
      if (this.endpointExists(endpoint)) {
        throw new Error(`Endpoint ${endpoint.method} ${endpoint.path} already exists in ${filePath}`);
      }

      // 4. Generate new test code
      const newTestCode = this.generateTestCode(endpoint, scenarios);

      // 5. Find insertion point
      const insertionPoint = this.findInsertionPoint();

      // 6. Insert new code
      const updatedContent = this.insertCodeAt(newTestCode, insertionPoint);

      // 7. Write updated file
      writeFileSync(filePath, updatedContent, 'utf8');

    } catch (error: any) {
      throw new Error(`Failed to update test file: ${error.message}`);
    }
  }

  private async createBackup(filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      return;
    }

    const backupPath = `${filePath}.backup.${Date.now()}`;
    const content = readFileSync(filePath, 'utf8');
    writeFileSync(backupPath, content, 'utf8');
  }

  private async loadFile(filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      throw new Error(`Test file does not exist: ${filePath}`);
    }

    this.originalContent = readFileSync(filePath, 'utf8');
    this.sourceFile = ts.createSourceFile(
      filePath,
      this.originalContent,
      ts.ScriptTarget.Latest,
      true
    );
  }

  private endpointExists(endpoint: RouteInfo): boolean {
    if (!this.sourceFile) return false;

    let found = false;

    const visit = (node: ts.Node) => {
      // Look for describe blocks with method and path
      if (ts.isCallExpression(node) && 
          ts.isIdentifier(node.expression) && 
          node.expression.text === 'describe') {
        
        const args = node.arguments;
        if (args.length >= 1 && ts.isStringLiteral(args[0])) {
          const describeText = args[0].text;
          
          // Check if this describe block matches our endpoint
          if (describeText.includes(`${endpoint.method} ${endpoint.path}`)) {
            found = true;
            return;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return found;
  }

  private generateTestCode(endpoint: RouteInfo, scenarios?: TestScenario[]): string {
    const testScenarios = scenarios || this.generateDefaultScenarios(endpoint);
    
    let code = `\n  describe('${endpoint.method} ${endpoint.path}', () => {\n`;
    
    for (const scenario of testScenarios) {
      code += this.generateScenarioCode(endpoint, scenario);
    }
    
    code += '  });\n';
    return code;
  }

  private generateDefaultScenarios(endpoint: RouteInfo): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const method = endpoint.method.toUpperCase();

    // Success scenario
    scenarios.push({
      description: `should successfully handle ${method} ${endpoint.path}`,
      expectedStatus: this.getDefaultStatus(method)
    });

    // Error scenarios based on method
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      scenarios.push({
        description: `should return 400 for invalid data on ${method} ${endpoint.path}`,
        expectedStatus: 400
      });
    }

    if (method === 'GET' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      scenarios.push({
        description: `should return 404 for non-existent resource on ${method} ${endpoint.path}`,
        expectedStatus: 404
      });
    }

    // Authentication scenario
    scenarios.push({
      description: `should return 401 for unauthorized access to ${method} ${endpoint.path}`,
      expectedStatus: 401
    });

    return scenarios;
  }

  private generateScenarioCode(endpoint: RouteInfo, scenario: TestScenario): string {
    const method = endpoint.method.toLowerCase();
    let code = `    test('${scenario.description}', async ({ http }) => {\n`;
    
    // Add request data for non-GET methods
    if (method !== 'get' && method !== 'delete') {
      code += `      const requestData = {\n`;
      code += `        // TODO: Add request data\n`;
      code += `        name: 'Test Name',\n`;
      code += `        email: 'test@example.com'\n`;
      code += `      };\n\n`;
    }

    // Add HTTP call
    if (method === 'get' || method === 'delete') {
      code += `      const response = await http.${method}('${endpoint.path}');\n`;
    } else {
      code += `      const response = await http.${method}('${endpoint.path}', requestData);\n`;
    }

    // Add assertions
    code += `\n      // TODO: Add proper assertions\n`;
    code += `      expect(response.status).toBe(${scenario.expectedStatus});\n`;
    code += `      expect(true).toBe(false); // This test needs implementation\n`;
    code += `    });\n\n`;

    return code;
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

  private findInsertionPoint(): number {
    if (!this.sourceFile) {
      throw new Error('Source file not loaded');
    }

    let lastDescribeEnd = -1;

    const visit = (node: ts.Node) => {
      // Look for the main controller describe block
      if (ts.isCallExpression(node) && 
          ts.isIdentifier(node.expression) && 
          node.expression.text === 'describe') {
        
        const args = node.arguments;
        if (args.length >= 1 && ts.isStringLiteral(args[0])) {
          const describeText = args[0].text;
          
          // Check if this is the main controller describe block
          if (describeText.includes('API Integration Tests')) {
            // Find the end of this describe block
            const endPos = node.end;
            lastDescribeEnd = Math.max(lastDescribeEnd, endPos);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);

    if (lastDescribeEnd === -1) {
      throw new Error('Could not find main controller describe block');
    }

    // Find the closing brace of the main describe block
    const content = this.originalContent;
    let braceCount = 0;
    let pos = lastDescribeEnd;

    while (pos < content.length) {
      const char = content[pos];
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return pos; // Position before the closing brace
        }
      }
      
      pos++;
    }

    throw new Error('Could not find insertion point in main describe block');
  }

  private insertCodeAt(newCode: string, position: number): string {
    const content = this.originalContent;
    
    // Find the indentation level at the insertion point
    const beforeInsertion = content.substring(0, position);
    const lines = beforeInsertion.split('\n');
    const lastLine = lines[lines.length - 1];
    const indentation = lastLine.match(/^\s*/)?.[0] || '';
    
    // Add proper indentation to new code
    const indentedCode = newCode
      .split('\n')
      .map(line => line.trim() ? indentation + line : line)
      .join('\n');
    
    return content.substring(0, position) + indentedCode + content.substring(position);
  }

  // Utility method to check if file contains endpoint
  static async endpointExistsInFile(filePath: string, endpoint: RouteInfo): Promise<boolean> {
    const updater = new TestFileUpdater();
    await updater.loadFile(filePath);
    return updater.endpointExists(endpoint);
  }

  // Utility method to get all endpoints from file
  static async getEndpointsFromFile(filePath: string): Promise<RouteInfo[]> {
    if (!existsSync(filePath)) {
      return [];
    }

    const content = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    
    const endpoints: RouteInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && 
          ts.isIdentifier(node.expression) && 
          node.expression.text === 'describe') {
        
        const args = node.arguments;
        if (args.length >= 1 && ts.isStringLiteral(args[0])) {
          const describeText = args[0].text;
          
          // Extract method and path from describe text
          const match = describeText.match(/^(\w+)\s+(.+)$/);
          if (match) {
            const [, method, path] = match;
            endpoints.push({
              method: method.toUpperCase(),
              path: path.startsWith('/') ? path : `/${path}`,
              controller: 'unknown' // We'd need more context to determine this
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }
}
