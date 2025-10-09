import { TestContext } from '../test-context';
import { OverrideManager } from '../override-manager';
import { SnapshotManagerImpl } from '../snapshot-manager';

jest.mock('../override-manager');
jest.mock('../snapshot-manager');

describe('TestContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with workerId and auto-generated scenarioId', () => {
      const context = new TestContext('worker-1');

      expect(context.workerId).toBe('worker-1');
      expect(context.scenarioId).toMatch(/^scenario_\d+$/);
      expect(OverrideManager).toHaveBeenCalledWith('worker-1');
      expect(SnapshotManagerImpl).toHaveBeenCalledWith('worker-1');
    });

    it('should initialize with custom scenarioId', () => {
      const context = new TestContext('worker-1', 'custom-scenario');

      expect(context.workerId).toBe('worker-1');
      expect(context.scenarioId).toBe('custom-scenario');
    });

    it('should create override manager instance', () => {
      const context = new TestContext('worker-1');

      expect(context.override).toBeDefined();
      expect(OverrideManager).toHaveBeenCalled();
    });

    it('should create snapshot manager instance', () => {
      const context = new TestContext('worker-1');

      expect(context.snapshot).toBeDefined();
      expect(SnapshotManagerImpl).toHaveBeenCalled();
    });
  });

  describe('setScenarioId', () => {
    it('should update scenarioId', () => {
      const context = new TestContext('worker-1');
      const originalId = context.scenarioId;

      context.setScenarioId('new-scenario-id');

      expect(context.scenarioId).toBe('new-scenario-id');
      expect(context.scenarioId).not.toBe(originalId);
    });

    it('should allow setting scenarioId multiple times', () => {
      const context = new TestContext('worker-1');

      context.setScenarioId('first-id');
      expect(context.scenarioId).toBe('first-id');

      context.setScenarioId('second-id');
      expect(context.scenarioId).toBe('second-id');
    });
  });

  describe('workerId', () => {
    it('should be immutable after construction', () => {
      const context = new TestContext('worker-1');

      expect(context.workerId).toBe('worker-1');
      
      // workerId should remain the same
      context.setScenarioId('new-scenario');
      expect(context.workerId).toBe('worker-1');
    });
  });
});

