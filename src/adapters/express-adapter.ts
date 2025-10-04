import { Adapter, AdapterConfig } from '../types';
import { createServiceLogger } from '../utils/logger';

export class ExpressAdapter implements Adapter {
  public name = 'express';
  private app?: any;
  private overrides: Map<string, any> = new Map();
  private logger: any;

  async initialize(config: AdapterConfig): Promise<void> {
    // Create logger for this adapter
    const serviceConfig = { category: 'service' as const, name: 'express-adapter', type: 'service' as const, logging: config.config?.logging || 'log' };
    this.logger = createServiceLogger(serviceConfig, 'express-adapter');
    
    this.logger.info('Initializing Express adapter');
    
    // This would be integrated into the Express app
    // The adapter would add middleware to handle test overrides
  }

  async applyOverride(type: string, name: string, implementation: any): Promise<void> {
    const key = `${type}:${name}`;
    this.overrides.set(key, implementation);
    
    // Apply the override to the Express app
    if (this.app) {
      await this.applyOverrideToExpress(type, name, implementation);
    }
    
    this.logger.debug(`Express adapter applied override: ${key}`);
  }

  async teardown(): Promise<void> {
    this.logger.info('Tearing down Express adapter');
    this.overrides.clear();
  }

  private createTestMiddleware() {
    const router = {
      post: (path: string, handler: (req: any, res: any) => void) => {},
      get: (path: string, handler: (req: any, res: any) => void) => {}
    };
    
    // Override endpoint
    router.post('/override', async (req: any, res: any) => {
      try {
        const { type, name, implementation } = req.body;
        
        // Apply the override
        await this.applyOverride(type, name, implementation);
        
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check endpoint
    router.get('/health', (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        overrides: Array.from(this.overrides.keys())
      });
    });
    
    return router;
  }

  private async applyOverrideToExpress(type: string, name: string, implementation: any): Promise<void> {
    // Apply the override to the Express app based on type
    switch (type) {
      case 'middleware':
        await this.overrideMiddleware(name, implementation);
        break;
      case 'service':
        await this.overrideService(name, implementation);
        break;
      case 'provider':
        await this.overrideProvider(name, implementation);
        break;
      default:
        this.logger.warn(`Express adapter: Unknown override type '${type}'`);
    }
  }

  private async overrideMiddleware(name: string, implementation: any): Promise<void> {
    if (this.app) {
      // Replace middleware in Express app
      // This would need to be implemented based on how the app is structured
      this.logger.debug(`Express adapter: Overriding middleware '${name}'`);
    }
  }

  private async overrideService(name: string, implementation: any): Promise<void> {
    // Override service in Express app
    this.logger.debug(`Express adapter: Overriding service '${name}'`);
  }

  private async overrideProvider(name: string, implementation: any): Promise<void> {
    // Override provider in Express app
    this.logger.debug(`Express adapter: Overriding provider '${name}'`);
  }

  // Static method to create middleware that can be added to existing Express apps
  static createTestMiddleware() {
    const adapter = new ExpressAdapter();
    return adapter.createTestMiddleware();
  }
}
