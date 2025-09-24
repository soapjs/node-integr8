export interface Integr8Config {
  services: ServiceConfig[];
  testType?: 'api' | 'e2e' | 'unit-db' | 'custom';
  testDirectory?: string;
  testFramework?: 'jest' | 'vitest';
  testScenarios?: TestScenario[];
  testMode?: TestModeConfig;
  urlPrefix?: string;
  testTimeout?: number;
  setupTimeout?: number;
  teardownTimeout?: number;
  adapters?: AdapterConfig[];
}

export interface ServiceConfig {
  name: string;
  type: 'service' | 'postgres' | 'mysql' | 'mongo' | 'redis' | 'kafka' | 'mailhog' | 'custom';
  mode?: 'local' | 'container';
  adapter?: AdapterConfig;
  // For container services only:
  image?: string;
  command?: string;

  ports?: number[];
  environment?: Record<string, string>;
  volumes?: VolumeConfig[];
  healthcheck?: HealthCheckConfig;
  dependsOn?: string[];
  containerName?: string;
  workingDirectory?: string;
  
  // For database services only:
  dbStrategy?: 'savepoint' | 'schema' | 'database' | 'snapshot' | 'hybrid-savepoint-schema' | 'hybrid-schema-database' | 'transactional-schema';
  parallelIsolation?: 'schema' | 'db' | 'none';
  seed?: SeedConfig;
  
  // Environment variable mapping for application services
  envMapping?: EnvironmentMapping;
  
  // Logging control for debugging
  logging?: 'debug' | 'error' | 'log' | 'info' | 'warn' | boolean;
  
  // Authentication configuration (applies to application services only, not database services)
  auth?: AuthConfig;
}

export interface EnvironmentMapping {
  host?: string;        // Environment variable name for host (e.g., 'DB_HOST')
  port?: string;        // Environment variable name for port (e.g., 'DB_PORT')
  username?: string;    // Environment variable name for username (e.g., 'DB_USERNAME')
  password?: string;    // Environment variable name for password (e.g., 'DB_PASSWORD')
  database?: string;    // Environment variable name for database name (e.g., 'DB_NAME')
  url?: string;         // Environment variable name for full connection URL (e.g., 'DATABASE_URL')
}

export interface VolumeConfig {
  host: string;
  container: string;
  mode?: 'ro' | 'rw';
}

export interface HealthCheckConfig {
  command: string;
  interval?: number;
  timeout?: number;
  retries?: number;
  startPeriod?: number;
}


export interface SeedConfig {
  command?: string;
  timeout?: number;
  entities?: any[];
  typeorm?: TypeORMSeedConfig;
  strategy?: 'once' | 'per-file' | 'per-test' | 'custom';
  restoreStrategy?: 'none' | 'rollback' | 'reset' | 'snapshot';
  customScenarios?: SeedScenario[];
}

export interface SeedScenario {
  name: string;
  description?: string;
  condition?: (context: any) => boolean;
  seedData?: any[];
  seedCommand?: string;
  restoreAfter?: boolean;
}

export interface TypeORMSeedConfig {
  entities: any[];
  data?: any[];
  clearBeforeSeed?: boolean;
  runMigrations?: boolean;
}

export type DBStrategy = 'savepoint' | 'schema' | 'database' | 'snapshot' | 'hybrid-savepoint-schema' | 'hybrid-schema-database' | 'transactional-schema';

export interface AdapterConfig {
  type: string;
  config?: Record<string, any>;
}

export interface TestModeConfig {
  controlPort?: number;
  overrideEndpoint?: string;
  enableFakeTimers?: boolean;
}

export interface IEnvironmentContext {
  http?: IHttpClient;
  db: IDatabaseManager;
  ctx: ITestContext;
  clock?: IClockManager;
  bus?: IEventBusManager;
}

export interface ITestContext {
  override: IOverrideManager;
  snapshot: ISnapshotManager;
  workerId: string;
  scenarioId: string;
}

