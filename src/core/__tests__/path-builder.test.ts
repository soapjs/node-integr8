import { PathBuilder, PathSegment } from '../path-builder';

describe('PathBuilder', () => {
  describe('buildFullPath', () => {
    it('should combine simple path segments', () => {
      const segments: PathSegment[] = [
        { path: 'api', source: 'router' },
        { path: 'users', source: 'controller' },
        { path: ':id', source: 'method' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/users/:id');
    });

    it('should handle segments with leading/trailing slashes', () => {
      const segments: PathSegment[] = [
        { path: '/api/', source: 'router' },
        { path: '/users/', source: 'controller' },
        { path: '/:id/', source: 'method' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/users/:id');
    });

    it('should return "/" for empty segments', () => {
      const segments: PathSegment[] = [];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/');
    });

    it('should filter out empty path segments', () => {
      const segments: PathSegment[] = [
        { path: 'api', source: 'router' },
        { path: '', source: 'controller' },
        { path: 'users', source: 'method' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/users');
    });

    it('should handle path with only router segment', () => {
      const segments: PathSegment[] = [
        { path: 'api/v1', source: 'router' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/v1');
    });

    it('should replace multiple consecutive slashes', () => {
      const segments: PathSegment[] = [
        { path: 'api//v1', source: 'router' },
        { path: 'users///posts', source: 'controller' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/v1/users/posts');
    });

    it('should preserve path parameters', () => {
      const segments: PathSegment[] = [
        { path: 'users', source: 'controller' },
        { path: ':userId', source: 'method' },
        { path: 'posts', source: 'method' },
        { path: ':postId', source: 'method' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/users/:userId/posts/:postId');
    });
  });

  describe('createRouterSegment', () => {
    it('should create router segment', () => {
      const segment = PathBuilder.createRouterSegment('api/v1', 'AppModule');

      expect(segment).toEqual({
        path: 'api/v1',
        source: 'router',
        moduleName: 'AppModule'
      });
    });

    it('should handle empty path', () => {
      const segment = PathBuilder.createRouterSegment('');

      expect(segment).toEqual({
        path: '',
        source: 'router',
        moduleName: undefined
      });
    });
  });

  describe('createControllerSegment', () => {
    it('should create controller segment', () => {
      const segment = PathBuilder.createControllerSegment('users', 'UsersController');

      expect(segment).toEqual({
        path: 'users',
        source: 'controller',
        controllerName: 'UsersController'
      });
    });

    it('should handle empty controller name', () => {
      const segment = PathBuilder.createControllerSegment('users');

      expect(segment).toEqual({
        path: 'users',
        source: 'controller',
        controllerName: undefined
      });
    });
  });

  describe('createMethodSegment', () => {
    it('should create method segment', () => {
      const segment = PathBuilder.createMethodSegment(':id');

      expect(segment).toEqual({
        path: ':id',
        source: 'method'
      });
    });

    it('should handle empty path', () => {
      const segment = PathBuilder.createMethodSegment('');

      expect(segment).toEqual({
        path: '',
        source: 'method'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle only whitespace segments', () => {
      const segments: PathSegment[] = [
        { path: '   ', source: 'router' },
        { path: 'users', source: 'controller' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/users');
    });

    it('should handle complex nested paths', () => {
      const segments: PathSegment[] = [
        { path: '/api/v1', source: 'router', moduleName: 'ApiModule' },
        { path: 'organizations/:orgId', source: 'controller', controllerName: 'OrgsController' },
        { path: 'teams/:teamId/members', source: 'method' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/v1/organizations/:orgId/teams/:teamId/members');
    });

    it('should handle paths starting with /', () => {
      const segments: PathSegment[] = [
        { path: '/api', source: 'router' },
        { path: '/users', source: 'controller' }
      ];

      const result = PathBuilder.buildFullPath(segments);

      expect(result).toBe('/api/users');
    });
  });
});

