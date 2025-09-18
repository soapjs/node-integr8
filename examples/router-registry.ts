// Example Router Registry for SoapJS Integr8
// This file demonstrates how to structure routes for test generation

export interface RouteInfo {
  method: string;
  path: string;
  controller?: string;
  handler?: string;
  group?: string;
}

// Example routes for a typical REST API
export const routes: RouteInfo[] = [
  // Users controller
  { method: 'GET', path: '/users', controller: 'users', group: 'users' },
  { method: 'POST', path: '/users', controller: 'users', group: 'users' },
  { method: 'GET', path: '/users/:id', controller: 'users', group: 'users' },
  { method: 'PUT', path: '/users/:id', controller: 'users', group: 'users' },
  { method: 'DELETE', path: '/users/:id', controller: 'users', group: 'users' },
  
  // Products controller
  { method: 'GET', path: '/products', controller: 'products', group: 'products' },
  { method: 'POST', path: '/products', controller: 'products', group: 'products' },
  { method: 'GET', path: '/products/:id', controller: 'products', group: 'products' },
  { method: 'PUT', path: '/products/:id', controller: 'products', group: 'products' },
  { method: 'DELETE', path: '/products/:id', controller: 'products', group: 'products' },
  
  // Orders controller
  { method: 'GET', path: '/orders', controller: 'orders', group: 'orders' },
  { method: 'POST', path: '/orders', controller: 'orders', group: 'orders' },
  { method: 'GET', path: '/orders/:id', controller: 'orders', group: 'orders' },
  { method: 'PUT', path: '/orders/:id', controller: 'orders', group: 'orders' },
  { method: 'DELETE', path: '/orders/:id', controller: 'orders', group: 'orders' },
  
  // Health check
  { method: 'GET', path: '/health', controller: 'health', group: 'system' },
  
  // Auth endpoints
  { method: 'POST', path: '/auth/login', controller: 'auth', group: 'auth' },
  { method: 'POST', path: '/auth/logout', controller: 'auth', group: 'auth' },
  { method: 'POST', path: '/auth/refresh', controller: 'auth', group: 'auth' },
];

// Mock RouterRegistry class for demonstration
export class RouterRegistry {
  private routes: RouteInfo[];

  constructor(routes: RouteInfo[]) {
    this.routes = routes;
  }

  getAllRoutes(): RouteInfo[] {
    return this.routes;
  }

  getRoutesByController(controller: string): RouteInfo[] {
    return this.routes.filter(route => route.controller === controller);
  }

  getRoutesByGroup(group: string): RouteInfo[] {
    return this.routes.filter(route => route.group === group);
  }
}

// Create instance
export const routerRegistry = new RouterRegistry(routes);

// Export default for easy importing
export default routerRegistry;
