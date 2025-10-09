import { EventBusManager } from '../event-bus-manager';
import { Integr8Config } from '../../types';
import { Logger } from '../../utils/logger';

describe('EventBusManager', () => {
  let eventBus: EventBusManager;
  let mockConfig: Integr8Config;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockConfig = {
      services: [],
      testDir: './tests'
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    eventBus = new EventBusManager(mockConfig, 'worker-1', mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish event to topic', async () => {
      await eventBus.publish('test-topic', { message: 'hello' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Publishing to topic test-topic_worker-1')
      );
    });

    it('should notify local subscribers', async () => {
      const handler = jest.fn();
      
      await eventBus.subscribe('test-topic', handler);
      await eventBus.publish('test-topic', { message: 'hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should notify multiple subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      await eventBus.subscribe('test-topic', handler1);
      await eventBus.subscribe('test-topic', handler2);
      await eventBus.publish('test-topic', { message: 'hello' });

      expect(handler1).toHaveBeenCalledWith({ message: 'hello' });
      expect(handler2).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should handle errors in event handlers', async () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();
      
      await eventBus.subscribe('test-topic', errorHandler);
      await eventBus.subscribe('test-topic', successHandler);
      await eventBus.publish('test-topic', { message: 'hello' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler'),
        expect.any(Error)
      );
      expect(successHandler).toHaveBeenCalled();
    });

    it('should work when no subscribers exist', async () => {
      await expect(
        eventBus.publish('non-existent-topic', { message: 'hello' })
      ).resolves.not.toThrow();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to topic', async () => {
      const handler = jest.fn();
      
      await eventBus.subscribe('test-topic', handler);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Subscribed to topic test-topic_worker-1')
      );
    });

    it('should create subscriber set for new topic', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      await eventBus.subscribe('new-topic', handler1);
      await eventBus.subscribe('new-topic', handler2);
      
      await eventBus.publish('new-topic', { data: 'test' });

      expect(handler1).toHaveBeenCalledWith({ data: 'test' });
      expect(handler2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should allow same handler to subscribe to multiple topics', async () => {
      const handler = jest.fn();
      
      await eventBus.subscribe('topic-1', handler);
      await eventBus.subscribe('topic-2', handler);
      
      await eventBus.publish('topic-1', { source: '1' });
      await eventBus.publish('topic-2', { source: '2' });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({ source: '1' });
      expect(handler).toHaveBeenCalledWith({ source: '2' });
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from topic', async () => {
      const handler = jest.fn();
      
      await eventBus.subscribe('test-topic', handler);
      await eventBus.unsubscribe('test-topic', handler);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Unsubscribed from topic test-topic_worker-1')
      );
    });

    it('should stop receiving events after unsubscribe', async () => {
      const handler = jest.fn();
      
      await eventBus.subscribe('test-topic', handler);
      await eventBus.publish('test-topic', { message: '1' });
      
      await eventBus.unsubscribe('test-topic', handler);
      await eventBus.publish('test-topic', { message: '2' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: '1' });
    });

    it('should not affect other subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      await eventBus.subscribe('test-topic', handler1);
      await eventBus.subscribe('test-topic', handler2);
      
      await eventBus.unsubscribe('test-topic', handler1);
      await eventBus.publish('test-topic', { message: 'hello' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should remove topic when last subscriber unsubscribes', async () => {
      const handler = jest.fn();
      
      await eventBus.subscribe('test-topic', handler);
      await eventBus.unsubscribe('test-topic', handler);
      
      // Topic should be removed, so publishing won't call handler
      await eventBus.publish('test-topic', { message: 'hello' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe from non-existent topic', async () => {
      const handler = jest.fn();
      
      await expect(
        eventBus.unsubscribe('non-existent', handler)
      ).resolves.not.toThrow();
    });
  });

  describe('worker-specific topics', () => {
    it('should create worker-specific topic names', async () => {
      await eventBus.subscribe('my-topic', jest.fn());

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('my-topic_worker-1')
      );
    });

    it('should isolate events between workers', async () => {
      const eventBus1 = new EventBusManager(mockConfig, 'worker-1', mockLogger);
      const eventBus2 = new EventBusManager(mockConfig, 'worker-2', mockLogger);
      
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      await eventBus1.subscribe('topic', handler1);
      await eventBus2.subscribe('topic', handler2);
      
      // Each event bus has its own subscribers
      await eventBus1.publish('topic', { worker: '1' });
      
      expect(handler1).toHaveBeenCalledWith({ worker: '1' });
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});