export interface IHttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
  get(url: string, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  post(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  put(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  delete(url: string, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  patch(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
}

export interface IAuthOverrideBuilder extends IOverrideBuilder {
  withUsers(...users: any[]): Promise<void>;
  withRoles(...roles: string[]): Promise<void>;
  withPermissions(permissions: string[]): Promise<void>;
  withMockAuth(config: AuthOverrideConfig): Promise<void>;
  withProfile(profileName: string): Promise<void>;
  withProfile(profile: AuthProfile): Promise<void>;
  asAdmin(): Promise<void>;
  asUser(): Promise<void>;
  asGuest(): Promise<void>;
}


export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  duration: number;
}

export interface IDatabaseManager {
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  snapshot(name: string): Promise<void>;
  restore(name: string): Promise<void>;
  reset(): Promise<void>;
  getConnectionString(): string;
}

export interface Transaction {
  query(sql: string, params?: any[]): Promise<any>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface IOverrideManager {
  module(moduleName: string): IOverrideBuilder;
  middleware(middlewareName: string): IOverrideBuilder;
  service(serviceName: string): IOverrideBuilder;
  repository(repositoryName: string): IOverrideBuilder;
  dataSource(dataSourceName: string): IOverrideBuilder;
  provider(providerName: string): IOverrideBuilder;
  // Auth-specific helpers
  auth(middlewareName?: string): IAuthOverrideBuilder;
  clear(): Promise<void>;
}

export interface IOverrideBuilder {
  with(implementation: any): Promise<void>;
  withMock(mockFn: (...args: any[]) => any): Promise<void>;
  withValue(value: any): Promise<void>;
}

export interface ISnapshotManager {
  create(name: string): Promise<void>;
  restore(name: string): Promise<void>;
  list(): Promise<string[]>;
  delete(name: string): Promise<void>;
}

export interface IClockManager {
  fake(): void;
  restore(): void;
  advance(ms: number): void;
  setSystemTime(date: Date): void;
}

export interface IEventBusManager {
  publish(topic: string, data: any): Promise<void>;
  subscribe(topic: string, handler: (data: any) => void): Promise<void>;
  unsubscribe(topic: string, handler: (data: any) => void): Promise<void>;
}

export interface ScenarioDefinition {
  name: string;
  fn: (env: IEnvironmentContext) => Promise<void> | void;
  timeout?: number;
  retries?: number;
}

export interface IEnvironmentOrchestrator {
  start(): Promise<void>;
  stop(): Promise<void>;
  isReady(): Promise<boolean>;
  getServiceUrl(serviceName: string, port?: number): string;
  getAppUrl(): string;
  getContext(): IEnvironmentContext;
}

export interface IDBStateManager {
  initialize(): Promise<void>;
  createSavepoint(): Promise<string>;
  rollbackToSavepoint(savepointId: string): Promise<void>;
  createSchema(schemaName: string): Promise<void>;
  dropSchema(schemaName: string): Promise<void>;
  copySchema(fromSchema: string, toSchema: string): Promise<void>;
  createDatabase(dbName: string): Promise<void>;
  dropDatabase(dbName: string): Promise<void>;
  cleanup(): Promise<void>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  getPerformanceMetrics(): PerformanceMetrics[];
  getAverageOperationTime(operation: string): number;
  getStrategyPerformance(): Record<string, number>;
}

export interface Adapter {
  name: string;
  initialize(config: AdapterConfig): Promise<void>;
  applyOverride(type: string, name: string, implementation: any): Promise<void>;
  teardown(): Promise<void>;
}

export interface RoutesConfig {
  command?: string;
  outputFormat?: 'json' | 'text' | 'auto';
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface RouteInfo {
  method: string;
  path: string;
  controller?: string;
  handler?: string;
  group?: string;
}

export interface TestScenario {
  description: string;
  expectedStatus: number;
  requestData?: any;
  queryParams?: any;
  pathParams?: any;
  expectedResponse?: any;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  workerId: string;
  strategy: string;
}

export interface AuthConfig {
  // Override configurations for test environment (bypasses real authentication)
  override?: AuthOverrideConfig[];
  // Authentication profiles for stage/prod environments (uses real credentials)
  profiles?: AuthProfile[];
  // Default profile to use when no specific profile is specified
  defaultProfile?: string;
}

export interface AuthOverrideConfig {
  name: string;
  middleware?: string;
  mockUser?: any;
  mockPermissions?: string[];
  condition?: (context: any) => boolean; // When to use this override
}

export interface AuthProfile {
  name: string;
  type: 'jwt' | 'oauth2' | 'apikey' | 'basic' | 'session';
  
  // OAuth2 configuration
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  
  // JWT configuration
  token?: string;
  
  // API Key configuration
  apiKey?: string;
  headerName?: string;
  
  // Basic Auth configuration
  username?: string;
  password?: string;
  
  // Session configuration
  cookies?: Record<string, string>;
}
