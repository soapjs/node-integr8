import {
  calculateCoverage,
  printReport,
  createProgressBar,
  getColorForPercentage,
  saveReport
} from '../coverage-utils';
import { ExtendedRouteInfo } from '../../../types';
import { TestedEndpoint } from '../test-scanner-utils';
import chalk from 'chalk';

// Mock writeFileSync
jest.mock('fs', () => ({
  writeFileSync: jest.fn()
}));

describe('coverage-utils', () => {
  describe('calculateCoverage', () => {
    it('should calculate coverage correctly', () => {
      const allEndpoints: ExtendedRouteInfo[] = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
        { method: 'GET', path: '/posts' }
      ];

      const testedEndpoints: TestedEndpoint[] = [
        { method: 'GET', path: '/users', testFile: 'users.test.ts' },
        { method: 'POST', path: '/users', testFile: 'users.test.ts' }
      ];

      const result = calculateCoverage(allEndpoints, testedEndpoints);

      expect(result.summary.total).toBe(3);
      expect(result.summary.tested).toBe(2);
      expect(result.summary.untested).toBe(1);
      expect(result.summary.percentage).toBeCloseTo(66.67, 1);
    });

    it('should handle empty endpoints', () => {
      const result = calculateCoverage([], []);

      expect(result.summary.total).toBe(0);
      expect(result.summary.tested).toBe(0);
      expect(result.summary.percentage).toBe(0);
    });

    it('should group by HTTP method', () => {
      const allEndpoints: ExtendedRouteInfo[] = [
        { method: 'GET', path: '/users' },
        { method: 'GET', path: '/posts' },
        { method: 'POST', path: '/users' }
      ];

      const testedEndpoints: TestedEndpoint[] = [
        { method: 'GET', path: '/users', testFile: 'test.ts' }
      ];

      const result = calculateCoverage(allEndpoints, testedEndpoints);

      expect(result.byMethod.GET.total).toBe(2);
      expect(result.byMethod.GET.tested).toBe(1);
      expect(result.byMethod.GET.percentage).toBe(50);
      expect(result.byMethod.POST.total).toBe(1);
      expect(result.byMethod.POST.tested).toBe(0);
      expect(result.byMethod.POST.percentage).toBe(0);
    });

    it('should normalize paths for comparison', () => {
      const allEndpoints: ExtendedRouteInfo[] = [
        { method: 'GET', path: '/users/:id' }
      ];

      const testedEndpoints: TestedEndpoint[] = [
        { method: 'GET', path: '/users/123', testFile: 'test.ts' }
      ];

      const result = calculateCoverage(allEndpoints, testedEndpoints);

      expect(result.summary.tested).toBe(1);
      expect(result.summary.percentage).toBe(100);
    });

    it('should include source file in untested endpoints', () => {
      const allEndpoints: any[] = [
        { method: 'GET', path: '/users', sourceFile: 'users.controller.ts' }
      ];

      const testedEndpoints: TestedEndpoint[] = [];

      const result = calculateCoverage(allEndpoints, testedEndpoints);

      expect(result.untested[0].source).toBe('users.controller.ts');
    });

    it('should include test file in tested endpoints', () => {
      const allEndpoints: ExtendedRouteInfo[] = [
        { method: 'GET', path: '/users' }
      ];

      const testedEndpoints: TestedEndpoint[] = [
        { method: 'GET', path: '/users', testFile: 'users.test.ts' }
      ];

      const result = calculateCoverage(allEndpoints, testedEndpoints);

      expect(result.tested[0].testFile).toBe('users.test.ts');
    });
  });

  describe('createProgressBar', () => {
    it('should create progress bar for 0%', () => {
      const result = createProgressBar(0, 10);
      expect(result).toContain('░'.repeat(10));
    });

    it('should create progress bar for 50%', () => {
      const result = createProgressBar(50, 10);
      expect(result).toContain('█'.repeat(5));
      expect(result).toContain('░'.repeat(5));
    });

    it('should create progress bar for 100%', () => {
      const result = createProgressBar(100, 10);
      expect(result).toContain('█'.repeat(10));
    });

    it('should use default width of 20', () => {
      const result = createProgressBar(50);
      expect(result).toContain('█'.repeat(10));
      expect(result).toContain('░'.repeat(10));
    });
  });

  describe('getColorForPercentage', () => {
    it('should return green for >= 80%', () => {
      expect(getColorForPercentage(80)).toBe(chalk.green);
      expect(getColorForPercentage(100)).toBe(chalk.green);
    });

    it('should return yellow for 60-79%', () => {
      expect(getColorForPercentage(60)).toBe(chalk.yellow);
      expect(getColorForPercentage(79)).toBe(chalk.yellow);
    });

    it('should return red for < 60%', () => {
      expect(getColorForPercentage(0)).toBe(chalk.red);
      expect(getColorForPercentage(59)).toBe(chalk.red);
    });
  });

  describe('printReport', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should print summary', () => {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total: 10,
          tested: 8,
          untested: 2,
          percentage: 80
        },
        byMethod: {},
        tested: [],
        untested: []
      };

      printReport(report);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Summary:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total Endpoints:'));
    });

    it('should print by method stats', () => {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total: 2,
          tested: 1,
          untested: 1,
          percentage: 50
        },
        byMethod: {
          GET: { total: 2, tested: 1, percentage: 50 }
        },
        tested: [],
        untested: []
      };

      printReport(report);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('By HTTP Method:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('GET'));
    });

    it('should print untested endpoints with limit', () => {
      const untested = Array.from({ length: 25 }, (_, i) => ({
        method: 'GET',
        path: `/endpoint${i}`
      }));

      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total: 25,
          tested: 0,
          untested: 25,
          percentage: 0
        },
        byMethod: {},
        tested: [],
        untested
      };

      printReport(report);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Untested Endpoints (25)'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('and 5 more'));
    });
  });

  describe('saveReport', () => {
    it('should save report to file', () => {
      const { writeFileSync } = require('fs');
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total: 10,
          tested: 8,
          untested: 2,
          percentage: 80
        },
        byMethod: {},
        tested: [],
        untested: []
      };

      saveReport(report, 'coverage.json');

      expect(writeFileSync).toHaveBeenCalledWith(
        'coverage.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should handle errors gracefully', () => {
      const { writeFileSync } = require('fs');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      writeFileSync.mockImplementationOnce(() => {
        throw new Error('Write error');
      });

      const report = {
        timestamp: new Date().toISOString(),
        summary: { total: 0, tested: 0, untested: 0, percentage: 0 },
        byMethod: {},
        tested: [],
        untested: []
      };

      saveReport(report, 'coverage.json');

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });
});

