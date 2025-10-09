import { Logger, LogLevel } from '../logger';

describe('Logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logging levels', () => {
    it('should log debug messages when level is debug', () => {
      const logger = new Logger({ level: 'debug', enabled: true });
      
      logger.debug('Debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should not log debug when level is info', () => {
      const logger = new Logger({ level: 'info', enabled: true });
      
      logger.debug('Debug message');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      const logger = new Logger({ level: 'info', enabled: true });
      
      logger.info('Info message');
      
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should log warn messages when level is warn or higher', () => {
      const logger = new Logger({ level: 'warn', enabled: true });
      
      logger.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error messages at any level', () => {
      const logger = new Logger({ level: 'error', enabled: true });
      
      logger.error('Error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should not log when level hierarchy prevents it', () => {
      const logger = new Logger({ level: 'error', enabled: true });
      
      logger.info('Info message');
      logger.debug('Debug message');
      logger.warn('Warn message');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('enabled flag', () => {
    it('should not log when disabled', () => {
      const logger = new Logger({ level: 'debug', enabled: false });
      
      logger.debug('Debug');
      logger.info('Info');
      logger.log('Log');
      logger.warn('Warn');
      logger.error('Error');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('service name', () => {
    it('should include service name in log message', () => {
      const logger = new Logger({ level: 'log', enabled: true }, 'TestService');
      
      logger.log('Test message');
      
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[TestService]');
    });

    it('should work without service name', () => {
      const logger = new Logger({ level: 'log', enabled: true });
      
      logger.log('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('should include timestamp in message', () => {
      const logger = new Logger({ level: 'log', enabled: true });
      
      logger.log('Test');
      
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include log level in message', () => {
      const logger = new Logger({ level: 'log', enabled: true });
      
      logger.log('Test');
      
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[LOG]');
    });

    it('should handle additional arguments', () => {
      const logger = new Logger({ level: 'log', enabled: true });
      
      logger.log('Test', 'arg1', 'arg2');
      
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('Test');
    });
  });

  describe('default log level', () => {
    it('should default to "log" level when not specified', () => {
      const logger = new Logger({ enabled: true });
      
      logger.log('Log message');
      logger.debug('Debug message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('all log levels', () => {
    it('should support all log levels', () => {
      const levels: LogLevel[] = ['debug', 'info', 'log', 'warn', 'error'];
      
      levels.forEach(level => {
        const logger = new Logger({ level, enabled: true });
        expect(logger).toBeDefined();
      });
    });
  });

  describe('log method', () => {
    it('should log using console.log', () => {
      const logger = new Logger({ level: 'log', enabled: true });
      
      logger.log('Standard log');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});

