#!/usr/bin/env node

/**
 * Script that mocks API responses without requiring a running server
 * This analyzes the codebase and generates endpoint information
 * Usage: node scripts/mock-endpoints.js
 */

const fs = require('fs');
const path = require('path');

class MockEndpointAnalyzer {
  constructor() {
    this.controllers = [];
    this.endpoints = [];
  }

  analyzeControllers() {
    const controllersDir = path.join(__dirname, '../src');
    const controllerFiles = fs.readdirSync(controllersDir)
      .filter(file => file.endsWith('.controller.ts'));

    controllerFiles.forEach(file => {
      const filePath = path.join(controllersDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      this.parseController(file, content);
    });
  }

  parseController(filename, content) {
    const controllerName = filename.replace('.controller.ts', '');
    
    // Extract @Controller decorator
    const controllerMatch = content.match(/@Controller\(['"`]([^'"`]+)['"`]\)/);
    const basePath = controllerMatch ? controllerMatch[1] : '';

    // Extract all route decorators
    const routeRegex = /@(Get|Post|Put|Patch|Delete)\(['"`]?([^'"`\s)]*)['"`]?\)/g;
    const methodRegex = /async\s+(\w+)\s*\(/g;
    
    let routeMatch;
    const routes = [];
    
    while ((routeMatch = routeRegex.exec(content)) !== null) {
      const method = routeMatch[1].toUpperCase();
      let route = routeMatch[2] || '';
      
      // Handle empty routes (like @Get())
      if (!route) {
        route = '';
      } else if (!route.startsWith('/')) {
        route = '/' + route;
      }
      
      routes.push({ method, route });
    }

    // Extract method names
    let methodMatch;
    const methods = [];
    while ((methodMatch = methodRegex.exec(content)) !== null) {
      methods.push(methodMatch[1]);
    }

    // Combine routes with methods
    routes.forEach((route, index) => {
      const methodName = methods[index] || `method${index + 1}`;
      const fullPath = basePath + route.route;
      
      this.endpoints.push({
        controller: controllerName,
        method: route.method,
        path: fullPath,
        methodName: methodName,
      });
    });
  }

  groupEndpointsByController() {
    return this.endpoints.reduce((acc, endpoint) => {
      if (!acc[endpoint.controller]) {
        acc[endpoint.controller] = [];
      }
      acc[endpoint.controller].push(endpoint);
      return acc;
    }, {});
  }

  printResults() {
    console.log('Mock API Endpoints (Code Analysis)\n');
    console.log('=' .repeat(80));
    
    if (this.endpoints.length === 0) {
      console.log('❌ No endpoints found in controller files!');
      return;
    }

    const grouped = this.groupEndpointsByController();

    Object.keys(grouped).sort().forEach(controller => {
      console.log(`\n${controller}:`);
      console.log('-'.repeat(50));
      
      // Sort endpoints by method and path
      const sortedEndpoints = grouped[controller].sort((a, b) => {
        const methodOrder = { 'GET': 1, 'POST': 2, 'PUT': 3, 'PATCH': 4, 'DELETE': 5 };
        const methodA = methodOrder[a.method] || 99;
        const methodB = methodOrder[b.method] || 99;
        if (methodA !== methodB) return methodA - methodB;
        return a.path.localeCompare(b.path);
      });
      
      sortedEndpoints.forEach(endpoint => {
        const methodColor = getMethodColor(endpoint.method);
        const method = `${methodColor}${endpoint.method.padEnd(6)}${'\x1b[0m'}`;
        const path = `\x1b[36m${endpoint.path}\x1b[0m`;
        const description = `\x1b[90m${endpoint.description}\x1b[0m`;
        
        console.log(`  ${method} ${path}`);
        console.log(`         ${description}`);
        
        // Add body/query hints based on method
        if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
          const bodyType = this.getBodyType(endpoint.path, endpoint.controller);
          console.log(`         \x1b[33mBody: ${bodyType}\x1b[0m`);
        }
        
        if (endpoint.path.includes('orders') && endpoint.method === 'GET' && !endpoint.path.includes(':id')) {
          console.log(`         \x1b[33mQuery: ?status=OrderStatus (optional)\x1b[0m`);
        }
        
        console.log('');
      });
    });

    console.log('=' .repeat(80));
    console.log(`\n Analysis Summary:`);
    console.log(`    Total endpoints: ${this.endpoints.length}`);
    console.log(`    Controllers: ${Object.keys(grouped).length}`);
    console.log(`    Method: Code analysis (no server required)`);
    
    console.log('\n💡 Test endpoints (when server is running):');
    this.endpoints.slice(0, 5).forEach(endpoint => {
      const fullPath = endpoint.path.startsWith('/') ? endpoint.path : '/' + endpoint.path;
      console.log(`  curl -X ${endpoint.method} http://localhost:3000${fullPath}`);
    });
    
    console.log('\n Usage:');
    console.log('  npm run mock-endpoints              # Analyze codebase');
    console.log('  npm run mock-endpoints -- --json    # JSON output');
    console.log('  npm run list-endpoints              # Test running server');
    console.log('  npm run test-endpoints              # Test with mock database');
  }

  printJsonResults(saveToFile = false) {
    const jsonEndpoints = this.endpoints.map(endpoint => {
      const fullPath = endpoint.path.startsWith('/') ? endpoint.path : '/' + endpoint.path;
      const url = `http://localhost:3000${fullPath}`;
      
      return {
        url: url,
        method: endpoint.method,
        resource: endpoint.controller.toLowerCase()
      };
    });

    const jsonString = JSON.stringify(jsonEndpoints, null, 2);

    if (saveToFile) {
      const fs = require('fs');
      const path = require('path');
      const filename = 'endpoints.json';
      const filepath = path.join(process.cwd(), filename);
      
      try {
        fs.writeFileSync(filepath, jsonString, 'utf8');
        console.log(`✅ Endpoints saved to: ${filepath}`);
        console.log(`Total endpoints: ${jsonEndpoints.length}`);
      } catch (error) {
        console.error('❌ Error saving file:', error.message);
        process.exit(1);
      }
    } else {
      console.log(jsonString);
    }
  }


  getBodyType(path, controller) {
    if (path.includes('users')) {
      return 'CreateUserDto';
    } else if (path.includes('orders')) {
      if (path.includes('status')) {
        return '{ "status": "OrderStatus" }';
      }
      return 'CreateOrderDto';
    }
    return 'JSON';
  }
}

function getMethodColor(method) {
  const colors = {
    'GET': '\x1b[32m',     // Green
    'POST': '\x1b[34m',    // Blue
    'PUT': '\x1b[33m',     // Yellow
    'DELETE': '\x1b[31m',  // Red
    'PATCH': '\x1b[35m'    // Magenta
  };
  return colors[method] || '\x1b[0m';
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json') || args.includes('-j');
  const saveToFile = args.includes('--save') || args.includes('-s');
  
  if (!jsonOutput) {
    console.log(`NestJS Endpoint Analyzer (Code Analysis)`);
    console.log(`Analyzing controller files...\n`);
  }
  
  try {
    const analyzer = new MockEndpointAnalyzer();
    analyzer.analyzeControllers();
    
    if (jsonOutput) {
      analyzer.printJsonResults(saveToFile);
    } else {
      analyzer.printResults();
    }
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { MockEndpointAnalyzer };
