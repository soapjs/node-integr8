import { DatabaseOrchestrator } from '../database-orchestrator';
import { DatabaseConfig, Integr8Config, IEventBusManager } from '../../../types';
import { Logger } from '../../../utils/logger';
import { LocalRunner } from '../../runners/local-runner';
import { ContainerRunner } from '../../runners/container-runner';

jest.mock('../../runners/local-runner');
jest.mock('../../runners/container-runner');

describe('DatabaseOrchestrator', () => {
  let orchestrator: DatabaseOrchestrator;
  let mockLogger: jest.Mocked<Logger>;
  let mockEventBus: jest.Mocked<IEventBusManager>;
  let mockConfig: Integr8Config;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn()
    } as any;

    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    } as any;

    mockConfig = {
      databases: [
        {
          name: 'postgres',
          category: 'database',
          type: 'postgres',
          mode: 'container',
          container: {
            image: 'postgres:15',
            containerName: 'test-postgres',
            ports: [{ host: 5432, container: 5432 }],
            environment: {
              POSTGRES_DB: 'testdb',
              POSTGRES_USER: 'testuser',
              POSTGRES_PASSWORD: 'testpass'
            }
          }
        }
      ]
    } as any;

    orchestrator = new DatabaseOrchestrator(mockConfig, mockLogger, mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should start all database services', async () => {
      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isReady: jest.fn().mockResolvedValue(true),
        getConnectionStrings: jest.fn().mockReturnValue({ postgres: 'postgresql://localhost:5432' })
      };

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      await orchestrator.start(false);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting database orchestrator...');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting database: postgres');
      expect(mockRunner.start).toHaveBeenCalledWith(false);
      expect(mockEventBus.publish).toHaveBeenCalledWith('service:started', {
        serviceName: 'postgres',
        service: mockConfig.databases![0]
      });
    });

    it('should use LocalRunner for local databases', async () => {
      const localConfig: Integr8Config = {
        databases: [
          {
            name: 'local-db',
            category: 'database',
            type: 'postgres',
            mode: 'local',
            local: {
              command: 'npm run db:start',
              cwd: '.'
            }
          }
        ]
      } as any;

      const localOrchestrator = new DatabaseOrchestrator(localConfig, mockLogger, mockEventBus);

      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isReady: jest.fn().mockResolvedValue(true)
      };

      (LocalRunner as jest.Mock).mockImplementation(() => mockRunner);

      await localOrchestrator.start(false);

      expect(LocalRunner).toHaveBeenCalled();
      expect(mockRunner.start).toHaveBeenCalled();
    });

    it('should handle errors and publish failure events', async () => {
      const mockRunner = {
        start: jest.fn().mockRejectedValue(new Error('Connection failed')),
        stop: jest.fn(),
        isReady: jest.fn()
      };

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      await expect(orchestrator.start(false)).rejects.toThrow('Connection failed');

      expect(mockEventBus.publish).toHaveBeenCalledWith('service:failed', {
        serviceName: 'postgres',
        service: mockConfig.databases![0],
        error: 'Connection failed'
      });
    });

    it('should pass fast mode to runners', async () => {
      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isReady: jest.fn().mockResolvedValue(true),
        getConnectionStrings: jest.fn().mockReturnValue({})
      };

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      await orchestrator.start(true);

      expect(mockRunner.start).toHaveBeenCalledWith(true);
    });
  });

  describe('stop', () => {
    it('should stop all running services', async () => {
      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        isReady: jest.fn(),
        getConnectionStrings: jest.fn().mockReturnValue({})
      };

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      await orchestrator.start(false);
      await orchestrator.stop();

      expect(mockLogger.info).toHaveBeenCalledWith('Stopping database orchestrator...');
      expect(mockRunner.stop).toHaveBeenCalled();
      
      // Check that service:stopped was published with simplified service object
      expect(mockEventBus.publish).toHaveBeenCalledWith('service:stopped', {
        serviceName: 'postgres',
        service: expect.objectContaining({
          name: 'postgres',
          category: 'database'
        })
      });
    });

    it('should handle errors when stopping services', async () => {
      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockRejectedValue(new Error('Stop failed')),
        isReady: jest.fn(),
        getConnectionStrings: jest.fn().mockReturnValue({})
      };

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      await orchestrator.start(false);
      
      await expect(orchestrator.stop()).rejects.toThrow('Stop failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error stopping database postgres'),
        expect.any(Error)
      );
    });

    it('should skip services that are not running', async () => {
      await orchestrator.stop();

      expect(mockLogger.info).toHaveBeenCalledWith('Stopping database orchestrator...');
      // When no services are running, stop() should complete without errors
    });
  });

  describe('isReady', () => {
    it('should check if service is ready', async () => {
      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isReady: jest.fn().mockResolvedValue(true),
        getConnectionStrings: jest.fn().mockReturnValue({})
      };

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      await orchestrator.start(false);
      const isReady = await orchestrator.isReady('postgres');

      expect(isReady).toBe(true);
      expect(mockRunner.isReady).toHaveBeenCalledWith('postgres');
    });

    it('should return false if service not found', async () => {
      const isReady = await orchestrator.isReady('nonexistent');

      expect(isReady).toBe(false);
    });
  });

  describe('connection strings', () => {
    it('should collect connection strings from ContainerRunner', async () => {
      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isReady: jest.fn(),
        getConnectionStrings: jest.fn().mockReturnValue({
          'postgres': 'postgresql://localhost:5432/testdb'
        })
      };

      // Set prototype to pass instanceof check
      Object.setPrototypeOf(mockRunner, ContainerRunner.prototype);

      (ContainerRunner as jest.Mock).mockImplementation(() => mockRunner);

      const testOrchestrator = new DatabaseOrchestrator(mockConfig, mockLogger, mockEventBus);
      await testOrchestrator.start(false);

      const connectionStrings = testOrchestrator.getConnectionStrings();
      expect(connectionStrings).toHaveProperty('postgres');
      expect(connectionStrings.postgres).toBe('postgresql://localhost:5432/testdb');
      expect(mockRunner.getConnectionStrings).toHaveBeenCalled();
    });

    it('should not collect connection strings from LocalRunner', async () => {
      const localConfig: Integr8Config = {
        databases: [
          {
            name: 'local-db',
            category: 'database',
            type: 'postgres',
            mode: 'local',
            local: {
              command: 'npm run db:start',
              cwd: '.'
            }
          }
        ]
      } as any;

      const localOrchestrator = new DatabaseOrchestrator(localConfig, mockLogger, mockEventBus);

      const mockRunner = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isReady: jest.fn()
      };

      (LocalRunner as jest.Mock).mockImplementation(() => mockRunner);

      await localOrchestrator.start(false);

      const connectionStrings = localOrchestrator.getConnectionStrings();
      expect(connectionStrings).toEqual({});
    });
  });

});

