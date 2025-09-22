
import { defineScenario,setupEnvironment,teardownEnvironment,getEnvironmentContext } from '@soapjs/integr8';

// Global setup
beforeAll(async () => {
  const configModule = require('../integr8.api.config.ts');
  const config = configModule.default || configModule;
  
  await setupEnvironment(config);
});

// Global teardown
afterAll(async () => {
  await teardownEnvironment();
});

describe('GET /health Integration Tests', () => {
  test('should handle GET /health', async () => {
    const ctx = getEnvironmentContext();
    const response = await ctx.http.get('/health');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
  });

});
