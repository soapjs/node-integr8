export interface Integr8Config {
  services: ServiceConfig[];
  app: AppConfig;
  seed?: SeedConfig;
  dbStrategy: DBStrategy;
  adapters?: AdapterConfig[];
  parallelIsolation?: 'schema' | 'db' | 'none';
  testMode?: TestModeConfig;
  routes?: RoutesConfig;
}

export interface ServiceConfig {
  name: string;
  type: 'postgres' | 'mysql' | 'mongo' | 'redis' | 'kafka' | 'mailhog' | 'custom';
  image?: string;
  ports?: number[];
  environment?: Record<string, string>;
  volumes?: VolumeConfig[];
  healthcheck?: HealthCheckConfig;
  dependsOn?: string[];
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

export interface AppConfig {
  image?: string;
  context?: string;
  command: string;
  healthcheck: string;
  port: number;
  environment?: Record<string, string>;
  volumes?: VolumeConfig[];
  dependsOn?: string[];
}

export interface SeedConfig {
  command?: string;
  timeout?: number;
  entities?: any[];
  typeorm?: TypeORMSeedConfig;
}

export interface TypeORMSeedConfig {
  entities: any[];
  data?: any[];
  clearBeforeSeed?: boolean;
  runMigrations?: boolean;
}

export type DBStrategy = 'savepoint' | 'schema' | 'database' | 'snapshot';

export interface AdapterConfig {
  type: 'express' | 'nest' | 'fastify';
  config?: Record<string, any>;
}

export interface TestModeConfig {
  controlPort?: number;
  overrideEndpoint?: string;
  enableFakeTimers?: boolean;
}

export interface EnvironmentContext {
  http: HttpClient;
  db: DatabaseManager;
  ctx: TestContext;
  clock?: ClockManager;
  bus?: EventBusManager;
}

export interface TestContext {
  override: OverrideManager;
  snapshot: SnapshotManager;
  workerId: string;
  scenarioId: string;
}

export interface HttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
  get(url: string, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  post(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  put(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  delete(url: string, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
  patch(url: string, data?: any, options?: Partial<HttpRequestOptions>): Promise<HttpResponse>;
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

export interface DatabaseManager {
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

export interface OverrideManager {
  module(moduleName: string): OverrideBuilder;
  service(serviceName: string): OverrideBuilder;
  repository(repositoryName: string): OverrideBuilder;
  dataSource(dataSourceName: string): OverrideBuilder;
  provider(providerName: string): OverrideBuilder;
  clear(): Promise<void>;
}

export interface OverrideBuilder {
  with(implementation: any): Promise<void>;
  withMock(mockFn: (...args: any[]) => any): Promise<void>;
  withValue(value: any): Promise<void>;
}

export interface SnapshotManager {
  create(name: string): Promise<void>;
  restore(name: string): Promise<void>;
  list(): Promise<string[]>;
  delete(name: string): Promise<void>;
}

export interface ClockManager {
  fake(): void;
  restore(): void;
  advance(ms: number): void;
  setSystemTime(date: Date): void;
}

export interface EventBusManager {
  publish(topic: string, data: any): Promise<void>;
  subscribe(topic: string, handler: (data: any) => void): Promise<void>;
  unsubscribe(topic: string, handler: (data: any) => void): Promise<void>;
}

export interface ScenarioDefinition {
  name: string;
  fn: (env: EnvironmentContext) => Promise<void> | void;
  timeout?: number;
  retries?: number;
}

export interface EnvironmentOrchestrator {
  start(): Promise<void>;
  stop(): Promise<void>;
  isReady(): Promise<boolean>;
  getServiceUrl(serviceName: string, port?: number): string;
  getAppUrl(): string;
  getContext(): EnvironmentContext;
}

export interface DBStateManager {
  initialize(): Promise<void>;
  createSavepoint(): Promise<string>;
  rollbackToSavepoint(savepointId: string): Promise<void>;
  createSchema(schemaName: string): Promise<void>;
  dropSchema(schemaName: string): Promise<void>;
  copySchema(fromSchema: string, toSchema: string): Promise<void>;
  createDatabase(dbName: string): Promise<void>;
  dropDatabase(dbName: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface Adapter {
  name: string;
  initialize(config: AdapterConfig): Promise<void>;
  setupOverrides(overrideManager: OverrideManager): Promise<void>;
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
