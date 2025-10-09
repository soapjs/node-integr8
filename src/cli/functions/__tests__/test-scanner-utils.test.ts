import {
  scanTestFiles,
  findTestFiles,
  isTestFile,
  extractTestedEndpoints,
  normalizePathFromUrl
} from '../test-scanner-utils';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  statSync: jest.fn()
}));

describe('test-scanner-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isTestFile', () => {
    it('should identify .test.ts files', () => {
      expect(isTestFile('/path/to/users.test.ts')).toBe(true);
    });

    it('should identify .spec.ts files', () => {
      expect(isTestFile('/path/to/users.spec.ts')).toBe(true);
    });

    it('should identify .test.js files', () => {
      expect(isTestFile('/path/to/users.test.js')).toBe(true);
    });

    it('should reject non-test files', () => {
      expect(isTestFile('/path/to/users.ts')).toBe(false);
      expect(isTestFile('/path/to/users.js')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isTestFile('/path/to/Users.TEST.ts')).toBe(true);
      expect(isTestFile('/path/to/Users.SPEC.ts')).toBe(true);
    });
  });

  describe('normalizePathFromUrl', () => {
    it('should remove query parameters', () => {
      expect(normalizePathFromUrl('/users?page=1')).toBe('/users');
    });

    it('should add leading slash if missing', () => {
      expect(normalizePathFromUrl('users')).toBe('/users');
    });

    it('should handle paths with hash', () => {
      expect(normalizePathFromUrl('/users#section')).toBe('/users#section');
    });

    it('should keep path as-is if already normalized', () => {
      expect(normalizePathFromUrl('/users')).toBe('/users');
    });
  });

  describe('extractTestedEndpoints', () => {
    it('should extract endpoints from getHttp().method() pattern', () => {
      const content = `
        const response = await ctx.getHttp().get('/users');
      `;
      
      const result = extractTestedEndpoints(content, 'test.ts');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        method: 'GET',
        path: '/users',
        testFile: 'test.ts'
      });
    });

    it('should extract endpoints from getHttp(name).method() pattern', () => {
      const content = `
        const response = await ctx.getHttp('app').post('/users', data);
      `;
      
      const result = extractTestedEndpoints(content, 'test.ts');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        method: 'POST',
        path: '/users',
        testFile: 'test.ts'
      });
    });

    it('should extract multiple endpoints', () => {
      const content = `
        await ctx.getHttp().get('/users');
        await ctx.getHttp().post('/posts');
      `;
      
      const result = extractTestedEndpoints(content, 'test.ts');
      
      expect(result).toHaveLength(2);
    });

    it('should normalize paths', () => {
      const content = `
        await ctx.getHttp().get('/users?page=1');
      `;
      
      const result = extractTestedEndpoints(content, 'test.ts');
      
      expect(result[0].path).toBe('/users');
    });

    it('should handle all HTTP methods', () => {
      const content = `
        await ctx.getHttp().get('/users');
        await ctx.getHttp().post('/users');
        await ctx.getHttp().put('/users');
        await ctx.getHttp().patch('/users');
        await ctx.getHttp().delete('/users');
        await ctx.getHttp().head('/users');
        await ctx.getHttp().options('/users');
      `;
      
      const result = extractTestedEndpoints(content, 'test.ts');
      
      expect(result).toHaveLength(7);
      expect(result.map(r => r.method)).toEqual([
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
      ]);
    });

    it('should handle different quote styles', () => {
      const content = `
        await ctx.getHttp().get("/users");
        await ctx.getHttp().get('/posts');
        await ctx.getHttp().get(\`/comments\`);
      `;
      
      const result = extractTestedEndpoints(content, 'test.ts');
      
      expect(result).toHaveLength(3);
    });
  });

  describe('findTestFiles', () => {
    it('should find test files recursively', () => {
      const fs = require('fs');
      fs.readdirSync.mockReturnValueOnce(['users.test.ts', 'posts.test.ts', 'nested', 'utils.ts'])
        .mockReturnValueOnce(['comments.test.ts']);
      
      fs.statSync.mockImplementation((path: string) => ({
        isDirectory: () => path.includes('nested')
      }));

      const result = findTestFiles('/tests');
      
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent directory', () => {
      const result = findTestFiles('/nonexistent');
      
      expect(result).toEqual([]);
    });
  });

  describe('scanTestFiles', () => {
    it('should warn if directory not found', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await scanTestFiles('/nonexistent');
      
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle errors reading files gracefully', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['test.test.ts']);
      fs.statSync.mockReturnValue({ isDirectory: () => false });
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await scanTestFiles('/tests');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });
});

