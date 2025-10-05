/**
 * ModuleMapper - responsible for mapping controllers to router modules and building module hierarchy
 */

import { PathBuilder, PathSegment } from './path-builder';

export interface RouterConfig {
  path: string;
  module: string;
  children?: RouterConfig[];
}

export interface ControllerInfo {
  name: string;
  path?: string;
  filePath: string;
  moduleName?: string;
}

export interface ModuleMapping {
  routerPrefix: string;
  moduleName: string;
  controllers: ControllerInfo[];
  children: ModuleMapping[];
}

export class ModuleMapper {
  private moduleMappings: ModuleMapping[] = [];
  private controllerRegistry: Map<string, ControllerInfo> = new Map();

  /**
   * Registers a router configuration (from RouterModule.register)
   */
  registerRouter(config: RouterConfig, basePath: string = ''): void {
    const segments: PathSegment[] = [
      PathBuilder.createRouterSegment(basePath),
      PathBuilder.createRouterSegment(config.path, config.module)
    ];
    
    const routerPrefix = PathBuilder.buildFullPath(segments);
    
    const mapping: ModuleMapping = {
      routerPrefix,
      moduleName: config.module,
      controllers: [],
      children: []
    };

    // Process children recursively
    if (config.children) {
      for (const child of config.children) {
        const childMapping = this.createChildMapping(child, routerPrefix);
        mapping.children.push(childMapping);
      }
    }

    this.moduleMappings.push(mapping);
  }

  /**
   * Registers a controller and maps it to the appropriate router
   */
  registerController(controller: ControllerInfo): void {
    this.controllerRegistry.set(controller.name, controller);
    
    // Find the appropriate module mapping
    const mapping = this.findModuleForController(controller);
    if (mapping) {
      mapping.controllers.push(controller);
      controller.moduleName = mapping.moduleName;
    }
  }

  /**
   * Gets the full router path for a controller
   */
  getControllerRouterPath(controllerName: string): string {
    const controller = this.controllerRegistry.get(controllerName);
    if (!controller) {
      return '';
    }

    const mapping = this.findModuleForController(controller);
    return mapping ? mapping.routerPrefix : '';
  }

  /**
   * Gets all module mappings
   */
  getModuleMappings(): ModuleMapping[] {
    return this.moduleMappings;
  }

  /**
   * Finds a controller by name
   */
  getController(name: string): ControllerInfo | undefined {
    return this.controllerRegistry.get(name);
  }

  /**
   * Gets all controllers for a specific module
   */
  getControllersForModule(moduleName: string): ControllerInfo[] {
    const mapping = this.moduleMappings.find(m => m.moduleName === moduleName);
    return mapping ? mapping.controllers : [];
  }

  /**
   * Gets the total number of registered routers
   */
  getRouterCount(): number {
    return this.moduleMappings.length;
  }

  /**
   * Gets the total number of registered controllers
   */
  getControllerCount(): number {
    return this.controllerRegistry.size;
  }

  /**
   * Creates a child module mapping recursively
   */
  private createChildMapping(config: RouterConfig, parentPath: string): ModuleMapping {
    const segments: PathSegment[] = [
      PathBuilder.createRouterSegment(parentPath),
      PathBuilder.createRouterSegment(config.path, config.module)
    ];
    
    const routerPrefix = PathBuilder.buildFullPath(segments);
    
    const mapping: ModuleMapping = {
      routerPrefix,
      moduleName: config.module,
      controllers: [],
      children: []
    };

    // Process children recursively
    if (config.children) {
      for (const child of config.children) {
        const childMapping = this.createChildMapping(child, routerPrefix);
        mapping.children.push(childMapping);
      }
    }

    return mapping;
  }

