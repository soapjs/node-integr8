import {
  extractDescribeBlock,
  extractDescribeTitle,
  describeExists,
  generateImports,
  generateImportsSection,
  generateSetupTeardownSection,
  findImportsEndIndex,
  findDescribeBlocksStartIndex,
  mergeTestContent
} from '../test-file-utils';

describe('test-file-utils', () => {
  describe('extractDescribeBlock', () => {
    it('should extract describe block from content', () => {
      const content = `
import { test } from '@jest/globals';

describe('User API', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`;
      const result = extractDescribeBlock(content);
      
      expect(result).toContain("describe('User API'");
      expect(result).toContain('it(');
    });

    it('should return null if no describe block found', () => {
      const content = 'const a = 1;';
      const result = extractDescribeBlock(content);
      
      expect(result).toBeNull();
    });

    it('should handle nested braces correctly', () => {
      const content = `
describe('Test', () => {
  const obj = { a: 1, b: { c: 2 } };
  it('works', () => {
    expect(obj).toBeDefined();
  });
});
`;
      const result = extractDescribeBlock(content);
      
      expect(result).toContain('const obj =');
    });
  });

  describe('extractDescribeTitle', () => {
    it('should extract title from describe block', () => {
      const block = "describe('User API', () => {";
      const result = extractDescribeTitle(block);
      
      expect(result).toBe('User API');
    });

    it('should handle double quotes', () => {
      const block = 'describe("User API", () => {';
      const result = extractDescribeTitle(block);
      
      expect(result).toBe('User API');
    });

    it('should handle backticks', () => {
      const block = 'describe(`User API`, () => {';
      const result = extractDescribeTitle(block);
      
      expect(result).toBe('User API');
    });

    it('should return null for invalid format', () => {
      const block = 'const a = 1;';
      const result = extractDescribeTitle(block);
      
      expect(result).toBeNull();
    });
  });

  describe('describeExists', () => {
    it('should find existing describe block', () => {
      const content = `
describe('User API', () => {
  it('works', () => {});
});
`;
      const result = describeExists(content, 'User API');
      
      expect(result).toBe(true);
    });

    it('should return false for non-existing describe', () => {
      const content = `
describe('User API', () => {
  it('works', () => {});
});
`;
      const result = describeExists(content, 'Posts API');
      
      expect(result).toBe(false);
    });

    it('should handle special regex characters', () => {
      const content = `
describe('GET /users/:id', () => {
  it('works', () => {});
});
`;
      const result = describeExists(content, 'GET /users/:id');
      
      expect(result).toBe(true);
    });
  });

  describe('generateImports', () => {
    it('should generate standard imports', () => {
      const result = generateImports();
      
      expect(result).toHaveProperty('@soapjs/integr8');
      expect(result['@soapjs/integr8']).toContain('setupEnvironment');
      expect(result['@soapjs/integr8']).toContain('teardownEnvironment');
      expect(result['@soapjs/integr8']).toContain('getEnvironmentContext');
    });
  });

  describe('generateImportsSection', () => {
    it('should generate import statements', () => {
      const imports = {
        '@soapjs/integr8': ['setupEnvironment', 'teardownEnvironment'],
        'axios': ['default']
      };
      
      const result = generateImportsSection(imports);
      
      expect(result).toContain("import { setupEnvironment, teardownEnvironment } from '@soapjs/integr8';");
      expect(result).toContain("import { default } from 'axios';");
    });
  });

  describe('generateSetupTeardownSection', () => {
    it('should generate setup and teardown code', () => {
      const result = generateSetupTeardownSection();
      
      expect(result).toContain('beforeAll');
      expect(result).toContain('afterAll');
      expect(result).toContain('setupEnvironment');
      expect(result).toContain('teardownEnvironment');
    });
  });

  describe('findImportsEndIndex', () => {
    it('should find end of imports section', () => {
      const lines = [
        "import { test } from 'jest';",
        "import { setup } from '@soapjs/integr8';",
        '',
        'describe()',
      ];
      
      const result = findImportsEndIndex(lines);
      
      expect(result).toBe(2);
    });

    it('should return -1 if no imports found', () => {
      const lines = ['const a = 1;'];
      const result = findImportsEndIndex(lines);
      
      expect(result).toBe(-1);
    });
  });

  describe('findDescribeBlocksStartIndex', () => {
    it('should find start of describe blocks', () => {
      const lines = [
        "import { test } from 'jest';",
        '',
        'beforeAll(() => {});',
        '',
        'describe("Test", () => {})',
      ];
      
      const result = findDescribeBlocksStartIndex(lines);
      
      expect(result).toBe(4);
    });

    it('should return -1 if no describe found', () => {
      const lines = ['const a = 1;'];
      const result = findDescribeBlocksStartIndex(lines);
      
      expect(result).toBe(-1);
    });
  });

  describe('mergeTestContent', () => {
    it('should create new file if no existing content', () => {
      const generator = {
        setupTeardownTemplate: jest.fn().mockReturnValue('// setup')
      } as any;
      
      const newBlocks = ['describe("Test", () => {})'];
      const result = mergeTestContent('', newBlocks, generator, '/test.ts', 'config.js');
      
      expect(result).toContain('import');
      expect(result).toContain('// setup');
      expect(result).toContain('describe("Test"');
    });

    it('should skip existing test blocks', () => {
      const existingContent = `
import { test } from 'jest';

beforeAll(() => {});

describe('Existing Test', () => {
  it('works', () => {});
});
`;
      
      const generator = {
        setupTeardownTemplate: jest.fn()
      } as any;
      
      const newBlocks = [
        'describe("Existing Test", () => {})',
        'describe("New Test", () => {})'
      ];
      
      const result = mergeTestContent(existingContent, newBlocks, generator, '/test.ts');
      
      expect(result).toContain('New Test');
      expect(result.match(/Existing Test/g)).toHaveLength(1);
    });

    it('should append at end if structure not recognized', () => {
      const existingContent = 'const a = 1;';
      const generator = {} as any;
      const newBlocks = ['describe("Test", () => {})'];
      
      const result = mergeTestContent(existingContent, newBlocks, generator, '/test.ts');
      
      expect(result).toContain('const a = 1;');
      expect(result).toContain('describe("Test"');
    });

    it('should return existing content if no new blocks to add', () => {
      const existingContent = `
import { test } from 'jest';

describe('Test', () => {});
`;
      const generator = {} as any;
      const newBlocks = ['describe("Test", () => {})'];
      
      const result = mergeTestContent(existingContent, newBlocks, generator, '/test.ts');
      
      expect(result).toBe(existingContent);
    });
  });
});

