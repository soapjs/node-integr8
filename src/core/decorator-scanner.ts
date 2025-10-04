import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { DecoratorScanningConfig, ExtendedRouteInfo } from '../types';

export interface DecoratorRouteInfo extends ExtendedRouteInfo {
  sourceFile?: string;
  lineNumber?: number;
  decorators?: Record<string, any>;
  routerPath?: string;
  controllerPath?: string;
}

export class DecoratorScanner {
  private config: DecoratorScanningConfig;

  constructor(config: DecoratorScanningConfig) {
    this.config = config;
  }

  async scanDecorators(): Promise<DecoratorRouteInfo[]> {
    if (!this.config.enabled) {
      return [];
    }

    const files = this.getFilesToScan();
    const routes: DecoratorRouteInfo[] = [];

    for (const file of files) {
      try {
        const fileRoutes = await this.scanFile(file);
        routes.push(...fileRoutes);
      } catch (error) {
        console.warn(`Failed to scan file ${file}:`, error);
      }
    }

    return routes;
  }

  private getFilesToScan(): string[] {
    const paths = this.config.paths || ['src'];
    const exclude = this.config.exclude || ['**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'];
    const files: string[] = [];

    for (const path of paths) {
      this.collectFiles(path, files, exclude);
    }

    return files;
  }

