/**
 * RouteResolver - responsible for resolving complete route paths by combining router, controller, and method information
 */

import { PathBuilder, PathSegment } from './path-builder';
import { ModuleMapper, ControllerInfo } from './module-mapper';
import { DecoratorRouteInfo } from './decorator-scanner';

export interface RouteContext {
  routerPath?: string;
  controllerPath?: string;
  methodPath?: string;
  controllerName?: string;
  moduleName?: string;
}

export interface ResolvedRoute {
  method: string;
  path: string;
  controllerName?: string;
  moduleName?: string;
  routerPrefix?: string;
  controllerPath?: string;
  methodPath?: string;
  sourceFile?: string;
  lineNumber?: number;
  decorators?: Record<string, any>;
}

export class RouteResolver {
  private moduleMapper: ModuleMapper;

  constructor(moduleMapper: ModuleMapper) {
    this.moduleMapper = moduleMapper;
  }

  /**
   * Resolves a complete route from route context
   */
  resolveRoute(method: string, context: RouteContext, sourceFile?: string, lineNumber?: number, decorators?: Record<string, any>): ResolvedRoute {
    const segments: PathSegment[] = [];

    // Add router path if available
    if (context.routerPath) {
      segments.push(PathBuilder.createRouterSegment(context.routerPath, context.moduleName));
    }

    // Add controller path if available and meaningful
    if (context.controllerPath && PathBuilder.isValidSegment(
      PathBuilder.createControllerSegment(context.controllerPath, context.controllerName)
    )) {
      segments.push(PathBuilder.createControllerSegment(context.controllerPath, context.controllerName));
    }

    // Add method path if available and meaningful
    if (context.methodPath && PathBuilder.isValidSegment(
      PathBuilder.createMethodSegment(context.methodPath, context.controllerName)
    )) {
      segments.push(PathBuilder.createMethodSegment(context.methodPath, context.controllerName));
    }

    const fullPath = PathBuilder.buildFullPath(segments);

    return {
      method,
      path: fullPath,
      controllerName: context.controllerName,
      moduleName: context.moduleName,
      routerPrefix: context.routerPath,
      controllerPath: context.controllerPath,
      methodPath: context.methodPath,
      sourceFile,
      lineNumber,
      decorators
    };
  }

  /**
   * Resolves route from existing DecoratorRouteInfo (for backward compatibility)
   */
  resolveFromDecoratorRoute(route: DecoratorRouteInfo): ResolvedRoute {
    // If routerPath is not set, try to get it from ModuleMapper
    let routerPath = route.routerPath;
    if (!routerPath && route.controllerName) {
      routerPath = this.moduleMapper.getControllerRouterPath(route.controllerName);
    }
    
    const context: RouteContext = {
      routerPath: routerPath,
      controllerPath: route.controllerPath,
      controllerName: route.controllerName,
      moduleName: route.moduleName,
      methodPath: route.path // Add the method path from the route
    };

    return this.resolveRoute(
      route.method,
      context,
      route.sourceFile,
      route.lineNumber,
      route.decorators
    );
  }

  /**
   * Resolves routes for a controller by finding its router context
   */
  resolveControllerRoutes(controllerName: string, methodRoutes: Array<{ method: string; path: string; decorators?: Record<string, any> }>): ResolvedRoute[] {
    const controller = this.moduleMapper.getController(controllerName);
    if (!controller) {
      return methodRoutes.map(mr => this.resolveRoute(mr.method, {
        controllerName
      }));
    }

    const routerPath = this.moduleMapper.getControllerRouterPath(controllerName);
    
    return methodRoutes.map(mr => this.resolveRoute(mr.method, {
      routerPath,
      controllerPath: controller.path,
      controllerName,
      moduleName: controller.moduleName
    }, undefined, undefined, mr.decorators));
  }

  /**
   * Gets all resolved routes for a specific module
   */
  getModuleRoutes(moduleName: string): ResolvedRoute[] {
    const controllers = this.moduleMapper.getControllersForModule(moduleName);
    const routes: ResolvedRoute[] = [];

    for (const controller of controllers) {
      const routerPath = this.moduleMapper.getControllerRouterPath(controller.name);
      
      // This would need to be enhanced to get actual method routes
      // For now, it's a placeholder for the concept
      routes.push(this.resolveRoute('GET', {
        routerPath,
        controllerPath: controller.path,
        controllerName: controller.name,
        moduleName: controller.moduleName
      }, controller.filePath));
    }

    return routes;
  }

  /**
   * Validates if a route is complete and meaningful
   */
  isValidRoute(route: ResolvedRoute): boolean {
    return !!(
      route.method &&
      route.path &&
      route.path !== '/' &&
      route.path !== ''
    );
  }

  /**
   * Gets route priority for sorting (more specific routes first)
   */
  getRoutePriority(route: ResolvedRoute): number {
    const pathSegments = route.path.split('/').filter(Boolean);
    const hasParams = route.path.includes(':');
    
    // Routes with more segments are more specific
    let priority = pathSegments.length * 100;
    
    // Routes without parameters are more specific than those with parameters
    if (!hasParams) {
      priority += 50;
    }
    
    return priority;
  }

  /**
   * Sorts routes by priority (most specific first)
   */
  sortRoutesByPriority(routes: ResolvedRoute[]): ResolvedRoute[] {
    return routes
      .filter(route => this.isValidRoute(route))
      .sort((a, b) => this.getRoutePriority(b) - this.getRoutePriority(a));
  }
}
