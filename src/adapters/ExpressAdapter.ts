import { Adapter, AdapterConfig } from '../types';
import express, { Express, Request, Response, NextFunction } from 'express';

export class ExpressAdapter implements Adapter {
  public name = 'express';
  private app?: Express;
  private overrides: Map<string, any> = new Map();

  async initialize(config: AdapterConfig): Promise<void> {
    console.log('Initializing Express adapter');
    
    // This would be integrated into the Express app
    // The adapter would add middleware to handle test overrides
  }

  async setupOverrides(overrideManager: any): Promise<void> {
    // Set up the override endpoint
    if (this.app) {
      this.app.use('/__test__', this.createTestMiddleware());
    }
  }

  async teardown(): Promise<void> {
    console.log('Tearing down Express adapter');
    this.overrides.clear();
  }

  private createTestMiddleware() {
    const router = express.Router();
    
    // Override endpoint
    router.post('/override', async (req: Request, res: Response) => {
      try {
        const { type, name, implementation } = req.body;
        
        // Apply the override
        await this.applyOverride(type, name, implementation);
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check endpoint
    router.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        overrides: Array.from(this.overrides.keys())
      });
    });
    
    return router;
  }

  private async applyOverride(type: string, name: string, implementation: any): Promise<void> {
    const key = `${type}:${name}`;
    this.overrides.set(key, implementation);
    
    // This would actually override the dependency in the Express app
    // Implementation would depend on how the app is structured
    console.log(`Applied override: ${key}`);
  }

  // Static method to create middleware that can be added to existing Express apps
  static createTestMiddleware() {
    const adapter = new ExpressAdapter();
    return adapter.createTestMiddleware();
  }
}
