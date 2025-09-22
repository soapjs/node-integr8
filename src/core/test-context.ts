import { ITestContext, OverrideManager, SnapshotManager } from '../types';
import { OverrideManagerImpl } from './override-manager';
import { SnapshotManagerImpl } from './snapshot-manager';

export class TestContext implements ITestContext {
  public override: OverrideManager;
  public snapshot: SnapshotManager;
  public workerId: string;
  public scenarioId: string;

  constructor(workerId: string, scenarioId?: string) {
    this.workerId = workerId;
    this.scenarioId = scenarioId || `scenario_${Date.now()}`;
    this.override = new OverrideManagerImpl(this.workerId);
    this.snapshot = new SnapshotManagerImpl(this.workerId);
  }

  setScenarioId(scenarioId: string): void {
    this.scenarioId = scenarioId;
  }
}
