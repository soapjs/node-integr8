import { createServer } from 'net';

/**
 * Port management utilities to avoid conflicts
 */
export class PortManager {
  private static usedPorts = new Set<number>();

  /**
   * Get an available port starting from a base port
   */
  static async getAvailablePort(basePort: number = 3000): Promise<number> {
    let port = basePort;
    
    while (this.usedPorts.has(port) || !(await this.isPortAvailable(port))) {
      port++;
    }
    
    this.usedPorts.add(port);
    return port;
  }

  /**
   * Check if a port is available
   */
  private static async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Reserve a port
   */
  static reservePort(port: number): void {
    this.usedPorts.add(port);
  }

  /**
   * Release a port
   */
  static releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  /**
   * Get database port mapping
   */
  static getDatabasePorts(): Record<string, number> {
    return {
      postgres: 5432,
      mysql: 3306,
      mongo: 27017,
      redis: 6379,
      kafka: 9092
    };
  }
}
