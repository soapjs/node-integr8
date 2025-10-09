/**
 * Utilities for working with routes and endpoints
 */

import { RouteInfo } from '../../types';
import { extractResourceName } from './path-utils';

export interface ExtendedRouteInfo extends RouteInfo {
  resource?: string;
  endpoint?: string;
  expectedStatus?: number;
  request?: {
    headers?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
  };
  response?: Record<string, any>;
  description?: string;
  testScenarios?: TestScenario[];
  sourceFile?: string;
  lineNumber?: number;
  decorators?: any;
}

export interface TestScenario {
  description: string;
  expectedStatus: number;
  requestData?: any;
  queryParams?: any;
  pathParams?: any;
  expectedResponse?: any;
}

export interface UrlConfig {
  url: string;
  method?: string;
  resource?: string;
  endpoint?: string;
  body?: any;
  queryParams?: any;
  pathParams?: any;
  expectedStatus?: number;
  expectedResponse?: any;
  description?: string;
}

/**
 * Normalizes routes from different sources to a standard format
 */
export function normalizeRoutes(routes: any[], baseNormalizePath?: (path: string) => string): ExtendedRouteInfo[] {
  const normalizePath = baseNormalizePath || ((p: string) => p);
  
  return routes.map(route => ({
    method: route.method?.toUpperCase() || 'GET',
    path: normalizePath(route.path || '/'),
    resource: route.resource,
    endpoint: route.endpoint,
    group: route.group || route.resource || 'api',
    middleware: route.middleware || [],
    params: route.params || [],
    request: route.request || {},
    response: route.response || {},
    description: route.description || ''
  }));
}

/**
 * Normalizes URL configs from different JSON structures
 */
export function normalizeUrlConfigs(items: any[]): UrlConfig[] {
  return items.map(item => ({
    url: item.url || item.path || item.endpoint || '',
    method: item.method || item.verb || item.httpMethod || 'GET',
    resource: item.resource || item.name || undefined,
    endpoint: item.endpoint || undefined,
    body: item.body || item.requestBody || item.data || undefined,
    queryParams: item.queryParams || item.query || undefined,
    pathParams: item.pathParams || item.params || undefined,
    expectedStatus: item.expectedStatus || item.status || undefined,
    expectedResponse: item.expectedResponse || item.response || undefined,
    description: item.description || undefined
  })).filter(config => config.url && config.url.length > 0);
}

/**
 * Groups routes by resource name
 */
export function groupRoutesByResource(routes: ExtendedRouteInfo[]): Map<string, ExtendedRouteInfo[]> {
  const grouped = new Map<string, ExtendedRouteInfo[]>();
  
  for (const route of routes) {
    const resourceName = route.resource || extractResourceName(route.path);
    
    if (!grouped.has(resourceName)) {
      grouped.set(resourceName, []);
    }
    grouped.get(resourceName)!.push(route);
  }
  
  return grouped;
}

/**
 * Groups URL configs by resource name
 */
export function groupUrlsByResource(urlConfigs: UrlConfig[], normalizeUrlToPath: (url: string) => string): Map<string, UrlConfig[]> {
  const grouped = new Map<string, UrlConfig[]>();
  
  for (const urlConfig of urlConfigs) {
    const path = normalizeUrlToPath(urlConfig.url);
    const resourceName = extractResourceName(path);
    
    if (!grouped.has(resourceName)) {
      grouped.set(resourceName, []);
    }
    grouped.get(resourceName)!.push(urlConfig);
  }
  
  return grouped;
}

/**
 * Returns conventional HTTP status code for a method
 */
export function getDefaultStatus(method: string): number {
  switch (method.toUpperCase()) {
    case 'GET': return 200;
    case 'POST': return 201;
    case 'PUT': return 200;
    case 'PATCH': return 200;
    case 'DELETE': return 204;
    default: return 200;
  }
}

/**
 * Generates path parameters from a path pattern
 */
export function generatePathParams(path: string): any {
  const pathParams = path.match(/:([^/]+)/g);
  if (pathParams) {
    const params: any = {};
    pathParams.forEach(param => {
      const paramName = param.substring(1);
      params[paramName] = `test-${paramName}`;
    });
    return params;
  }
  return undefined;
}

/**
 * Enhances route with test scenarios based on config
 */
export function enhanceRouteWithConfig(route: RouteInfo, urlConfig: UrlConfig): ExtendedRouteInfo {
  const scenarios: TestScenario[] = [];
  
  const scenario: TestScenario = {
    description: urlConfig.description || `should handle ${route.method} request`,
    expectedStatus: urlConfig.expectedStatus || getDefaultStatus(route.method),
    requestData: urlConfig.body,
    queryParams: urlConfig.queryParams,
    pathParams: urlConfig.pathParams,
    expectedResponse: urlConfig.expectedResponse
  };
  
  scenarios.push(scenario);
  
  return {
    ...route,
    testScenarios: scenarios
  };
}

/**
 * Enhances route with test scenarios based on response definitions
 */
export function enhanceRouteWithScenarios(route: ExtendedRouteInfo): ExtendedRouteInfo {
  const scenarios: TestScenario[] = [];
  
  // Generate scenarios based on response codes
  if (route.response) {
    Object.keys(route.response).forEach((statusCode: string) => {
      const status = parseInt(statusCode);
      if (!isNaN(status)) {
        scenarios.push({
          description: `should return ${status}`,
          expectedStatus: status,
          requestData: route.request?.body,
          queryParams: route.request?.query,
          pathParams: generatePathParams(route.path),
          expectedResponse: route.response?.[statusCode] || {}
        });
      }
    });
  }
  
  // If no response codes defined, add default scenarios
  if (scenarios.length === 0) {
    const expectedStatus = route.expectedStatus || getDefaultStatus(route.method);
    scenarios.push({
      description: `should handle ${route.method} request`,
      expectedStatus: expectedStatus,
      requestData: route.request?.body,
      queryParams: route.request?.query,
      pathParams: generatePathParams(route.path)
    });
  }
  
  return {
    ...route,
    testScenarios: scenarios
  };
}