  /**
   * Finds the appropriate module mapping for a controller
   * This is a simplified implementation - in real scenario you'd need to parse imports
   */
  private findModuleForController(controller: ControllerInfo): ModuleMapping | undefined {
    // Try to find by module name if controller has one
    if (controller.moduleName) {
      const mapping = this.findModuleByName(controller.moduleName);
      if (mapping) {
        return mapping;
      }
    }

    // Try to find by matching file path (e.g., src/items/controllers/consoles.controller.ts should match items)
    if (controller.filePath) {
      const pathParts = controller.filePath.split('/');
      // Look for a directory name that might match a router path
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const part = pathParts[i];
        if (part === 'controllers' || part === 'api' || part === 'src') continue;
        
        // Try to find a router that contains this path segment
        const mapping = this.findModuleByPathSegment(part);
        if (mapping) {
          return mapping;
        }
      }
    }

    // Try to find by controller path matching a child router path
    if (controller.path) {
      const mapping = this.findModuleByControllerPath(controller.path);
      if (mapping) {
        return mapping;
      }
    }

    // No mapping found - controller is not in any nested router
    return undefined;
  }

  /**
   * Finds a module by name recursively
   */
  private findModuleByName(moduleName: string): ModuleMapping | undefined {
    for (const mapping of this.moduleMappings) {
      if (mapping.moduleName === moduleName) {
        return mapping;
      }
      
      const found = this.findInChildren(mapping.children, moduleName);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Recursively searches children for a module
   */
  private findInChildren(children: ModuleMapping[], moduleName: string): ModuleMapping | undefined {
    for (const child of children) {
      if (child.moduleName === moduleName) {
        return child;
      }
      
      const found = this.findInChildren(child.children, moduleName);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Finds a module by path segment (e.g., "items" in file path)
   */
  private findModuleByPathSegment(segment: string): ModuleMapping | undefined {
    // Check top-level mappings
    for (const mapping of this.moduleMappings) {
      if (mapping.routerPrefix.includes(segment)) {
        // Return the parent mapping (e.g., /api/v1/items), not the child (e.g., /api/v1/items/consoles)
        return mapping;
      }
      
      // Check if segment is in a child - if so, return that child's parent
      const parentOfChild = this.findParentByChildSegment(mapping, segment);
      if (parentOfChild) return parentOfChild;
    }
    return undefined;
  }

  /**
   * Finds the parent of a child that contains a specific segment
   */
  private findParentByChildSegment(parent: ModuleMapping, segment: string): ModuleMapping | undefined {
    for (const child of parent.children) {
      if (child.routerPrefix.includes(segment)) {
        // Found a child with this segment - return the parent
        return parent;
      }
      
      // Recursively check deeper children
      const deeperParent = this.findParentByChildSegment(child, segment);
      if (deeperParent) return deeperParent;
    }
    return undefined;
  }

  /**
   * Finds a child module by path segment
   */
  private findChildByPathSegment(children: ModuleMapping[], segment: string): ModuleMapping | undefined {
    for (const child of children) {
      if (child.routerPrefix.includes(segment)) {
        const deeperMatch = this.findChildByPathSegment(child.children, segment);
        if (deeperMatch) return deeperMatch;
        return child;
      }
    }
    return undefined;
  }

  /**
   * Finds a module by controller path (e.g., "consoles" in @Controller('consoles'))
   */
  private findModuleByControllerPath(controllerPath: string): ModuleMapping | undefined {
    // Check all mappings and their children for a matching path
    for (const mapping of this.moduleMappings) {
      const match = this.findChildWithPath(mapping, controllerPath);
      if (match) return match;
    }
    return undefined;
  }

  /**
   * Recursively finds a child module with a specific path
   */
  private findChildWithPath(mapping: ModuleMapping, path: string): ModuleMapping | undefined {
    // Check children first (more specific)
    for (const child of mapping.children) {
      if (child.routerPrefix.endsWith('/' + path) || child.routerPrefix.endsWith(path)) {
        return child;
      }
      const deeperMatch = this.findChildWithPath(child, path);
      if (deeperMatch) return deeperMatch;
    }
    return undefined;
  }

}
