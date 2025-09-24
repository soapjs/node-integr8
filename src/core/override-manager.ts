import {
  IOverrideManager,
  IOverrideBuilder,
  IAuthOverrideBuilder,
  AuthConfig,
  AuthOverrideConfig,
  AuthProfile,
  Adapter,
} from '../types';

export class OverrideManager implements IOverrideManager {
  private workerId: string;
  private overrides: Map<string, any> = new Map();
  private controlPort?: number;
  private authConfig?: AuthConfig;
  private adapter?: Adapter;

  constructor(workerId: string, controlPort?: number, authConfig?: AuthConfig, adapter?: Adapter) {
    this.workerId = workerId;
    this.controlPort = controlPort;
    this.authConfig = authConfig;
    this.adapter = adapter;
  }

  module(moduleName: string): IOverrideBuilder {
    return new OverrideBuilder(this, 'module', moduleName);
  }

  service(serviceName: string): IOverrideBuilder {
    return new OverrideBuilder(this, 'service', serviceName);
  }

  repository(repositoryName: string): IOverrideBuilder {
    return new OverrideBuilder(this, 'repository', repositoryName);
  }

  dataSource(dataSourceName: string): IOverrideBuilder {
    return new OverrideBuilder(this, 'dataSource', dataSourceName);
  }

  provider(providerName: string): IOverrideBuilder {
    return new OverrideBuilder(this, 'provider', providerName);
  }

  middleware(middlewareName: string): IOverrideBuilder {
    return new OverrideBuilder(this, 'middleware', middlewareName);
  }

  auth(middlewareName?: string): IAuthOverrideBuilder {
    return new AuthOverrideBuilder(this, middlewareName || 'auth-middleware');
  }

  async clear(): Promise<void> {
    this.overrides.clear();
    console.log(`Cleared all overrides for worker ${this.workerId}`);
  }

  async applyOverride(type: string, name: string, implementation: any): Promise<void> {
    const key = `${type}:${name}`;
    this.overrides.set(key, implementation);
    
    // Use adapter if available, otherwise fallback to HTTP
    if (this.adapter) {
      await this.adapter.applyOverride(type, name, implementation);
    } else if (this.controlPort) {
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

class OverrideBuilder implements IOverrideBuilder {
  private manager: OverrideManager;
  private type: string;
  private name: string;

  constructor(manager: OverrideManager, type: string, name: string) {
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

class AuthOverrideBuilder implements IAuthOverrideBuilder {
  private manager: OverrideManager;
  private middlewareName: string;

  constructor(manager: OverrideManager, middlewareName: string) {
    this.manager = manager;
    this.middlewareName = middlewareName;
  }

  async with(implementation: any): Promise<void> {
    await this.manager.applyOverride('middleware', this.middlewareName, implementation);
  }

  async withMock(mockFn: (...args: any[]) => any): Promise<void> {
    await this.manager.applyOverride('middleware', this.middlewareName, mockFn);
  }

  async withValue(value: any): Promise<void> {
    await this.manager.applyOverride('middleware', this.middlewareName, value);
  }

  async withUsers(...users: any[]): Promise<void> {
    const mockFn = (req: any, res: any, next: any) => {
      req.user = users[0] || { id: 1, role: 'user' };
      req.users = users;
      next();
    };
    await this.manager.applyOverride('middleware', this.middlewareName, mockFn);
  }

  async withRoles(...roles: string[]): Promise<void> {
    const mockFn = (req: any, res: any, next: any) => {
      req.user = req.user || { id: 1 };
      req.user.roles = roles;
      req.user.role = roles[0] || 'user';
      next();
    };
    await this.manager.applyOverride('middleware', this.middlewareName, mockFn);
  }

  async withPermissions(permissions: string[]): Promise<void> {
    const mockFn = (req: any, res: any, next: any) => {
      req.user = req.user || { id: 1 };
      req.user.permissions = permissions;
      next();
    };
    await this.manager.applyOverride('middleware', this.middlewareName, mockFn);
  }

  async withMockAuth(config: AuthOverrideConfig): Promise<void> {
    const mockFn = (req: any, res: any, next: any) => {
      req.user = config.mockUser || { id: 1, role: 'user' };
      req.user.permissions = config.mockPermissions || [];
      next();
    };
    await this.manager.applyOverride('middleware', this.middlewareName, mockFn);
  }

  async withProfile(profileNameOrProfile: string | AuthProfile): Promise<void> {
    if (typeof profileNameOrProfile === 'string') {
      const profile = this.findProfileByName(profileNameOrProfile);
      if (profile) {
        await this.applyProfile(profile);
      } else {
        throw new Error(`Profile '${profileNameOrProfile}' not found in auth configuration`);
      }
    } else {
      await this.applyProfile(profileNameOrProfile);
    }
  }

  async asAdmin(): Promise<void> {
    await this.withUsers({ id: 1, role: 'admin', permissions: ['*'] });
  }

  async asUser(): Promise<void> {
    await this.withUsers({ id: 2, role: 'user', permissions: ['read'] });
  }

  async asGuest(): Promise<void> {
    await this.withUsers({ id: null, role: 'guest', permissions: [] });
  }

  private findProfileByName(profileName: string): AuthProfile | null {
    if (!this.manager['authConfig']?.profiles) {
      return null;
    }
    return this.manager['authConfig'].profiles.find(p => p.name === profileName) || null;
  }

  private async applyProfile(profile: AuthProfile): Promise<void> {
    const mockFn = async (req: any, res: any, next: any) => {
      switch (profile.type) {
        case 'jwt':
          req.headers.authorization = `Bearer ${profile.token}`;
          req.user = { id: 1, role: 'user' }; // Mock user for JWT
          break;
        case 'oauth2':
          req.headers.authorization = `Bearer ${await this.getOAuth2Token(profile)}`;
          req.user = { id: 1, role: 'user' };
          break;
        case 'apikey':
          req.headers[profile.headerName || 'X-API-Key'] = profile.apiKey;
          req.user = { id: 1, role: 'user' };
          break;
        case 'basic':
          req.headers.authorization = `Basic ${Buffer.from(`${profile.username}:${profile.password}`).toString('base64')}`;
          req.user = { id: 1, role: 'user' };
          break;
        case 'session':
          req.headers.cookie = Object.entries(profile.cookies || {}).map(([k, v]) => `${k}=${v}`).join('; ');
          req.user = { id: 1, role: 'user' };
          break;
        default:
          req.user = { id: 1, role: 'user' };
      }
      next();
    };
    await this.manager.applyOverride('middleware', this.middlewareName, mockFn);
  }

  private async getOAuth2Token(profile: AuthProfile): Promise<string> {
    // For now, return a mock
    return 'mock-oauth2-token';
  }
}
