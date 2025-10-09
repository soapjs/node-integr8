import {
  normalizePath,
  normalizeUrlToPath,
  extractResourceName,
  extractEndpointName,
  extractControllerFromPath,
  extractGroupFromPath,
  extractParamsFromPath,
  normalizePathForComparison,
  looksLikeParam,
  capitalize
} from '../path-utils';

describe('path-utils', () => {
  describe('normalizePath', () => {
    it('should normalize full URL to path', () => {
      expect(normalizePath('http://localhost:3000/api/users')).toBe('/api/users');
    });

    it('should handle malformed URLs', () => {
      expect(normalizePath('/http://localhost:3000/api/users')).toBe('/api/users');
    });

    it('should add leading slash if missing', () => {
      expect(normalizePath('api/users')).toBe('/api/users');
    });

    it('should return path as-is if already normalized', () => {
      expect(normalizePath('/api/users')).toBe('/api/users');
    });

    it('should handle paths with query params', () => {
      expect(normalizePath('http://localhost:3000/api/users?id=1')).toBe('/api/users');
    });
  });

  describe('normalizeUrlToPath', () => {
    it('should return default path for undefined URL', () => {
      expect(normalizeUrlToPath(undefined)).toBe('/');
    });

    it('should extract path from URL with baseUrl', () => {
      expect(normalizeUrlToPath('http://localhost:3000/api/users', 'http://localhost:3000')).toBe('/api/users');
    });

    it('should extract pathname from full URL', () => {
      expect(normalizeUrlToPath('http://localhost:3000/api/users')).toBe('/api/users');
    });

    it('should handle already normalized paths', () => {
      expect(normalizeUrlToPath('/api/users')).toBe('/api/users');
    });

    it('should add leading slash if missing', () => {
      expect(normalizeUrlToPath('api/users')).toBe('/api/users');
    });
  });

  describe('extractResourceName', () => {
    it('should extract resource from simple path', () => {
      expect(extractResourceName('/users')).toBe('users');
    });

    it('should extract resource from path with params', () => {
      expect(extractResourceName('/users/:id')).toBe('users');
    });

    it('should skip api and v1 prefixes', () => {
      expect(extractResourceName('/api/v1/users')).toBe('users');
    });

    it('should return endpoint for empty path', () => {
      expect(extractResourceName('/')).toBe('endpoint');
    });

    it('should handle nested resources', () => {
      expect(extractResourceName('/api/users/posts')).toBe('users');
    });
  });

  describe('extractEndpointName', () => {
    it('should extract endpoint from simple path', () => {
      expect(extractEndpointName('/users')).toBe('users');
    });

    it('should extract endpoint from path with params', () => {
      expect(extractEndpointName('/users/:id')).toBe('id');
    });

    it('should return root for empty path', () => {
      expect(extractEndpointName('/')).toBe('root');
    });

    it('should clean special characters', () => {
      expect(extractEndpointName('/api/users@123')).toBe('users-123');
    });

    it('should handle multiple consecutive dashes', () => {
      expect(extractEndpointName('/api//users')).toBe('users');
    });

    it('should get last meaningful part', () => {
      expect(extractEndpointName('/api/v1/users/posts')).toBe('posts');
    });
  });

  describe('extractControllerFromPath', () => {
    it('should extract controller from path', () => {
      expect(extractControllerFromPath('/users')).toBe('UsersController');
    });

    it('should return RootController for empty path', () => {
      expect(extractControllerFromPath('/')).toBe('RootController');
    });

    it('should capitalize first part', () => {
      expect(extractControllerFromPath('/api/users')).toBe('ApiController');
    });
  });

  describe('extractGroupFromPath', () => {
    it('should extract group from path', () => {
      expect(extractGroupFromPath('/users')).toBe('users');
    });

    it('should return api for empty path', () => {
      expect(extractGroupFromPath('/')).toBe('api');
    });

    it('should get first part', () => {
      expect(extractGroupFromPath('/api/users')).toBe('api');
    });
  });

  describe('extractParamsFromPath', () => {
    it('should extract params from path', () => {
      expect(extractParamsFromPath('/users/:id')).toEqual(['id']);
    });

    it('should extract multiple params', () => {
      expect(extractParamsFromPath('/users/:userId/posts/:postId')).toEqual(['userId', 'postId']);
    });

    it('should return empty array for no params', () => {
      expect(extractParamsFromPath('/users')).toEqual([]);
    });
  });

  describe('normalizePathForComparison', () => {
    it('should normalize numeric IDs to :id', () => {
      expect(normalizePathForComparison('/users/123')).toBe('/users/:id');
    });

    it('should normalize UUIDs to :id', () => {
      expect(normalizePathForComparison('/users/550e8400-e29b-41d4-a716-446655440000')).toBe('/users/:id');
    });

    it('should normalize MongoDB ObjectIds to :id', () => {
      expect(normalizePathForComparison('/users/507f1f77bcf86cd799439011')).toBe('/users/:id');
    });

    it('should keep already normalized paths', () => {
      expect(normalizePathForComparison('/users/:id')).toBe('/users/:id');
    });

    it('should handle multiple IDs', () => {
      expect(normalizePathForComparison('/users/123/posts/456')).toBe('/users/:id/posts/:id');
    });
  });

  describe('looksLikeParam', () => {
    it('should identify numeric values as params', () => {
      expect(looksLikeParam('123')).toBe(true);
    });

    it('should identify UUIDs as params', () => {
      expect(looksLikeParam('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should identify MongoDB ObjectIds as params', () => {
      expect(looksLikeParam('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should not identify common words as params', () => {
      expect(looksLikeParam('api')).toBe(false);
      expect(looksLikeParam('v1')).toBe(false);
    });

    it('should not identify already parameterized segments', () => {
      expect(looksLikeParam(':id')).toBe(false);
    });

    it('should identify short alphanumeric values as params', () => {
      expect(looksLikeParam('abc')).toBe(true);
    });

    it('should return false for empty segments', () => {
      expect(looksLikeParam('')).toBe(false);
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('users')).toBe('Users');
    });

    it('should lowercase rest of the string', () => {
      expect(capitalize('USERS')).toBe('Users');
    });

    it('should handle single character', () => {
      expect(capitalize('u')).toBe('U');
    });
  });
});

