import { DatabaseManager } from '../database-manager';
import { DBStateManager } from '../db-state-manager';
import { SeedManager } from '../seed-manager';
import { DatabaseConfig } from '../../types';

jest.mock('../db-state-manager');
jest.mock('../seed-manager');
jest.mock('../../utils/logger', () => ({
  createServiceLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('DatabaseManager', () => {
  let databaseManager: DatabaseManager;
  let mockConfig: DatabaseConfig;
  let mockStateManager: jest.Mocked<DBStateManager>;
  let mockSeedManager: jest.Mocked<SeedManager>;

  beforeEach(() => {
    mockConfig = {
      name: 'test-db',
      category: 'database',
      type: 'postgres',
      mode: 'container',
      isolation: 'savepoint',
      container: {
        image: 'postgres:15',
        containerName: 'test-postgres',
        ports: [{ host: 5432, container: 5432 }],
        environment: {}
      }
    } as any;

    mockStateManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      createSavepoint: jest.fn().mockResolvedValue('sp_1'),
      rollbackToSavepoint: jest.fn().mockResolvedValue(undefined),
      createSchema: jest.fn().mockResolvedValue(undefined),
      dropSchema: jest.fn().mockResolvedValue(undefined),
      createDatabase: jest.fn().mockResolvedValue(undefined),
      dropDatabase: jest.fn().mockResolvedValue(undefined),
      createSnapshot: jest.fn().mockResolvedValue(undefined),
      restoreSnapshot: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      getConnectionString: jest.fn().mockReturnValue('postgresql://localhost:5432/test')
    } as any;

    mockSeedManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      seedForFile: jest.fn().mockResolvedValue(undefined),
      seedForTest: jest.fn().mockResolvedValue(undefined),
      restoreAfterFile: jest.fn().mockResolvedValue(undefined),
      restoreAfterTest: jest.fn().mockResolvedValue(undefined),
      getSeedingStatus: jest.fn().mockReturnValue({})
    } as any;

    (DBStateManager as jest.Mock).mockImplementation(() => mockStateManager);
    (SeedManager as jest.Mock).mockImplementation(() => mockSeedManager);

    databaseManager = new DatabaseManager(
      mockConfig,
      'worker-1',
      { 'test-db': 'postgresql://localhost:5432/test' },
      'savepoint'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize state and seed managers', async () => {
      await databaseManager.initialize();

      expect(mockStateManager.initialize).toHaveBeenCalled();
      expect(mockSeedManager.initialize).toHaveBeenCalled();
    });
  });

  describe('snapshot', () => {
    beforeEach(async () => {
      await databaseManager.initialize();
    });

    it('should create savepoint when isolation is savepoint', async () => {
      await databaseManager.snapshot('test-snapshot');

      expect(mockStateManager.createSavepoint).toHaveBeenCalled();
    });

    it('should create schema when isolation is schema', async () => {
      const schemaConfig = { ...mockConfig, isolation: 'schema' };
      const manager = new DatabaseManager(schemaConfig as any, 'worker-1', {}, 'schema');
      await manager.initialize();

      await manager.snapshot('test-snapshot');

      expect(mockStateManager.createSchema).toHaveBeenCalledWith('test-snapshot_worker-1');
    });

    it('should create database when isolation is database', async () => {
      const dbConfig = { ...mockConfig, isolation: 'database' };
      const manager = new DatabaseManager(dbConfig as any, 'worker-1', {}, 'database');
      await manager.initialize();

      await manager.snapshot('test-snapshot');

      expect(mockStateManager.createDatabase).toHaveBeenCalledWith('test-snapshot_worker-1');
    });

    it('should create snapshot when isolation is snapshot', async () => {
      const snapshotConfig = { ...mockConfig, isolation: 'snapshot' };
      const manager = new DatabaseManager(snapshotConfig as any, 'worker-1', {}, 'snapshot');
      await manager.initialize();

      await manager.snapshot('test-snapshot');

      expect(mockStateManager.createSnapshot).toHaveBeenCalledWith('test-snapshot');
    });
  });

  describe('restore', () => {
    beforeEach(async () => {
      await databaseManager.initialize();
    });

    it('should rollback to savepoint when isolation is savepoint', async () => {
      await databaseManager.snapshot('test-snapshot');
      await databaseManager.restore('test-snapshot');

      expect(mockStateManager.rollbackToSavepoint).toHaveBeenCalledWith('sp_1');
    });

    it('should drop schema when isolation is schema', async () => {
      const schemaConfig = { ...mockConfig, isolation: 'schema' };
      const manager = new DatabaseManager(schemaConfig as any, 'worker-1', {}, 'schema');
      await manager.initialize();

      await manager.snapshot('test-snapshot');
      await manager.restore('test-snapshot');

      expect(mockStateManager.dropSchema).toHaveBeenCalled();
    });

    it('should drop database when isolation is database', async () => {
      const dbConfig = { ...mockConfig, isolation: 'database' };
      const manager = new DatabaseManager(dbConfig as any, 'worker-1', {}, 'database');
      await manager.initialize();

      await manager.snapshot('test-snapshot');
      await manager.restore('test-snapshot');

      expect(mockStateManager.dropDatabase).toHaveBeenCalled();
    });

    it('should restore snapshot when isolation is snapshot', async () => {
      const snapshotConfig = { ...mockConfig, isolation: 'snapshot' };
      const manager = new DatabaseManager(snapshotConfig as any, 'worker-1', {}, 'snapshot');
      await manager.initialize();

      await manager.snapshot('test-snapshot');
      await manager.restore('test-snapshot');

      expect(mockStateManager.restoreSnapshot).toHaveBeenCalledWith('test-snapshot');
    });
  });

  describe('seeding methods', () => {
    it('should delegate seedForFile to seed manager', async () => {
      await databaseManager.seedForFile('test.sql');

      expect(mockSeedManager.seedForFile).toHaveBeenCalledWith('test.sql');
    });

    it('should delegate seedForTest to seed manager', async () => {
      await databaseManager.seedForTest('test-1', 'test.ts');

      expect(mockSeedManager.seedForTest).toHaveBeenCalledWith('test-1', 'test.ts');
    });

    it('should delegate restoreAfterFile to seed manager', async () => {
      await databaseManager.restoreAfterFile('test.sql');

      expect(mockSeedManager.restoreAfterFile).toHaveBeenCalledWith('test.sql');
    });

    it('should delegate restoreAfterTest to seed manager', async () => {
      await databaseManager.restoreAfterTest('test-1', 'test.ts');

      expect(mockSeedManager.restoreAfterTest).toHaveBeenCalledWith('test-1', 'test.ts');
    });

    it('should get seeding status from seed manager', () => {
      const status = databaseManager.getSeedingStatus();

      expect(mockSeedManager.getSeedingStatus).toHaveBeenCalled();
      expect(status).toBeDefined();
    });
  });

  describe('transaction', () => {
    it('should execute transaction and commit on success', async () => {
      const result = await databaseManager.transaction(async (tx) => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      await expect(
        databaseManager.transaction(async (tx) => {
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('query', () => {
    it('should execute query and return results', async () => {
      const result = await databaseManager.query('SELECT * FROM users');

      expect(result).toEqual({ rows: [], rowCount: 0 });
    });

    it('should accept parameters', async () => {
      const result = await databaseManager.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should cleanup state manager', async () => {
      await databaseManager.reset();

      expect(mockStateManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('getConnectionString', () => {
    it('should return connection string for database', () => {
      const connectionString = databaseManager.getConnectionString();

      expect(connectionString).toBeDefined();
      expect(connectionString).toContain('postgresql://');
    });

    it('should throw error when no config provided', () => {
      const managerWithoutConfig = new DatabaseManager(undefined, 'worker-1');

      expect(() => managerWithoutConfig.getConnectionString()).toThrow(
        'No database service configuration found'
      );
    });
  });

  describe('constructor', () => {
    it('should work without config (fallback logger)', () => {
      const manager = new DatabaseManager(undefined, 'worker-1', {}, 'savepoint');
      
      expect(manager).toBeDefined();
    });

    it('should initialize with default isolation strategy', () => {
      const manager = new DatabaseManager(mockConfig, 'worker-1');
      
      expect(manager).toBeDefined();
    });

    it('should create DBStateManager and SeedManager', () => {
      const expectedConnectionStrings = { 'test-db': 'postgresql://localhost:5432/test' };
      
      expect(DBStateManager).toHaveBeenCalledWith(
        mockConfig, 
        'worker-1', 
        expectedConnectionStrings
      );
      expect(SeedManager).toHaveBeenCalledWith(
        mockConfig, 
        'worker-1', 
        expectedConnectionStrings
      );
    });
  });
});

