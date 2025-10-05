/**
 * PathBuilder - responsible for combining path segments from RouterModule, Controller, and Method decorators
 */

export interface PathSegment {
  path: string;
  source: 'router' | 'controller' | 'method';
  moduleName?: string;
  controllerName?: string;
}

export class PathBuilder {
  /**
   * Combines path segments into a full route path
   */
  static buildFullPath(segments: PathSegment[]): string {
    // Filter out empty paths and normalize
    const validSegments = segments
      .filter(segment => segment.path && segment.path.trim() !== '')
      .map(segment => this.normalizePath(segment.path));

    // Join segments with '/'
    let fullPath = validSegments.join('/');
    
    // Ensure path starts with '/' if it's not empty
    if (fullPath && !fullPath.startsWith('/')) {
      fullPath = '/' + fullPath;
    }

    return fullPath || '/';
  }

  /**
   * Normalizes a single path segment
   */
  private static normalizePath(path: string): string {
    return path
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, '') // Remove trailing slashes
      .replace(/\/+/g, '/'); // Replace multiple slashes with single
  }

  /**
   * Creates a path segment from router configuration
   */
  static createRouterSegment(path: string, moduleName?: string): PathSegment {
    return {
      path: path || '',
      source: 'router',
      moduleName
    };
  }

  /**
   * Creates a path segment from controller decorator
   */
  static createControllerSegment(path: string, controllerName?: string): PathSegment {
    return {
      path: path || '',
      source: 'controller',
      controllerName
    };
  }

  /**
   * Creates a path segment from method decorator
   */
  static createMethodSegment(path: string, controllerName?: string): PathSegment {
    return {
      path: path || '',
      source: 'method',
      controllerName
    };
  }

  /**
   * Validates if a path segment is meaningful (not empty or just '/')
   */
  static isValidSegment(segment: PathSegment): boolean {
    const path = segment.path?.trim();
    return !!(path && path !== '' && path !== '/');
  }

  /**
   * Gets the route prefix from router segments (for module mapping)
   */
  static getRouterPrefix(segments: PathSegment[]): string {
    const routerSegments = segments.filter(s => s.source === 'router');
    return this.buildFullPath(routerSegments);
  }
}
