/**
 * RouterParser - responsible for parsing RouterModule.register() calls and extracting router configurations
 */

import { ModuleMapper, RouterConfig } from './module-mapper';

export interface ParsedRouterCall {
  config: RouterConfig;
  lineNumber: number;
  sourceFile: string;
}

export class RouterParser {
  /**
   * Parses RouterModule.register() calls from file content
   */
  parseRouterCalls(content: string, filePath: string): ParsedRouterCall[] {
    const routerCalls: ParsedRouterCall[] = [];
    
    // Find RouterModule.register( and extract the argument
    const routerRegex = /RouterModule\.register\s*\(/g;
    let match;
    
    while ((match = routerRegex.exec(content)) !== null) {
      try {
        const startIndex = match.index + match[0].length;
        const configString = this.extractBalancedContent(content, startIndex);
        
        if (configString) {
          const configs = this.parseRouterConfig(configString);
          const lineNumber = this.getLineNumber(content, match.index);
          
          // Handle both single config and array of configs
          const configArray = Array.isArray(configs) ? configs : [configs];
          
          for (const config of configArray) {
            routerCalls.push({
              config,
              lineNumber,
              sourceFile: filePath
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to parse router config in ${filePath}:`, error);
      }
    }
    
    return routerCalls;
  }

  /**
   * Extracts balanced content (handles nested brackets/braces)
   */
  private extractBalancedContent(content: string, startIndex: number): string | null {
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let stringChar = '';
    let i = startIndex;
    
    // Skip whitespace
    while (i < content.length && /\s/.test(content[i])) {
      i++;
    }
    
    const startChar = content[i];
    if (startChar === '[') {
      bracketCount = 1;
    } else if (startChar === '{') {
      braceCount = 1;
    } else {
      return null;
    }
    
    i++;
    const start = i;
    
    while (i < content.length) {
      const char = content[i];
      
      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if (char === ')' && bracketCount === 0 && braceCount === 0) {
          // Found the closing parenthesis
          break;
        }
      } else {
        if (char === stringChar && content[i - 1] !== '\\') {
          inString = false;
        }
      }
      
      i++;
    }
    
    if (i >= content.length) {
      return null;
    }
    
    return content.substring(start - 1, i);
  }

  /**
   * Parses a router configuration string into RouterConfig object
   */
  private parseRouterConfig(configString: string): RouterConfig | RouterConfig[] {
    // Handle array of router configs
    if (configString.trim().startsWith('[')) {
      // Remove outer brackets and parse as array
      const arrayContent = configString.trim().slice(1, -1);
      const childConfigs = this.parseChildrenArray(arrayContent);
      
      return childConfigs; // Return all configs
    }

    // Single config object
    const config: RouterConfig = {
      path: '',
      module: '',
      children: []
    };

    // Extract path
    const pathMatch = configString.match(/path\s*:\s*['"`]([^'"`]*)['"`]/);
    if (pathMatch) {
      config.path = pathMatch[1];
    }

    // Extract module
    const moduleMatch = configString.match(/module\s*:\s*(\w+)/);
    if (moduleMatch) {
      config.module = moduleMatch[1];
    }

    // Extract children
    const childrenMatch = configString.match(/children\s*:\s*\[([\s\S]*?)\]/);
    if (childrenMatch) {
      config.children = this.parseChildrenArray(childrenMatch[1]);
    }

    return config;
  }

  /**
   * Parses children array from router configuration
   */
  private parseChildrenArray(childrenString: string): RouterConfig[] {
    const children: RouterConfig[] = [];
    
    // Split by object boundaries while handling nested objects
    const childObjects = this.splitObjectArray(childrenString);
    
    for (const childString of childObjects) {
      try {
        const child = this.parseRouterConfig(childString);
        if (Array.isArray(child)) {
          children.push(...child);
        } else if (child.path || child.module) {
          children.push(child);
        }
      } catch (error) {
        console.warn(`Failed to parse child router config:`, error);
      }
    }
    
    return children;
  }

  /**
   * Splits an array of objects, handling nested objects and arrays
   */
  private splitObjectArray(arrayString: string): string[] {
    const objects: string[] = [];
    let current = '';
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < arrayString.length; i++) {
      const char = arrayString[i];
      
      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
        } else if (char === ',' && braceCount === 0 && bracketCount === 0) {
          // End of object
          if (current.trim()) {
            objects.push(current.trim());
            current = '';
            continue;
          }
        }
      } else {
        if (char === stringChar && arrayString[i - 1] !== '\\') {
          inString = false;
        }
      }
      
      current += char;
    }
    
    // Add the last object
    if (current.trim()) {
      objects.push(current.trim());
    }
    
    return objects;
  }

  /**
   * Gets line number for a character index in content
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Validates if a parsed router config is valid
   */
  isValidRouterConfig(config: RouterConfig): boolean {
    return !!(config.path || config.module || config.children?.length);
  }

  /**
   * Flattens nested router configs into a flat list with full paths
   */
  flattenRouterConfigs(configs: RouterConfig[], basePath: string = ''): Array<{ path: string; module: string; fullPath: string }> {
    const flattened: Array<{ path: string; module: string; fullPath: string }> = [];
    
    for (const config of configs) {
      const fullPath = this.joinPaths(basePath, config.path);
      
      if (config.module) {
        flattened.push({
          path: config.path,
          module: config.module,
          fullPath
        });
      }
      
      if (config.children) {
        const childFlattened = this.flattenRouterConfigs(config.children, fullPath);
        flattened.push(...childFlattened);
      }
    }
    
    return flattened;
  }

  /**
   * Joins two path segments safely
   */
  private joinPaths(base: string, path: string): string {
    if (!base) return path;
    if (!path) return base;
    
    const baseClean = base.replace(/\/+$/, '');
    const pathClean = path.replace(/^\/+/, '');
    
    return `${baseClean}/${pathClean}`;
  }
}
