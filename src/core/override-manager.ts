import { OverrideManager as IOverrideManager, OverrideBuilder } from '../types';

export class OverrideManagerImpl implements IOverrideManager {
  private workerId: string;
  private overrides: Map<string, any> = new Map();
  private controlPort?: number;

  constructor(workerId: string, controlPort?: number) {
    this.workerId = workerId;
    this.controlPort = controlPort;
  }

  module(moduleName: string): OverrideBuilder {
    return new OverrideBuilderImpl(this, 'module', moduleName);
  }

  service(serviceName: string): OverrideBuilder {
    return new OverrideBuilderImpl(this, 'service', serviceName);
  }

  repository(repositoryName: string): OverrideBuilder {
    return new OverrideBuilderImpl(this, 'repository', repositoryName);
  }

  dataSource(dataSourceName: string): OverrideBuilder {
    return new OverrideBuilderImpl(this, 'dataSource', dataSourceName);
  }

  provider(providerName: string): OverrideBuilder {
    return new OverrideBuilderImpl(this, 'provider', providerName);
  }

  async clear(): Promise<void> {
    this.overrides.clear();
    console.log(`Cleared all overrides for worker ${this.workerId}`);
  }

  async applyOverride(type: string, name: string, implementation: any): Promise<void> {
    const key = `${type}:${name}`;
    this.overrides.set(key, implementation);
    
    // Send override to the application via control port
    if (this.controlPort) {
      await this.sendOverrideToApp(type, name, implementation);
    }
    
    console.log(`Applied override: ${key}`);
  }

  private async sendOverrideToApp(type: string, name: string, implementation: any): Promise<void> {
    try {
      const axios = require('axios');
      await axios.post(`http://localhost:${this.controlPort}/__test__/override`, {
        type,
        name,
        implementation: this.serializeImplementation(implementation)
      });
    } catch (error) {
      console.warn(`Failed to send override to app: ${error}`);
    }
  }

  private serializeImplementation(implementation: any): any {
    // Simple serialization - in reality, this would be more sophisticated
    if (typeof implementation === 'function') {
      return {
        type: 'function',
        source: implementation.toString()
      };
    }
    return implementation;
  }
}

class OverrideBuilderImpl implements OverrideBuilder {
  private manager: OverrideManagerImpl;
  private type: string;
  private name: string;

  constructor(manager: OverrideManagerImpl, type: string, name: string) {
    this.manager = manager;
    this.type = type;
    this.name = name;
  }

  async with(implementation: any): Promise<void> {
    await this.manager.applyOverride(this.type, this.name, implementation);
  }

  async withMock(mockFn: (...args: any[]) => any): Promise<void> {
    await this.manager.applyOverride(this.type, this.name, mockFn);
  }

  async withValue(value: any): Promise<void> {
    await this.manager.applyOverride(this.type, this.name, value);
  }
}
