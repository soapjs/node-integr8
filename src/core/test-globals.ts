import { Integr8Config } from '../types';
import { EnvironmentOrchestrator } from './environment-orchestrator';
import { EnvironmentContext } from './environment-context';
import { Logger } from '../utils/logger';
import { StatusClient, EnvironmentStatus } from '../utils/status-server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Global state for test environment
let orchestrator: EnvironmentOrchestrator | null = null;
let context: EnvironmentContext | null = null;
let config: Integr8Config | null = null;
let logger: Logger | null = null;
let usingExistingEnvironment = false;

// File-based environment ready flag for cross-process communication
const ENVIRONMENT_READY_FLAG_FILE = join(process.cwd(), '.integr8-environment-ready');

/**
 * Loads configuration from file system
 */
async function loadConfigFromFile(): Promise<Integr8Config> {
  const possibleConfigFiles = [
    'integr8.api.config.json',
    'integr8.api.config.js',
    'integr8.config.json',
    'integr8.config.js'
  ];

  for (const configFile of possibleConfigFiles) {
    try {
      const configPath = join(process.cwd(), configFile);
      if (configPath.endsWith('.js')) {
        const config = require(require('path').resolve(configPath));
        return config.default || config;
      } else if (configPath.endsWith('.json')) {
        const content = readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      // Continue to next config file
      continue;
    }
  }

  throw new Error('No integr8 configuration file found. Please run "integr8 init" first.');
}

/**
 * Checks if there's an existing environment running from integr8 up
 */
async function checkExistingEnvironment(config: Integr8Config): Promise<{ status: EnvironmentStatus | null; isCI: boolean }> {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, check for environment variable or assume ready if shared environment is set
      const sharedEnv = process.env.INTEGR8_SHARED_ENVIRONMENT === 'true';
      const envRunning = process.env.INTEGR8_ENVIRONMENT_RUNNING === 'true';
      
      if (sharedEnv || envRunning) {
        // Create mock status for CI
        const allComponents = [
          ...config.services || [],
          ...config.databases || [],
          ...config.storages || [],
          ...config.messaging || []
        ];
        
        const mockStatus: EnvironmentStatus = {
          ready: true,
          components: allComponents.map(c => ({
            name: c.name,
            category: c.category,
            type: c.type,
            status: 'ready' as const,
            timestamp: new Date().toISOString()
          })),
          totalComponents: allComponents.length,
          readyComponents: allComponents.length,
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        };
        
        return { status: mockStatus, isCI: true };
      }
      
      return { status: null, isCI: true };
    }
    
    // In local environment, try to connect to status server
    if (existsSync(ENVIRONMENT_READY_FLAG_FILE)) {
      const flagContent = readFileSync(ENVIRONMENT_READY_FLAG_FILE, 'utf8');
      const flagData = JSON.parse(flagContent);
      
      // Check if flag is recent (within last 24 hours)
      if (flagData.timestamp) {
        const flagTime = new Date(flagData.timestamp).getTime();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - flagTime > maxAge) {
          return { status: null, isCI: false };
        }
      }
      
      if (flagData.port) {
        const client = new StatusClient(flagData.port, logger!);
        const status = await client.getStatus();
        return { status, isCI: false };
      }
    }
    
    return { status: null, isCI: false };
  } catch (error) {
    logger?.debug('Failed to check existing environment status:', error);
    return { status: null, isCI: false };
  }
}

/**
 * Sets up the test environment with all configured services and databases.
 * This function should be called at the beginning of each test suite.
 * 
 * @param testConfig - Optional configuration to override the default config
 */
export async function setupEnvironment(testConfig?: Integr8Config): Promise<void> {
  try {
    // Load configuration if not provided
    if (!testConfig) {
      config = await loadConfigFromFile();
    } else {
      config = testConfig;
    }

    // Initialize logger
    logger = new Logger({ level: 'info', enabled: true });

    // Check if there's an existing environment running
    const { status: existingStatus } = await checkExistingEnvironment(config!);
    
    if (existingStatus && existingStatus.ready) {
      // Use existing environment
      logger.debug('Using existing environment from integr8 up');
      usingExistingEnvironment = true;
      
      // Create a minimal orchestrator that connects to existing environment
      const workerId = process.env.INTEGR8_SHARED_ENVIRONMENT === 'true' ? 'shared' : `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      orchestrator = new EnvironmentOrchestrator(logger, config!, workerId);
      
      // Don't start the environment - just create the context
      // The environment is already running from integr8 up
      context = EnvironmentContext.create(config!, workerId, logger);
      await context.initialize();
      
      logger.debug('Connected to existing environment');
    } else {
      // Create new environment
      logger.debug('Creating new test environment');
      usingExistingEnvironment = false;
      
      // Create orchestrator with unique worker ID for this test
      const workerId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      orchestrator = new EnvironmentOrchestrator(logger, config!, workerId);

      // Start the environment
      await orchestrator.start();

      // Get the context
      context = orchestrator.getContext();
      
      logger.debug('New test environment created and started');
    }

    logger.debug('Test environment setup complete');
  } catch (error) {
    logger?.error('Failed to setup test environment:', error);
    throw new Error(`Environment setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Tears down the test environment and cleans up all resources.
 * This function should be called at the end of each test suite.
 */
export async function teardownEnvironment(): Promise<void> {
  try {
    if (orchestrator && !usingExistingEnvironment) {
      // Only stop the environment if we created it ourselves
      await orchestrator.stop();
      logger?.debug('Stopped test environment');
    } else if (usingExistingEnvironment) {
      logger?.debug('Skipping teardown - using existing environment from integr8 up');
    }
    
    orchestrator = null;
    context = null;
    config = null;
    usingExistingEnvironment = false;
    logger?.debug('Test environment teardown complete');
    logger = null;
  } catch (error) {
    logger?.error('Failed to teardown test environment:', error);
    throw new Error(`Environment teardown failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the current environment context for accessing services, databases, and other resources.
 * This function should be called within test functions to access the test environment.
 * 
 * @returns The current environment context
 * @throws Error if environment is not set up
 */
export function getEnvironmentContext(): EnvironmentContext {
  if (!context) {
    throw new Error('Environment context not available. Make sure to call setupEnvironment() before running tests.');
  }
  return context;
}

/**
 * Gets the current environment orchestrator for advanced operations.
 * This is a lower-level function for advanced use cases.
 * 
 * @returns The current environment orchestrator
 * @throws Error if environment is not set up
 */
export function getEnvironmentOrchestrator(): EnvironmentOrchestrator {
  if (!orchestrator) {
    throw new Error('Environment orchestrator not available. Make sure to call setupEnvironment() before running tests.');
  }
  return orchestrator;
}

/**
 * Gets the current configuration used for the test environment.
 * 
 * @returns The current configuration
 * @throws Error if environment is not set up
 */
export function getEnvironmentConfig(): Integr8Config {
  if (!config) {
    throw new Error('Environment config not available. Make sure to call setupEnvironment() before running tests.');
  }
  return config;
}

/**
 * Checks if the test environment is currently set up and ready.
 * 
 * @returns True if environment is ready, false otherwise
 */
export function isEnvironmentReady(): boolean {
  return context !== null && orchestrator !== null && config !== null;
}

/**
 * Checks if we're using an existing environment from integr8 up.
 * 
 * @returns True if using existing environment, false if we created our own
 */
export function isUsingExistingEnvironment(): boolean {
  return usingExistingEnvironment;
}
