import {
  normalizeRoutes,
  normalizeUrlConfigs,
  groupRoutesByResource,
  groupUrlsByResource,
  getDefaultStatus,
  generatePathParams,
  enhanceRouteWithConfig,
  enhanceRouteWithScenarios,
  ExtendedRouteInfo,
  UrlConfig
} from '../route-utils';

describe('route-utils', () => {
  describe('normalizeRoutes', () => {
    it('should normalize routes with default values', () => {
      const routes = [
        { path: '/users' }
      ];
      
      const result = normalizeRoutes(routes);
      
      expect(result).toEqual([
        {
          method: 'GET',
          path: '/users',
          resource: undefined,
          endpoint: undefined,
          group: 'api',
          middleware: [],
          params: [],
          request: {},
          response: {},
          description: ''
        }
      ]);
    });

    it('should normalize routes with all properties', () => {
      const routes = [
        {
          method: 'post',
          path: '/users',
          resource: 'users',
          endpoint: 'createUser',
          group: 'api',
          middleware: ['auth'],
          params: ['id'],
          request: { body: {} },
          response: { 201: {} },
          description: 'Create user'
        }
      ];
      
      const result = normalizeRoutes(routes);
      
      expect(result[0].method).toBe('POST');
      expect(result[0].resource).toBe('users');
    });
  });

  describe('normalizeUrlConfigs', () => {
    it('should normalize URL configs', () => {
      const items = [
        {
          url: '/users',
          method: 'get',
          resource: 'users'
        }
      ];
      
      const result = normalizeUrlConfigs(items);
      
      expect(result).toEqual([
        {
          url: '/users',
          method: 'get',
          resource: 'users',
          endpoint: undefined,
          body: undefined,
          queryParams: undefined,
          pathParams: undefined,
          expectedStatus: undefined,
          expectedResponse: undefined,
          description: undefined
        }
      ]);
    });

    it('should handle different property names', () => {
      const items = [
        {
          path: '/users',
          verb: 'POST',
          name: 'users',
          requestBody: { name: 'John' }
        }
      ];
      
      const result = normalizeUrlConfigs(items);
      
      expect(result[0].url).toBe('/users');
      expect(result[0].method).toBe('POST');
      expect(result[0].resource).toBe('users');
      expect(result[0].body).toEqual({ name: 'John' });
    });

    it('should filter out invalid entries', () => {
      const items = [
        { url: '/users' },
        { url: '' },
        { method: 'GET' }
      ];
      
      const result = normalizeUrlConfigs(items);
      
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/users');
    });
  });

  describe('groupRoutesByResource', () => {
    it('should group routes by resource', () => {
      const routes: ExtendedRouteInfo[] = [
        { method: 'GET', path: '/users', resource: 'users' },
        { method: 'POST', path: '/users', resource: 'users' },
        { method: 'GET', path: '/posts', resource: 'posts' }
      ];
      
      const result = groupRoutesByResource(routes);
      
      expect(result.size).toBe(2);
      expect(result.get('users')).toHaveLength(2);
      expect(result.get('posts')).toHaveLength(1);
    });

    it('should extract resource from path if not provided', () => {
      const routes: ExtendedRouteInfo[] = [
        { method: 'GET', path: '/api/users' }
      ];
      
      const result = groupRoutesByResource(routes);
      
      expect(result.has('users')).toBe(true);
    });
  });

  describe('groupUrlsByResource', () => {
    const normalizeUrlToPath = (url: string) => url.startsWith('/') ? url : '/' + url;

    it('should group URLs by resource', () => {
      const urlConfigs: UrlConfig[] = [
        { url: '/users', method: 'GET' },
        { url: '/users', method: 'POST' },
        { url: '/posts', method: 'GET' }
      ];
      
      const result = groupUrlsByResource(urlConfigs, normalizeUrlToPath);
      
      expect(result.size).toBe(2);
      expect(result.get('users')).toHaveLength(2);
      expect(result.get('posts')).toHaveLength(1);
    });
  });

  describe('getDefaultStatus', () => {
    it('should return 200 for GET', () => {
      expect(getDefaultStatus('GET')).toBe(200);
    });

    it('should return 201 for POST', () => {
      expect(getDefaultStatus('POST')).toBe(201);
    });

    it('should return 200 for PUT', () => {
      expect(getDefaultStatus('PUT')).toBe(200);
    });

    it('should return 200 for PATCH', () => {
      expect(getDefaultStatus('PATCH')).toBe(200);
    });

    it('should return 204 for DELETE', () => {
      expect(getDefaultStatus('DELETE')).toBe(204);
    });

    it('should return 200 for unknown methods', () => {
      expect(getDefaultStatus('CUSTOM')).toBe(200);
    });

    it('should be case insensitive', () => {
      expect(getDefaultStatus('get')).toBe(200);
      expect(getDefaultStatus('post')).toBe(201);
    });
  });

  describe('generatePathParams', () => {
    it('should generate path params from path', () => {
      const result = generatePathParams('/users/:id');
      
      expect(result).toEqual({ id: 'test-id' });
    });

    it('should handle multiple params', () => {
      const result = generatePathParams('/users/:userId/posts/:postId');
      
      expect(result).toEqual({
        userId: 'test-userId',
        postId: 'test-postId'
      });
    });

    it('should return undefined for no params', () => {
      const result = generatePathParams('/users');
      
      expect(result).toBeUndefined();
    });
  });

  describe('enhanceRouteWithConfig', () => {
    it('should enhance route with URL config', () => {
      const route = {
        method: 'GET',
        path: '/users'
      };
      
      const urlConfig: UrlConfig = {
        url: '/users',
        method: 'GET',
        body: { name: 'John' },
        expectedStatus: 200
      };
      
      const result = enhanceRouteWithConfig(route, urlConfig);
      
      expect(result.testScenarios).toBeDefined();
      expect(result.testScenarios).toHaveLength(1);
      expect(result.testScenarios![0].expectedStatus).toBe(200);
      expect(result.testScenarios![0].requestData).toEqual({ name: 'John' });
    });

    it('should use default status if not provided', () => {
      const route = {
        method: 'POST',
        path: '/users'
      };
      
      const urlConfig: UrlConfig = {
        url: '/users'
      };
      
      const result = enhanceRouteWithConfig(route, urlConfig);
      
      expect(result.testScenarios![0].expectedStatus).toBe(201);
    });
  });

  describe('enhanceRouteWithScenarios', () => {
    it('should generate scenarios from response codes', () => {
      const route: ExtendedRouteInfo = {
        method: 'GET',
        path: '/users',
        response: {
          200: { success: true },
          404: { error: 'Not found' }
        }
      };
      
      const result = enhanceRouteWithScenarios(route);
      
      expect(result.testScenarios).toHaveLength(2);
      expect(result.testScenarios![0].expectedStatus).toBe(200);
      expect(result.testScenarios![1].expectedStatus).toBe(404);
    });

    it('should create default scenario if no response codes', () => {
      const route: ExtendedRouteInfo = {
        method: 'GET',
        path: '/users'
      };
      
      const result = enhanceRouteWithScenarios(route);
      
      expect(result.testScenarios).toHaveLength(1);
      expect(result.testScenarios![0].expectedStatus).toBe(200);
    });

    it('should use expectedStatus from route if available', () => {
      const route: ExtendedRouteInfo = {
        method: 'POST',
        path: '/users',
        expectedStatus: 202
      };
      
      const result = enhanceRouteWithScenarios(route);
      
      expect(result.testScenarios![0].expectedStatus).toBe(202);
    });

    it('should generate path params for scenarios', () => {
      const route: ExtendedRouteInfo = {
        method: 'GET',
        path: '/users/:id'
      };
      
      const result = enhanceRouteWithScenarios(route);
      
      expect(result.testScenarios![0].pathParams).toEqual({ id: 'test-id' });
    });
  });
});

