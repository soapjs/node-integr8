import { 
  createConfig, 
  createPostgresService, 
  createAppConfig,
  createTimeoutConfig,
  createFastTimeoutConfig,
  createCITimeoutConfig,
  createE2ETimeoutConfig,
  createNestAdapter
} from '@soapjs/integr8';
import { jestConfigGenerator } from '../src/utils/jest-config-generator';

/**
 * JEST CONFIG GENERATION EXAMPLES
 * 
 * This file demonstrates how Jest configuration is generated from Integr8Config
 * using Handlebars templates instead of hardcoded values.
 */

// ============================================================================
// 1. BASIC CONFIGURATION WITH DEFAULTS
// ============================================================================

export const basicConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  // Uses default timeouts: testTimeout: 30000, setupTimeout: 10000, teardownTimeout: 5000
});

// Generated Jest config will use:
// - testTimeout: 30000
// - setupTimeout: 10000
// - teardownTimeout: 5000

// ============================================================================
// 2. CUSTOM TIMEOUT CONFIGURATION
// ============================================================================

export const customTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  testTimeout: 60000,      // 60 seconds for tests
  setupTimeout: 20000,     // 20 seconds for setup
  teardownTimeout: 10000   // 10 seconds for teardown
});

// Generated Jest config will use:
// - testTimeout: 60000
// - setupTimeout: 20000
// - teardownTimeout: 10000

// ============================================================================
// 3. USING TIMEOUT PRESETS
// ============================================================================

export const fastConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:dev', port: 3000 }),
  ...createFastTimeoutConfig() // 15s test, 5s setup, 2s teardown
});

export const ciConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createCITimeoutConfig() // 45s test, 15s setup, 7s teardown
});

export const e2eConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createE2ETimeoutConfig() // 120s test, 20s setup, 10s teardown
});

// ============================================================================
// 4. COMPLEX CONFIGURATION WITH ALL OPTIONS
// ============================================================================

export const complexConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      },
      dbStrategy: 'schema',
      parallelIsolation: 'schema',
      seed: {
        command: 'npm run seed',
        strategy: 'per-file',
        restoreStrategy: 'rollback',
        timeout: 30000
      }
    })
  ],
  app: createAppConfig({
    image: 'my-app:latest',
    port: 3000,
    environment: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://testuser:testpass@postgres:5432/testdb'
    }
  }),
  testType: 'integration',
  testFramework: 'jest',
  urlPrefix: '/api/v1',
  testTimeout: 45000,
  setupTimeout: 15000,
  teardownTimeout: 8000,
  testMode: {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true
  },
  adapters: [
    createNestAdapter({
      typeorm: true,
      testModule: true
    })
  ]
});

// ============================================================================
// 5. DEMONSTRATION OF JEST CONFIG GENERATION
// ============================================================================

export function demonstrateJestConfigGeneration() {
  console.log('🔧 Demonstrating Jest Config Generation\n');

  // Example 1: Basic config
  console.log('1. Basic Configuration:');
  const basicJestConfig = jestConfigGenerator.generateJestConfig(basicConfig, './tests');
  console.log(basicJestConfig);
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 2: Custom timeouts
  console.log('2. Custom Timeout Configuration:');
  const customJestConfig = jestConfigGenerator.generateJestConfig(customTimeoutConfig, './tests');
  console.log(customJestConfig);
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 3: Complex configuration
  console.log('3. Complex Configuration:');
  const complexJestConfig = jestConfigGenerator.generateJestConfig(complexConfig, './tests');
  console.log(complexJestConfig);
  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================================================
// 6. COMPARISON: OLD vs NEW APPROACH
// ============================================================================

export const comparisonExample = {
  // OLD APPROACH (hardcoded)
  oldApproach: `
// Hardcoded Jest config in run.ts
const jestConfig = \`module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['\${testDir}'],
  testMatch: ['**/*.integration.test.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 60000,  // Hardcoded!
  verbose: true,
  cache: false,
  passWithNoTests: true,
  collectCoverage: false
};\`;
  `,

  // NEW APPROACH (template-based)
  newApproach: `
// Template-based Jest config generation
const jestConfig = jestConfigGenerator.generateJestConfig(config, testDir);

// Template (jest.config.hbs):
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['{{testDir}}'],
  testMatch: ['**/*.integration.test.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: {{testTimeout}},        // From config!
  setupTimeout: {{setupTimeout}},      // From config!
  teardownTimeout: {{teardownTimeout}}, // From config!
  verbose: true,
  cache: false,
  passWithNoTests: true,
  collectCoverage: false
};
  `
};

// ============================================================================
// 7. BENEFITS OF TEMPLATE-BASED APPROACH
// ============================================================================

export const benefits = {
  flexibility: 'Easy to modify Jest configuration without changing code',
  maintainability: 'Template is separate from logic, easier to maintain',
  configurability: 'All values come from Integr8Config, no hardcoding',
  extensibility: 'Easy to add new Jest options via template',
  consistency: 'Same configuration approach across all generated files',
  debugging: 'Generated config can be inspected and debugged'
};

// ============================================================================
// 8. USAGE EXAMPLES
// ============================================================================

// Example 1: Generate config for development
export function generateDevConfig() {
  const devConfig = createConfig({
    services: [createPostgresService('postgres')],
    app: createAppConfig({ image: 'my-app:dev', port: 3000 }),
    ...createFastTimeoutConfig()
  });
  
  return jestConfigGenerator.generateJestConfig(devConfig, './tests');
}

// Example 2: Generate config for CI
export function generateCIConfig() {
  const ciConfig = createConfig({
    services: [createPostgresService('postgres')],
    app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
    ...createCITimeoutConfig()
  });
  
  return jestConfigGenerator.generateJestConfig(ciConfig, './tests');
}

// Example 3: Generate config for E2E
export function generateE2EConfig() {
  const e2eConfig = createConfig({
    services: [createPostgresService('postgres')],
    app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
    ...createE2ETimeoutConfig()
  });
  
  return jestConfigGenerator.generateJestConfig(e2eConfig, './tests');
}

// USAGE EXAMPLES:
//
// Generate Jest config for development:
// const devJestConfig = generateDevConfig();
//
// Generate Jest config for CI:
// const ciJestConfig = generateCIConfig();
//
// Generate Jest config for E2E:
// const e2eJestConfig = generateE2EConfig();
//
// Demonstrate all examples:
// demonstrateJestConfigGeneration();
