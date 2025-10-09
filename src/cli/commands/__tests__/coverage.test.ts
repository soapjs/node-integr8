import { CoverageCommand } from '../coverage';
import * as testGlobals from '../../../core/test-globals';
import * as functions from '../../functions';

jest.mock('../../../core/test-globals');
jest.mock('../../functions');

describe('CoverageCommand', () => {
  let command: CoverageCommand;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new CoverageCommand();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const mockConfig = {
      testDir: './tests',
      scan: {
        decorators: {
          paths: ['./src']
        }
      },
      coverage: {
        output: 'coverage.json',
        threshold: 80
      }
    };

    const mockEndpoints = [
      { method: 'GET', path: '/users' },
      { method: 'POST', path: '/users' }
    ];

    const mockTestedEndpoints = [
      { method: 'GET', path: '/users', testFile: 'users.test.ts' }
    ];

    const mockReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 2,
        tested: 1,
        untested: 1,
        percentage: 50
      },
      byMethod: {},
      tested: [],
      untested: []
    };

    it('should execute coverage analysis successfully', async () => {
      (testGlobals.loadConfigFromFile as jest.Mock).mockResolvedValue(mockConfig);
      (functions.scanDecorators as jest.Mock).mockResolvedValue(mockEndpoints);
      (functions.scanTestFiles as jest.Mock).mockResolvedValue(mockTestedEndpoints);
      (functions.calculateCoverage as jest.Mock).mockReturnValue(mockReport);
      (functions.printReport as jest.Mock).mockImplementation(() => {});
      (functions.saveReport as jest.Mock).mockImplementation(() => {});

      await command.execute({});

      expect(testGlobals.loadConfigFromFile).toHaveBeenCalled();
      expect(functions.scanDecorators).toHaveBeenCalled();
      expect(functions.scanTestFiles).toHaveBeenCalledWith('./tests');
      expect(functions.calculateCoverage).toHaveBeenCalledWith(mockEndpoints, mockTestedEndpoints);
      expect(functions.printReport).toHaveBeenCalledWith(mockReport);
      expect(functions.saveReport).toHaveBeenCalledWith(mockReport, 'coverage.json');
    });

    it('should use discovery command if decorators not configured', async () => {
      const configWithDiscovery = {
        ...mockConfig,
        scan: {
          discovery: {
            command: 'npm run discover',
            timeout: 5000
          }
        }
      };

      (testGlobals.loadConfigFromFile as jest.Mock).mockResolvedValue(configWithDiscovery);
      (functions.discoverFromCommand as jest.Mock).mockResolvedValue(mockEndpoints);
      (functions.scanTestFiles as jest.Mock).mockResolvedValue(mockTestedEndpoints);
      (functions.calculateCoverage as jest.Mock).mockReturnValue(mockReport);
      (functions.printReport as jest.Mock).mockImplementation(() => {});
      (functions.saveReport as jest.Mock).mockImplementation(() => {});

      await command.execute({});

      expect(functions.discoverFromCommand).toHaveBeenCalledWith(
        'npm run discover',
        5000
      );
    });

    it('should fail if threshold not met', async () => {
      const lowCoverageReport = {
        ...mockReport,
        summary: { ...mockReport.summary, percentage: 40 }
      };

      (testGlobals.loadConfigFromFile as jest.Mock).mockResolvedValue(mockConfig);
      (functions.scanDecorators as jest.Mock).mockResolvedValue(mockEndpoints);
      (functions.scanTestFiles as jest.Mock).mockResolvedValue(mockTestedEndpoints);
      (functions.calculateCoverage as jest.Mock).mockReturnValue(lowCoverageReport);
      (functions.printReport as jest.Mock).mockImplementation(() => {});
      (functions.saveReport as jest.Mock).mockImplementation(() => {});

      await command.execute({ threshold: 80 });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should pass if threshold is met', async () => {
      const highCoverageReport = {
        ...mockReport,
        summary: { ...mockReport.summary, percentage: 85 }
      };

      (testGlobals.loadConfigFromFile as jest.Mock).mockResolvedValue(mockConfig);
      (functions.scanDecorators as jest.Mock).mockResolvedValue(mockEndpoints);
      (functions.scanTestFiles as jest.Mock).mockResolvedValue(mockTestedEndpoints);
      (functions.calculateCoverage as jest.Mock).mockReturnValue(highCoverageReport);
      (functions.printReport as jest.Mock).mockImplementation(() => {});
      (functions.saveReport as jest.Mock).mockImplementation(() => {});

      await command.execute({ threshold: 80 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Coverage 85.0% meets threshold 80%')
      );
    });

    it('should handle errors gracefully', async () => {
      (testGlobals.loadConfigFromFile as jest.Mock).mockRejectedValue(
        new Error('Config not found')
      );

      await command.execute({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Coverage analysis failed'),
        'Config not found'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should use custom output path if provided', async () => {
      (testGlobals.loadConfigFromFile as jest.Mock).mockResolvedValue(mockConfig);
      (functions.scanDecorators as jest.Mock).mockResolvedValue(mockEndpoints);
      (functions.scanTestFiles as jest.Mock).mockResolvedValue(mockTestedEndpoints);
      (functions.calculateCoverage as jest.Mock).mockReturnValue(mockReport);
      (functions.printReport as jest.Mock).mockImplementation(() => {});
      (functions.saveReport as jest.Mock).mockImplementation(() => {});

      await command.execute({ output: 'custom-coverage.json' });

      expect(functions.saveReport).toHaveBeenCalledWith(mockReport, 'custom-coverage.json');
    });

    it('should throw error if no scan configuration found', async () => {
      const configWithoutScan = {
        testDir: './tests'
      };

      (testGlobals.loadConfigFromFile as jest.Mock).mockResolvedValue(configWithoutScan);

      await command.execute({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('No scan configuration found')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});

