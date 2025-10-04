export type TestType = 'api' | 'e2e' | 'integration' | 'custom';
export type TestFramework = 'jest' | 'vitest';
export type SeedStrategy = 'once' | 'per-file' | 'per-test' | 'custom';
export type DBStrategy = 'savepoint' | 'schema' | 'database' | 'snapshot' | 'custom';
export type DBRestore = 'none' | 'rollback' | 'reset' | 'snapshot';
export type DBIsolation = 'schema' | 'db' | 'none';
export type MessagingType = 'kafka' | 'rabbitmq' | 'redis-streams' | 'grpc' | 'nats' | 'sqs' | 'pubsub' | string;
export type AuthType = 'jwt' | 'oauth2' | 'apikey' | 'basic' | 'session' | string;

export type HttpRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  data: any;
  duration: number;
}

export type Integr8Config = {
  services: ServiceConfig[];
  databases?: DatabaseConfig[];
  messaging?: MessagingConfig[];
  storages?: StorageConfig[];
  testType?: TestType;
  testDir?: string;
  testFramework?: 'jest' | 'vitest';
  testTimeout?: number;
  setupTimeout?: number;
  teardownTimeout?: number;
  endpointDiscovery?: EndpointDiscoveryConfig;
}

export type EndpointDiscoveryConfig = {
  command: string;
  timeout: number;
};

export type LocalProcessConfig = {
  command: string;
  cwd: string;
  args?: string[];
}

export type ContainerConfig = {
  image: string;
  containerName: string;
  volumes?: VolumeConfig[];
  ports?: { host: number; container: number }[];
  environment?: Record<string, string>;
  envMapping?: Record<string, string>;
}

export interface ComponentConfig {
  name: string;
  category: 'service' | 'database' | 'storage' | 'messaging';
  type: string;
  adapter?: AdapterConfig;
  local?: LocalProcessConfig
  container?: ContainerConfig;
  environment?: Record<string, string>;
  readiness?: ReadinessConfig;
  dependsOn?: string[];
  logging?: 'debug' | 'error' | 'log' | 'info' | 'warn' | boolean;
}

export type HttpConfig = {
  baseUrl: string;
  port?: number;
  prefix?: string;
  framework?: string;
}

export type SocketConfig = {
  baseUrl: string;
  port?: number;
  prefix?: string;
  framework?: string;
}

export type ServiceConfig = ComponentConfig & {
  category: 'service';
  http?: HttpConfig;
  ws?: SocketConfig;
  auth?: AuthConfig;
  testMode?: ServiceTestModeConfig;
}

export type DatabaseConfig = ComponentConfig & {
  category: 'database';
  strategy?: DBStrategy;
  isolation?: DBIsolation;
  seed?: SeedConfig;
  container?: ContainerConfig & { envMapping?: DatabaseEnvMapping};
}

export type StorageConfig = ComponentConfig & {
  category: 'storage';
  container?: ContainerConfig & { envMapping?: StorageEnvMapping};
}

export type MessagingConfig = ComponentConfig & {
  category: 'messaging';
  container?: ContainerConfig & { envMapping?: MessagingEnvMapping};
  connection?: {
    brokers?: string[];
    clusterId?: string;
    endpoint?: string; 
    region?: string;   
  }

  topics?: string[];           
  queues?: string[];           
  streams?: string[];          
  services?: string[];         
  
  auth?: {
    username?: string;
    password?: string;
    apiKey?: string;
    certificates?: string[];
  }
  
  testMode?: {
    mockPublishers?: boolean;  
    captureMessages?: boolean; 
    isolation?: 'topic' | 'queue' | 'stream' | 'none';
  }
}

export type DatabaseEnvMapping = {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
}

export type MessagingEnvMapping = {
  brokers?: string[];
  clusterId?: string;
  endpoint?: string;
  region?: string;
}

export type StorageEnvMapping = {
  endpoint?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
}

export type VolumeConfig = {
  host: string;
  container: string;
  mode?: 'ro' | 'rw';
}

export type ReadinessConfig = {
  command?: string;
  endpoint?: string;
  interval?: number;
  timeout?: number;
  retries?: number;
}

export type SeedConfig = {
  command?: string | ((...args: any[]) => void);
  timeout?: number;
  condition?: (...args: any[]) => boolean;
  strategy?: SeedStrategy;
  restore?: DBRestore;
}

export type AdapterConfig = {
  type: string;
  config?: Record<string, any>;
}

export type ServiceTestModeConfig = {
  controlPort?: number;
  overrideEndpoint?: string;
  enableFakeTimers?: boolean;
}

export type IEnvironmentContext = {
  getHttp(serviceName: string): IHttpClient;
  getDb(serviceName: string): IDatabaseManager;
  getMessaging(serviceName: string): IMessagingManager;
  getStorage(serviceName: string): IStorageManager;
  getCtx(): ITestContext;
  getClock(): IClockManager;
  getBus(): IEventBusManager;
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

export interface IDatabaseManager {
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  snapshot(name: string): Promise<void>;
  restore(name: string): Promise<void>;
  reset(): Promise<void>;
  getConnectionString(): string;
}

export interface ITransaction {
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

export interface IRunner {
  start(fast: boolean): Promise<void>;
  stop(): Promise<void>;
  isReady(serviceName: string): Promise<boolean>;
}

export interface IOrchestrator {
  start(fast: boolean): Promise<void>;
  stop(): Promise<void>;
  isReady(serviceName: string): Promise<boolean>;
  startService(service: ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig, fast: boolean): Promise<void>;
  stopService(service: ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig): Promise<void>;
}

export interface IServiceManager {
  start(fast: boolean): Promise<void>;
  stop(): Promise<void>;
  isServiceReady(serviceName: string): Promise<boolean>;
  getServiceStatus(serviceName: string): ServiceStatus;
}

export enum ServiceStatus {
  PENDING = 'pending',
  STARTING = 'starting', 
  RUNNING = 'running',
  FAILED = 'failed',
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

// Event types for service lifecycle
export interface ServiceEvent {
  serviceName: string;
  service: ServiceConfig | DatabaseConfig | MessagingConfig | StorageConfig;
  error?: string;
}

export interface IEnvironmentOrchestrator extends IOrchestrator {
  // isReady(): Promise<boolean>;
  // getServiceUrl(serviceName: string, port?: number): string;
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

export interface IMessagingManager {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: (message: any) => void): Promise<void>;
  unsubscribe(topic: string, handler: (message: any) => void): Promise<void>;
  send(queue: string, message: any): Promise<void>;
  receive(queue: string, handler: (message: any) => void): Promise<void>;
  clear(): Promise<void>;
}

export interface IStorageManager {
  upload(key: string, data: Buffer | string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
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
  override?: AuthOverrideConfig[];
  profiles?: AuthProfile[];
  defaultProfile?: string;
}

export interface AuthOverrideConfig {
  name: string;
  middleware?: string;
  mockUser?: any;
  mockPermissions?: string[];
  condition?: (context: any) => boolean; 
}

export interface AuthProfile {
  name: string;
  type: AuthType;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  token?: string;
  apiKey?: string;
  headerName?: string;
  username?: string;
  password?: string;
  cookies?: Record<string, string>;
}