  private collectFiles(dir: string, files: string[], exclude: string[]): void {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          this.collectFiles(fullPath, files, exclude);
        } else if (extname(fullPath) === '.ts' && !this.shouldExclude(fullPath, exclude)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directories that can't be read
    }
  }

  private shouldExclude(filePath: string, exclude: string[]): boolean {
    return exclude.some(pattern => {
      if (pattern.includes('**')) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  private async scanFile(filePath: string): Promise<DecoratorRouteInfo[]> {
    const content = readFileSync(filePath, 'utf8');
    const routes: DecoratorRouteInfo[] = [];

    if (this.config.framework === 'nestjs') {
      // Scan decorators
      routes.push(...this.scanNestJSDecorators(content, filePath));
      
      // Scan routers
      routes.push(...this.scanNestJSRouters(content, filePath));
    }

    return routes;
  }

  private scanNestJSDecorators(content: string, filePath: string): DecoratorRouteInfo[] {
    const routes: DecoratorRouteInfo[] = [];
    const lines = content.split('\n');

    let currentController = '';
    let currentControllerPath = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Find controller
      const controllerMatch = line.match(/@Controller\(['"`]([^'"`]+)['"`]\)/);
      if (controllerMatch) {
        currentController = controllerMatch[1];
        currentControllerPath = currentController;
        continue;
      }

      // Find route decorators
      const routeDecorators = this.config.decorators?.routes || [];
      for (const decorator of routeDecorators) {
        const routeMatch = line.match(new RegExp(`@${decorator.replace('@', '')}\\(['"\`]([^'"\`]+)['"\`]\\)`));
        if (routeMatch) {
          const method = decorator.replace('@', '').toUpperCase();
          const path = routeMatch[1];
          const fullPath = this.buildFullPath(currentControllerPath, path);

          // Look for additional decorators in the next few lines
          const decorators: Record<string, any> = {};
          let description = '';
          let statusCode = 200;

          // Check next 5 lines for additional decorators
          for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
            const nextLine = lines[j];

            // HttpCode decorator
            const httpCodeMatch = nextLine.match(/@HttpCode\((\d+)\)/);
            if (httpCodeMatch) {
              statusCode = parseInt(httpCodeMatch[1]);
            }

            // ApiResponse decorator
            const apiResponseMatch = nextLine.match(/@ApiResponse\(\{([^}]+)\}\)/);
            if (apiResponseMatch) {
              description = this.extractApiResponseDescription(apiResponseMatch[1]);
            }

            // Method definition (stop looking)
            if (nextLine.trim().startsWith('async ') || nextLine.trim().match(/^\w+\(/)) {
              break;
            }
          }

          routes.push({
            method,
            path: fullPath,
            description: description || `${method} ${fullPath}`,
            sourceFile: filePath,
            lineNumber: i + 1,
            decorators: {
              controller: currentController,
              httpCode: statusCode,
              description
            }
          });

          break; // Found a route decorator, move to next line
        }
      }
    }

    return routes;
  }

  private buildFullPath(controllerPath: string, routePath: string): string {
    if (!controllerPath) return routePath;
    if (!routePath || routePath === '/') return controllerPath;
    
    const controller = controllerPath.endsWith('/') ? controllerPath.slice(0, -1) : controllerPath;
    const route = routePath.startsWith('/') ? routePath : `/${routePath}`;
    
    return `${controller}${route}`;
  }

  private extractApiResponseDescription(apiResponseContent: string): string {
    const descriptionMatch = apiResponseContent.match(/description\s*:\s*['"`]([^'"`]+)['"`]/);
    return descriptionMatch ? descriptionMatch[1] : '';
  }

  private scanNestJSRouters(content: string, filePath: string): DecoratorRouteInfo[] {
    const routes: DecoratorRouteInfo[] = [];
    
    // Look for RouterModule.register() calls with better regex
    const routerModuleRegex = /RouterModule\.register\s*\(\s*(\{[\s\S]*?\})\s*\)/g;
    
    let match;
    while ((match = routerModuleRegex.exec(content)) !== null) {
      try {
        const configContent = match[1];
        const routerConfig = this.parseRouterConfig(configContent);
        
        if (routerConfig) {
          const routerRoutes = this.extractRoutesFromRouterConfig(routerConfig, filePath);
          routes.push(...routerRoutes);
        }
      } catch (error) {
        console.warn(`Failed to parse router config in ${filePath}:`, error);
      }
    }
    return routes;
  }

  private parseRouterConfig(configContent: string): any {
    // Simple parser for router configuration
    // This is a basic implementation - could be enhanced with proper AST parsing
    
    const config: any = {};
    
    // Extract path
    const pathMatch = configContent.match(/path\s*:\s*['"`]([^'"`]+)['"`]/);
    if (pathMatch) {
      config.path = pathMatch[1];
    }
    
    // Extract module
    const moduleMatch = configContent.match(/module\s*:\s*(\w+)/);
    if (moduleMatch) {
      config.module = moduleMatch[1];
    }
    
    // Extract children with better regex for nested objects
    // Find balanced brackets
    const childrenStart = configContent.indexOf('children: [');
    if (childrenStart !== -1) {
      let bracketCount = 0;
      let start = childrenStart + 'children: ['.length;
      let end = start;
      
      for (let i = start; i < configContent.length; i++) {
        if (configContent[i] === '[') bracketCount++;
        else if (configContent[i] === ']') {
          if (bracketCount === 0) {
            end = i;
            break;
          }
          bracketCount--;
        }
      }
      
      const childrenContent = configContent.substring(start, end);
      config.children = this.parseChildrenArray(childrenContent);
    }
    
    return config;
  }

  private parseChildrenArray(childrenContent: string): any[] {
    const children: any[] = [];
    
    // Parse objects by finding balanced braces
    let braceCount = 0;
    let currentObject = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < childrenContent.length; i++) {
      const char = childrenContent[i];
      
      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = '';
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      currentObject += char;
      
      // If we've closed an object (braceCount === 0), parse it
      if (braceCount === 0 && currentObject.trim()) {
        const cleanObj = currentObject.replace(/^[,\s]*\{|\}[,\s]*$/g, '').trim();
        if (cleanObj) {
          const child: any = {};
          
          // Extract path
          const pathMatch = cleanObj.match(/path\s*:\s*['"`]([^'"`]+)['"`]/);
          if (pathMatch) {
            child.path = pathMatch[1];
          }
          
          // Extract module
          const moduleMatch = cleanObj.match(/module\s*:\s*(\w+)/);
          if (moduleMatch) {
            child.module = moduleMatch[1];
          }
          
          // Extract nested children with balanced brackets
          const nestedChildrenStart = cleanObj.indexOf('children: [');
          if (nestedChildrenStart !== -1) {
            let bracketCount = 0;
            let start = nestedChildrenStart + 'children: ['.length;
            let end = start;
            
            for (let i = start; i < cleanObj.length; i++) {
              if (cleanObj[i] === '[') bracketCount++;
              else if (cleanObj[i] === ']') {
                if (bracketCount === 0) {
                  end = i;
                  break;
                }
                bracketCount--;
              }
            }
            
            const nestedChildrenContent = cleanObj.substring(start, end);
            child.children = this.parseChildrenArray(nestedChildrenContent);
          }
          
          if (child.path || child.module) {
            children.push(child);
          }
        }
        
        currentObject = '';
      }
    }
    
    return children;
  }

  private extractRoutesFromRouterConfig(routerConfig: any, filePath: string): DecoratorRouteInfo[] {
    const routes: DecoratorRouteInfo[] = [];
    
    // Process the router configuration
    if (routerConfig.children) {
      const nestedRoutes = this.processRouterChildren(routerConfig.children, routerConfig.path || '');
      routes.push(...nestedRoutes);
    }
    
    // If there's a direct module, create a route for it
    if (routerConfig.module && routerConfig.path) {
      routes.push({
        method: 'GET', // Default method
        path: routerConfig.path,
        description: `Router module: ${routerConfig.module}`,
        sourceFile: filePath,
        routerPath: routerConfig.path,
        controllerPath: '/',
        decorators: {
          routerModule: routerConfig.module,
          type: 'router'
        }
      });
    }
    
    return routes;
  }

  private processRouterChildren(children: any[], parentPath: string = ''): DecoratorRouteInfo[] {
    const routes: DecoratorRouteInfo[] = [];
    
    for (const child of children) {
      const fullPath = this.buildNestedPath(parentPath, child.path || '');
      
      // If child has nested children, process them recursively
      if (child.children) {
        const nestedRoutes = this.processRouterChildren(child.children, fullPath);
        routes.push(...nestedRoutes);
      }
      
      // Create route for this child
      if (child.path || child.module) {
        routes.push({
          method: 'GET', // Default method
          path: fullPath,
          description: child.module ? `Router module: ${child.module}` : `Router path: ${child.path}`,
          routerPath: fullPath,
          controllerPath: '/',
          decorators: {
            routerModule: child.module,
            routerPath: child.path,
            type: 'router'
          }
        });
      }
    }
    
    return routes;
  }

  private buildNestedPath(parentPath: string, childPath: string): string {
    if (!parentPath) return childPath;
    if (!childPath || childPath === '/') return parentPath;
    
    const parent = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
    const child = childPath.startsWith('/') ? childPath : `/${childPath}`;
    
    return `${parent}${child}`;
  }
}
