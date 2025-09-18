import { EnvironmentOrchestrator } from './core/EnvironmentOrchestrator';
import { Integr8Config, ScenarioDefinition, EnvironmentContext } from './types';

// Global state for the scenario runner
let orchestrator: EnvironmentOrchestrator | null = null;
let config: Integr8Config | null = null;

export async function setupEnvironment(integr8Config: Integr8Config): Promise<void> {
  config = integr8Config;
  orchestrator = new EnvironmentOrchestrator(config);
  await orchestrator.start();
}

export async function teardownEnvironment(): Promise<void> {
  if (orchestrator) {
    await orchestrator.stop();
    orchestrator = null;
  }
  config = null;
}

export function defineScenario(
  name: string, 
  fn: (env: EnvironmentContext) => Promise<void> | void,
  options?: { timeout?: number; retries?: number }
): ScenarioDefinition {
  return {
    name,
    fn,
    timeout: options?.timeout || 30000,
    retries: options?.retries || 0
  };
}

export async function runScenario(scenario: ScenarioDefinition): Promise<void> {
  if (!orchestrator) {
    throw new Error('Environment not set up. Call setupEnvironment() first.');
  }

  const context = orchestrator.getContext();
  
  try {
    console.log(`Running scenario: ${scenario.name}`);
    
    // Set up scenario-specific context
    context.ctx.setScenarioId(scenario.name);
    
    // Run the scenario function
    await scenario.fn(context);
    
    console.log(`✅ Scenario completed: ${scenario.name}`);
  } catch (error) {
    console.error(`❌ Scenario failed: ${scenario.name}`, error);
    throw error;
  }
}

// Jest/Vitest integration helpers
export function createJestSetup(integr8Config: Integr8Config) {
  return {
    async globalSetup() {
      await setupEnvironment(integr8Config);
    },
    async globalTeardown() {
      await teardownEnvironment();
    }
  };
}

export function createVitestSetup(integr8Config: Integr8Config) {
  return {
    async setupFiles() {
      await setupEnvironment(integr8Config);
    },
    async teardownFiles() {
      await teardownEnvironment();
    }
  };
}
