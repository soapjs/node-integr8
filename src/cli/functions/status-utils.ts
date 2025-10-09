/**
 * Utilities for managing environment status
 */

import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Integr8Config } from '../../types';
import { Logger } from '../../utils/logger';
import { StatusServer, ComponentStatus, EnvironmentStatus } from '../../utils/status-server';
import { StatusClient } from '../../utils/status-server';

const ENVIRONMENT_READY_FLAG_FILE = join(process.cwd(), '.integr8-environment-ready');

/**
 * Initializes status server for cross-process communication
 */
export async function initializeStatusServer(config: Integr8Config, logger: Logger): Promise<StatusServer | null> {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, just set environment variables
      process.env.INTEGR8_ENVIRONMENT_READY = 'true';
      process.env.INTEGR8_SHARED_ENVIRONMENT = 'true';
      logger.debug('CI environment detected - using environment variables for readiness flag');
      return null;
    }

    // In local environment, start status server
    const statusServer = new StatusServer(0, logger); // 0 = random available port
    const port = await statusServer.start();
    
    // Save port to file for other processes to find
    writeFileSync(ENVIRONMENT_READY_FLAG_FILE, JSON.stringify({
      port: port,
      timestamp: new Date().toISOString(),
      pid: process.pid
    }), 'utf8');
    
    // Initialize components tracking
    const allComponents = [
      ...config.services || [],
      ...config.databases || [],
      ...config.storages || [],
      ...config.messaging || []
    ];
    
    statusServer.setComponentsTotal(allComponents.length);
    
    // Initialize all components as pending
    for (const component of allComponents) {
      statusServer.updateComponentStatus({
        name: component.name,
        category: component.category,
        status: 'pending'
      });
    }
    
    logger.debug(`Status server started on port ${port} - tracking ${allComponents.length} components`);
    return statusServer;
  } catch (error) {
    logger.error(chalk.red('Failed to initialize status server:'), error);
    return null;
  }
}

/**
 * Cleans up status server and related resources
 */
export async function cleanupStatusServer(statusServer: StatusServer | null, logger: Logger): Promise<void> {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, clear environment variables
      delete process.env.INTEGR8_ENVIRONMENT_READY;
      delete process.env.INTEGR8_SHARED_ENVIRONMENT;
      logger.debug('🧹 CI environment detected - cleared environment variables');
      return;
    }

    // In local environment, stop status server and remove flag file
    if (statusServer) {
      await statusServer.stop();
    }
    
    if (existsSync(ENVIRONMENT_READY_FLAG_FILE)) {
      unlinkSync(ENVIRONMENT_READY_FLAG_FILE);
    }
    
    logger.debug('Status server stopped and flag file removed');
  } catch (error) {
    logger.error(chalk.red('Failed to cleanup status server:'), error);
  }
}

/**
 * Updates component status in the status server
 */
export function updateComponentStatus(statusServer: StatusServer | null, component: ComponentStatus): void {
  if (statusServer) {
    statusServer.updateComponentStatus(component);
  }
}

/**
 * Checks environment status
 */
export async function checkEnvironmentStatus(
  config: Integr8Config,
  logger: Logger
): Promise<{ status: EnvironmentStatus | null; isCI: boolean }> {
  try {
    // Check if we're in CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.INTEGR8_CI_MODE;
    
    if (isCI) {
      // In CI, check for environment variable or assume ready if shared environment is set
      const sharedEnv = process.env.INTEGR8_SHARED_ENVIRONMENT === 'true';
      const envRunning = process.env.INTEGR8_ENVIRONMENT_RUNNING === 'true';
      
      if (sharedEnv || envRunning) {
        logger.debug('CI environment detected - using environment variables for readiness check');
        
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
          logger.debug('Environment ready flag is too old, ignoring');
          return { status: null, isCI: false };
        }
      }
      
      if (flagData.port) {
        const client = new StatusClient(flagData.port, logger);
        const status = await client.getStatus();
        return { status, isCI: false };
      }
    }
    
    return { status: null, isCI: false };
  } catch (error) {
    logger.debug('Failed to check environment status:', error);
    return { status: null, isCI: false };
  }
}

