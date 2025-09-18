import { exec } from 'child_process';
import { promisify } from 'util';
import { RoutesConfig, RouteInfo } from '../types';

const execAsync = promisify(exec);

export class RouteDiscoveryService {
  private config: RoutesConfig;

  constructor(config: RoutesConfig) {
    this.config = config;
  }

  async discoverRoutes(): Promise<RouteInfo[]> {
    if (!this.config.command) {
      throw new Error('No route discovery command configured');
    }

    try {
      const output = await this.executeCommand();
      return this.parseOutput(output);
    } catch (error: any) {
      throw new Error(`Failed to discover routes: ${error.message}`);
    }
  }

  private async executeCommand(): Promise<string> {
    const options = {
      cwd: this.config.workingDirectory || process.cwd(),
      timeout: this.config.timeout || 30000,
      env: { ...process.env, ...this.config.environment }
    };

    const { stdout, stderr } = await execAsync(this.config.command!, options);
    
    if (stderr) {
      console.warn('Route discovery command stderr:', stderr);
    }

    return stdout;
  }

  private parseOutput(output: string): RouteInfo[] {
    const format = this.detectOutputFormat(output);
    
    switch (format) {
      case 'json':
        return this.parseJsonOutput(output);
      case 'text':
        return this.parseTextOutput(output);
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  private detectOutputFormat(output: string): 'json' | 'text' {
    if (this.config.outputFormat === 'json') return 'json';
    if (this.config.outputFormat === 'text') return 'text';
    
    // Auto-detect
    const trimmed = output.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return 'json';
    }
    return 'text';
  }

  private parseJsonOutput(output: string): RouteInfo[] {
    try {
      const data = JSON.parse(output);
      
      if (Array.isArray(data)) {
        return data.map(this.normalizeRouteInfo);
      }
      
      if (data.routes && Array.isArray(data.routes)) {
        return data.routes.map(this.normalizeRouteInfo);
      }
      
      throw new Error('JSON output must contain an array of routes or a routes property');
    } catch (error: any) {
      throw new Error(`Failed to parse JSON output: ${error.message}`);
    }
  }

  private parseTextOutput(output: string): RouteInfo[] {
    const lines = output.split('\n').filter(line => line.trim());
    const routes: RouteInfo[] = [];

    for (const line of lines) {
      const route = this.parseTextLine(line);
      if (route) {
        routes.push(route);
      }
    }

    return routes;
  }

  private parseTextLine(line: string): RouteInfo | null {
    // Common text formats:
    // "GET /users" -> { method: 'GET', path: '/users' }
    // "GET /users UsersController.getUsers" -> { method: 'GET', path: '/users', controller: 'UsersController' }
    // "GET /users -> UsersController.getUsers" -> { method: 'GET', path: '/users', controller: 'UsersController' }
    
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Try to match common patterns
    const patterns = [
      // "GET /users"
      /^([A-Z]+)\s+([^\s]+)$/,
      // "GET /users UsersController.getUsers"
      /^([A-Z]+)\s+([^\s]+)\s+([^\s]+)\.([^\s]+)$/,
      // "GET /users -> UsersController.getUsers"
      /^([A-Z]+)\s+([^\s]+)\s*->\s*([^\s]+)\.([^\s]+)$/,
      // "GET /users (UsersController)"
      /^([A-Z]+)\s+([^\s]+)\s*\(([^)]+)\)$/
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, method, path, controller, handler] = match;
        return {
          method: method.toUpperCase(),
          path: path.startsWith('/') ? path : `/${path}`,
          controller: controller || undefined,
          handler: handler || undefined
        };
      }
    }

    // If no pattern matches, try to extract method and path from the beginning
    const words = trimmed.split(/\s+/);
    if (words.length >= 2) {
      const method = words[0].toUpperCase();
      const path = words[1];
      
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
        return {
          method,
          path: path.startsWith('/') ? path : `/${path}`,
          controller: words[2] || undefined
        };
      }
    }

    return null;
  }

  private normalizeRouteInfo(item: any): RouteInfo {
    // Handle different possible structures
    if (typeof item === 'string') {
      // If it's a string like "GET /users", parse it
      const parsed = this.parseTextLine(item);
      if (parsed) return parsed;
      throw new Error(`Cannot parse route string: ${item}`);
    }

    if (typeof item === 'object' && item !== null) {
      return {
        method: (item.method || item.verb || item.httpMethod || 'GET').toUpperCase(),
        path: item.path || item.route || item.url || '/',
        controller: item.controller || item.handler || item.class || undefined,
        handler: item.action || item.methodName || item.function || undefined,
        group: item.group || item.module || item.namespace || undefined
      };
    }

    throw new Error(`Invalid route item: ${JSON.stringify(item)}`);
  }
}
