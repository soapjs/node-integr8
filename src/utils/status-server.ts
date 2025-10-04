import { createServer, Server } from 'http';
import { Logger } from './logger';

export interface ComponentStatus {
  name: string;
  category: string;
  status: 'pending' | 'starting' | 'ready' | 'failed';
  timestamp?: string;
  details?: string;
}

export interface EnvironmentStatus {
  ready: boolean;
  components: ComponentStatus[];
  totalComponents: number;
  readyComponents: number;
  startTime: string;
  lastUpdate: string;
}

export class StatusServer {
  private server: Server;
  private logger: Logger;
  private port: number;
  private status: EnvironmentStatus;
  private isRunning: boolean = false;

  constructor(port: number = 0, logger: Logger) {
    this.logger = logger;
    this.port = port;
    this.status = {
      ready: false,
      components: [],
      totalComponents: 0,
      readyComponents: 0,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };

    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  private handleRequest(req: any, res: any) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    
    // Enable CORS for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.status, null, 2));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/update') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const update = JSON.parse(body);
          this.updateComponentStatus(update);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '127.0.0.1', () => {
        const actualPort = (this.server.address() as any)?.port;
        this.port = actualPort;
        this.isRunning = true;
        this.logger.debug(`Status server started on port ${actualPort}`);
        resolve(actualPort);
      });

      this.server.on('error', (error) => {
        this.logger.error('Failed to start status server:', error);
        reject(error);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.isRunning = false;
        this.logger.debug('Status server stopped');
        resolve();
      });
    });
  }

  public updateComponentStatus(component: ComponentStatus) {
    const existingIndex = this.status.components.findIndex(c => c.name === component.name);
    
    if (existingIndex >= 0) {
      this.status.components[existingIndex] = component;
    } else {
      this.status.components.push(component);
    }

    this.recalculateStatus();
    this.status.lastUpdate = new Date().toISOString();
    
    this.logger.debug(`Component ${component.name} (${component.category}) status: ${component.status}`);
  }

  public setComponentsTotal(total: number) {
    this.status.totalComponents = total;
    this.status.components = this.status.components.slice(0, total);
    this.recalculateStatus();
    this.status.lastUpdate = new Date().toISOString();
  }

  private recalculateStatus() {
    this.status.readyComponents = this.status.components.filter(c => c.status === 'ready').length;
    this.status.ready = this.status.readyComponents === this.status.totalComponents && this.status.totalComponents > 0;
  }

  public getStatus(): EnvironmentStatus {
    return { ...this.status };
  }

  public getPort(): number {
    return this.port;
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }
}

export class StatusClient {
  private baseUrl: string;
  private logger: Logger;
  private timeout: number;

  constructor(port: number, logger: Logger, timeout: number = 30000) {
    this.baseUrl = `http://127.0.0.1:${port}`;
    this.logger = logger;
    this.timeout = timeout;
  }

  public async getStatus(): Promise<EnvironmentStatus | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/status`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const status = await response.json();
        return status as EnvironmentStatus;
      } else {
        this.logger.debug(`Status server responded with ${response.status}`);
        return null;
      }
    } catch (error) {
      this.logger.debug('Failed to connect to status server:', error);
      return null;
    }
  }

  public async updateStatus(update: Partial<ComponentStatus>) {
    try {
      const response = await fetch(`${this.baseUrl}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      });

      return response.ok;
    } catch (error) {
      this.logger.debug('Failed to update status:', error);
      return false;
    }
  }

  public async waitForReady(maxWaitTime: number = 300000, pollInterval: number = 2000): Promise<EnvironmentStatus | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getStatus();
      
      if (status) {
        this.logger.debug(`Environment status: ${status.readyComponents}/${status.totalComponents} components ready`);
        
        if (status.ready) {
          return status;
        }
      } else {
        this.logger.debug('Status server not responding, environment may not be running');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return null;
  }
}
