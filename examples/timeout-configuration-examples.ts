import { 
  createConfig, 
  createPostgresService, 
  createAppConfig,
  createTimeoutConfig,
  createFastTimeoutConfig,
  createSlowTimeoutConfig,
  createCITimeoutConfig,
  createE2ETimeoutConfig
} from '@soapjs/integr8';

/**
 * TIMEOUT CONFIGURATION EXAMPLES
 * 
 * This file demonstrates how to configure timeouts for different scenarios.
 * Timeouts help prevent tests from hanging and provide better control over execution.
 */

// ============================================================================
// 1. BASIC TIMEOUT CONFIGURATION
// ============================================================================

// Default timeouts (recommended for most cases)
export const defaultTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  // Uses default timeouts: testTimeout: 30000, setupTimeout: 10000, teardownTimeout: 5000
});

// Custom timeouts
export const customTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  testTimeout: 45000,      // 45 seconds for individual tests
  setupTimeout: 15000,     // 15 seconds for setup
  teardownTimeout: 8000    // 8 seconds for teardown
});

// Using timeout helper
export const helperTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createTimeoutConfig(60000, 20000, 10000) // 60s test, 20s setup, 10s teardown
});

// ============================================================================
// 2. PRESET TIMEOUT CONFIGURATIONS
// ============================================================================

// Fast execution (for development)
export const fastTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createFastTimeoutConfig() // 15s test, 5s setup, 2s teardown
});

// Slow execution (for complex scenarios)
export const slowTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createSlowTimeoutConfig() // 60s test, 30s setup, 10s teardown
});

// CI/CD optimized
export const ciTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createCITimeoutConfig() // 45s test, 15s setup, 7s teardown
});

// E2E tests (need more time)
export const e2eTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createE2ETimeoutConfig() // 120s test, 20s setup, 10s teardown
});

// ============================================================================
// 3. SCENARIO-SPECIFIC CONFIGURATIONS
// ============================================================================

// Development (fast feedback)
export const developmentTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:dev', port: 3000 }),
  dbStrategy: 'savepoint',
  seed: createOnceSeedConfig('npm run seed'),
  ...createFastTimeoutConfig(),
  // Fast timeouts for quick development feedback
});

// Integration tests (balanced)
export const integrationTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'schema',
  seed: createPerFileSeedConfig('npm run seed'),
  ...createCITimeoutConfig(),
  // Balanced timeouts for integration tests
});

// E2E tests (generous timeouts)
export const e2eTestsTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'database',
  seed: createPerTestSeedConfig('npm run seed'),
  ...createE2ETimeoutConfig(),
  // Generous timeouts for E2E tests
});

// Performance tests (very generous)
export const performanceTimeoutConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'database',
  seed: createPerTestSeedConfig('npm run seed'),
  testTimeout: 300000,     // 5 minutes for performance tests
  setupTimeout: 60000,     // 1 minute for setup
  teardownTimeout: 30000,  // 30 seconds for teardown
});

// ============================================================================
// 4. ENVIRONMENT-SPECIFIC CONFIGURATIONS
// ============================================================================

// Local development
export const localDevConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:dev', port: 3000 }),
  ...createFastTimeoutConfig(),
  // Fast timeouts for local development
});

// CI/CD pipeline
export const cicdPipelineConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createCITimeoutConfig(),
  // Balanced timeouts for CI/CD
});

// Staging environment
export const stagingConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:staging', port: 3000 }),
  ...createSlowTimeoutConfig(),
  // Slower timeouts for staging (more realistic)
});

// Production-like testing
export const productionLikeConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:prod', port: 3000 }),
  testTimeout: 180000,     // 3 minutes (production-like delays)
  setupTimeout: 45000,     // 45 seconds
  teardownTimeout: 20000,  // 20 seconds
});

// ============================================================================
// 5. TIMEOUT BEST PRACTICES
// ============================================================================

export const timeoutBestPractices = {
  // Development
  development: {
    testTimeout: 15000,    // Fast feedback
    setupTimeout: 5000,    // Quick setup
    teardownTimeout: 2000  // Quick cleanup
  },
  
  // Unit tests
  unitTests: {
    testTimeout: 10000,    // Very fast
    setupTimeout: 3000,    // Quick setup
    teardownTimeout: 1000  // Quick cleanup
  },
  
  // Integration tests
  integrationTests: {
    testTimeout: 45000,    // Moderate
    setupTimeout: 15000,   // Database setup
    teardownTimeout: 7000  // Database cleanup
  },
  
  // E2E tests
  e2eTests: {
    testTimeout: 120000,   // Generous
    setupTimeout: 20000,   // Full app startup
    teardownTimeout: 10000 // Full app teardown
  },
  
  // CI/CD
  cicd: {
    testTimeout: 60000,    // Balanced
    setupTimeout: 20000,   // Container startup
    teardownTimeout: 10000 // Container cleanup
  }
};

// ============================================================================
// 6. TIMEOUT TROUBLESHOOTING
// ============================================================================

export const timeoutTroubleshooting = {
  // Common issues and solutions
  issues: {
    'Tests timing out': {
      cause: 'testTimeout too low',
      solution: 'Increase testTimeout or optimize test performance'
    },
    'Setup timing out': {
      cause: 'setupTimeout too low',
      solution: 'Increase setupTimeout or optimize setup process'
    },
    'Teardown timing out': {
      cause: 'teardownTimeout too low',
      solution: 'Increase teardownTimeout or optimize cleanup process'
    }
  },
  
  // Recommended timeouts by test type
  recommendations: {
    'Unit tests': '10s test, 3s setup, 1s teardown',
    'Integration tests': '45s test, 15s setup, 7s teardown',
    'E2E tests': '120s test, 20s setup, 10s teardown',
    'Performance tests': '300s test, 60s setup, 30s teardown'
  }
};

// ============================================================================
// 7. USAGE EXAMPLES
// ============================================================================

// Example 1: Quick development setup
export const quickDevConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:dev', port: 3000 }),
  ...createFastTimeoutConfig()
});

// Example 2: CI/CD pipeline
export const cicdConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createCITimeoutConfig()
});

// Example 3: E2E testing
export const e2eConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  ...createE2ETimeoutConfig()
});

// Example 4: Custom timeouts
export const customConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  testTimeout: 90000,     // 90 seconds
  setupTimeout: 25000,    // 25 seconds
  teardownTimeout: 12000  // 12 seconds
});

// USAGE EXAMPLES:
//
// For development (fast feedback):
// export default quickDevConfig;
//
// For CI/CD (balanced):
// export default cicdConfig;
//
// For E2E tests (generous timeouts):
// export default e2eConfig;
//
// For custom requirements:
// export default customConfig;
