import { ITestContext, IOverrideManager, ISnapshotManager } from '../types';
import { OverrideManager } from './override-manager';
import { SnapshotManagerImpl } from './snapshot-manager';

export class TestContext implements ITestContext {
  public override: IOverrideManager;
  public snapshot: ISnapshotManager;
  public workerId: string;
  public scenarioId: string;

  constructor(workerId: string, scenarioId?: string) {
    this.workerId = workerId;
    this.scenarioId = scenarioId || `scenario_${Date.now()}`;
    this.override = new OverrideManager(this.workerId);
    this.snapshot = new SnapshotManagerImpl(this.workerId);
  }

  setScenarioId(scenarioId: string): void {
    this.scenarioId = scenarioId;
  }
}
