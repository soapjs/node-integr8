import { EnvironmentContext } from '../environment-context';
import { Integr8Config } from '../../types';
import { Logger } from '../../utils/logger';
import { HttpClient } from '../http-client';
import { DatabaseManager } from '../database-manager';
import { TestContext } from '../test-context';
import { ClockManager } from '../clock-manager';
import { EventBusManager } from '../event-bus-manager';

jest.mock('../http-client');
jest.mock('../database-manager');
jest.mock('../test-context');
jest.mock('../clock-manager');
jest.mock('../event-bus-manager');
jest.mock('../../utils/url.utils', () => ({
  buildUrl: jest.fn((http) => `http://localhost:${http.port || 3000}`)
}));

describe('EnvironmentContext', () => {
  let context: EnvironmentContext;
  let mockConfig: Integr8Config;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockConfig = {
      services: [
        {
          name: 'app',
          category: 'service',
          type: 'http',
          mode: 'container',
          http: {
            baseUrl: 'http://localhost',
            port: 3000,
            prefix: '/api'
          }
        }
      ],
      databases: [
        {
          name: 'postgres',
          category: 'database',
          type: 'postgres',
          mode: 'container'
        }
      ],
      messaging: [
        {
          name: 'kafka',
          category: 'messaging',
          type: 'kafka',
          mode: 'container'
        }
      ],
      storages: [
        {
          name: 's3',
          category: 'storage',
          type: 's3',
          mode: 'container'
        }
      ],
      testDir: './tests'
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    context = new EnvironmentContext(mockConfig, 'worker-1', mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create EnvironmentContext instance', () => {
      const ctx = EnvironmentContext.create(mockConfig, 'worker-1', mockLogger);

      expect(ctx).toBeInstanceOf(EnvironmentContext);
    });
  });

  describe('constructor', () => {
    it('should initialize test context', () => {
      expect(TestContext).toHaveBeenCalledWith('worker-1');
    });

    it('should initialize clock manager', () => {
      expect(ClockManager).toHaveBeenCalled();
    });

    it('should initialize event bus manager', () => {
      expect(EventBusManager).toHaveBeenCalledWith(mockConfig, 'worker-1', mockLogger);
    });
  });

  describe('initialize', () => {
    it('should initialize HTTP clients for services', async () => {
      await context.initialize();

      expect(HttpClient).toHaveBeenCalledWith('http://localhost:3000');
    });

    it('should initialize databases', async () => {
      const mockDbManager = {
        initialize: jest.fn().mockResolvedValue(undefined)
      };
      (DatabaseManager as jest.Mock).mockImplementation(() => mockDbManager);

      await context.initialize();

      expect(DatabaseManager).toHaveBeenCalledWith(mockConfig.databases![0], 'worker-1');
      expect(mockDbManager.initialize).toHaveBeenCalled();
    });

    it('should work without databases', async () => {
      const configWithoutDb = { ...mockConfig, databases: undefined };
      const ctx = new EnvironmentContext(configWithoutDb, 'worker-1', mockLogger);

      await expect(ctx.initialize()).resolves.not.toThrow();
    });

    it('should initialize messaging services', async () => {
      await context.initialize();

      const messaging = context.getMessaging('kafka');
      expect(messaging).toBeDefined();
    });

    it('should initialize storage services', async () => {
      await context.initialize();

      const storage = context.getStorage('s3');
      expect(storage).toBeDefined();
    });
  });

  describe('getHttp', () => {
    it('should return HTTP client for service', async () => {
      await context.initialize();
      
      const httpClient = context.getHttp('app');

      expect(httpClient).toBeDefined();
    });

    it('should use default service name "app"', async () => {
      await context.initialize();
      
      const httpClient = context.getHttp();

      expect(httpClient).toBeDefined();
    });
  });

  describe('getDb', () => {
    it('should return database manager for service', async () => {
      const mockDbManager = {
        initialize: jest.fn().mockResolvedValue(undefined)
      };
      (DatabaseManager as jest.Mock).mockImplementation(() => mockDbManager);

      await context.initialize();
      
      const db = context.getDb('postgres');

      expect(db).toBe(mockDbManager);
    });
  });

  describe('getMessaging', () => {
    it('should return messaging manager for service', async () => {
      await context.initialize();
      
      const messaging = context.getMessaging('kafka');

      expect(messaging).toBeDefined();
    });
  });

  describe('getStorage', () => {
    it('should return storage manager for service', async () => {
      await context.initialize();
      
      const storage = context.getStorage('s3');

      expect(storage).toBeDefined();
    });
  });

  describe('getCtx', () => {
    it('should return test context', () => {
      const ctx = context.getCtx();

      expect(ctx).toBeDefined();
    });
  });

  describe('getClock', () => {
    it('should return clock manager', () => {
      const clock = context.getClock();

      expect(clock).toBeDefined();
    });
  });

  describe('getBus', () => {
    it('should return event bus manager', () => {
      const bus = context.getBus();

      expect(bus).toBeDefined();
    });
  });

  describe('seeding methods', () => {
    let mockDbManager: any;

    beforeEach(async () => {
      mockDbManager = {
        initialize: jest.fn().mockResolvedValue(undefined),
        seedForFile: jest.fn().mockResolvedValue(undefined),
        seedForTest: jest.fn().mockResolvedValue(undefined),
        restoreAfterFile: jest.fn().mockResolvedValue(undefined),
        restoreAfterTest: jest.fn().mockResolvedValue(undefined)
      };
      (DatabaseManager as jest.Mock).mockImplementation(() => mockDbManager);
      await context.initialize();
    });

    describe('seedForFile', () => {
      it('should seed specific database', async () => {
        await context.seedForFile('test.sql', 'postgres');

        expect(mockDbManager.seedForFile).toHaveBeenCalledWith('test.sql');
      });

      it('should seed all databases when no database specified', async () => {
        await context.seedForFile('test.sql');

        expect(mockDbManager.seedForFile).toHaveBeenCalledWith('test.sql');
      });
    });

    describe('seedForTest', () => {
      it('should seed specific database for test', async () => {
        await context.seedForTest('test-name', 'test.ts', 'postgres');

        expect(mockDbManager.seedForTest).toHaveBeenCalledWith('test-name', 'test.ts');
      });

      it('should seed all databases for test when no database specified', async () => {
        await context.seedForTest('test-name', 'test.ts');

        expect(mockDbManager.seedForTest).toHaveBeenCalledWith('test-name', 'test.ts');
      });
    });

    describe('restoreAfterFile', () => {
      it('should restore specific database after file', async () => {
        await context.restoreAfterFile('test.sql', 'postgres');

        expect(mockDbManager.restoreAfterFile).toHaveBeenCalledWith('test.sql');
      });

      it('should restore all databases after file when no database specified', async () => {
        await context.restoreAfterFile('test.sql');

        expect(mockDbManager.restoreAfterFile).toHaveBeenCalledWith('test.sql');
      });
    });

    describe('restoreAfterTest', () => {
      it('should restore specific database after test', async () => {
        await context.restoreAfterTest('test-name', 'test.ts', 'postgres');

        expect(mockDbManager.restoreAfterTest).toHaveBeenCalledWith('test-name', 'test.ts');
      });

      it('should restore all databases after test when no database specified', async () => {
        await context.restoreAfterTest('test-name', 'test.ts');

        expect(mockDbManager.restoreAfterTest).toHaveBeenCalledWith('test-name', 'test.ts');
      });
    });
  });
});

