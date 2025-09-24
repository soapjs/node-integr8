import { EnvironmentOrchestrator } from './core/environment-orchestrator';
import { Integr8Config, ScenarioDefinition, IEnvironmentContext, AuthProfile, AuthOverrideConfig } from './types';

// Global state for the scenario runner
let orchestrator: EnvironmentOrchestrator | null = null;
let config: Integr8Config | null = null;

export async function setupEnvironment(integr8Config: Integr8Config): Promise<void> {
  // Check if environment is already running
  if (process.env.INTEGR8_ENVIRONMENT_RUNNING === 'true') {
    config = integr8Config;
    // Don't start a new orchestrator, just set the config
    return;
  }
  
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
  fn: (env: IEnvironmentContext) => Promise<void> | void,
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
    context.ctx.scenarioId = scenario.name;
    
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

// Context provider for Jest/Vitest tests
export function getEnvironmentContext(): IEnvironmentContext {
  if (!orchestrator && !config) {
    throw new Error('Environment not set up. Call setupEnvironment() first.');
  }
  
  // If using existing environment, create a mock context
  if (!orchestrator && config) {
    // Create a mock context that connects to the existing environment
    // We need to create a minimal context without starting a new orchestrator
    const mockContext: IEnvironmentContext = {
      http: {
        request: async (options: any) => {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${options.url}`, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body
          });
          return {
            status: response.status,
            data: await response.json(),
            headers: Object.fromEntries(response.headers.entries()),
            duration: Date.now() - startTime
          };
        },
        get: async (url: string, options?: any) => {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${url}`);
          
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          let data;
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          
          return {
            status: response.status,
            data,
            headers: Object.fromEntries(response.headers.entries()),
            duration: Date.now() - startTime
          };
        },
        post: async (url: string, data?: any, options?: any) => {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          let responseData;
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
          
          return {
            status: response.status,
            data: responseData,
            headers: Object.fromEntries(response.headers.entries()),
            duration: Date.now() - startTime
          };
        },
        put: async (url: string, data?: any, options?: any) => {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${url}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          let responseData;
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
          
          return {
            status: response.status,
            data: responseData,
            headers: Object.fromEntries(response.headers.entries()),
            duration: Date.now() - startTime
          };
        },
        delete: async (url: string, options?: any) => {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${url}`, {
            method: 'DELETE'
          });
          
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          let data;
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          
          return {
            status: response.status,
            data,
            headers: Object.fromEntries(response.headers.entries()),
            duration: Date.now() - startTime
          };
        },
        patch: async (url: string, data?: any, options?: any) => {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${url}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          let responseData;
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
          
          return {
            status: response.status,
            data: responseData,
            headers: Object.fromEntries(response.headers.entries()),
            duration: Date.now() - startTime
          };
        }
      },
      db: {
        snapshot: async (name: string) => {},
        restore: async (name: string) => {},
        query: async (sql: string) => {},
        transaction: async (fn: any) => fn(),
        reset: async () => {},
        getConnectionString: () => 'mock-connection-string'
      },
      ctx: {
        scenarioId: 'mock-scenario',
        workerId: 'mock-worker',
        override: {
          module: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {}
          }),
          service: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {}
          }),
          repository: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {}
          }),
          dataSource: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {}
          }),
          provider: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {}
          }),
          middleware: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {}
          }),
          auth: (name: string) => ({
            withMock: async (mock: any) => {},
            with: async (value: any) => {},
            withValue: async (value: any) => {},
            withUsers: async (...users: any[]) => {},
            withRoles: async (...roles: string[]) => {},
            withPermissions: async (permissions: string[]) => {},
            withMockAuth: async (config: AuthOverrideConfig) => {},
            withProfile: async (profile: AuthProfile | string) => {},
            asAdmin: async () => {},
            asUser: async () => {},
            asGuest: async () => {}
          }),
          clear: async () => {}
        },
        snapshot: {
          create: async (name: string) => {},
          restore: async (name: string) => {},
          list: async () => [],
          delete: async (name: string) => {}
        }
      }
    };
    return mockContext;
  }
  
  return orchestrator!.getContext();
}
