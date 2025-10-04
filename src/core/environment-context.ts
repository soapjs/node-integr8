import { buildUrl } from "../utils/url.utils";
import {
  IClockManager,
  IDatabaseManager,
  IEventBusManager,
  IHttpClient,
  Integr8Config,
  ITestContext,
  IMessagingManager,
  IStorageManager,
} from "../types";
import { ClockManager } from "./clock-manager";
import { EventBusManager } from "./event-bus-manager";
import { HttpClient } from "./http-client";
import { TestContext } from "./test-context";
import { DatabaseManager } from "./database-manager";
import { Logger } from "../utils/logger";

export class EnvironmentContext {

  static create(config: Integr8Config, workerId: string, logger: Logger): EnvironmentContext {
    return new EnvironmentContext(config, workerId, logger);
  }

  private http: { [key: string]: IHttpClient } = {};
  private db: { [key: string]: IDatabaseManager } = {};
  private messaging: { [key: string]: IMessagingManager } = {};
  private storage: { [key: string]: IStorageManager } = {};
  private ctx: ITestContext;
  private clock: IClockManager;
  private bus: IEventBusManager;
  private workerId: string;
  
  constructor(private config: Integr8Config, workerId: string, logger: Logger) {
    this.workerId = workerId;
    this.ctx = new TestContext(workerId);
    this.clock = new ClockManager();
    this.bus = new EventBusManager(this.config, workerId, logger);
  }

  async initialize(): Promise<void> {
    this.config.services.forEach(service => {
      if (service.http) {
        this.http[service.name] = new HttpClient(buildUrl(service.http));
      }
    });

    // Initialize databases with Promise.all
    if (this.config.databases) {
      await Promise.all(this.config.databases.map(database => {
        this.db[database.name] = new DatabaseManager(database, this.workerId);
      }));
    }

    // Initialize messaging services (placeholder for now)
    this.config.messaging?.forEach(messaging => {
      // TODO: Implement MessagingManager
      this.messaging[messaging.name] = {} as IMessagingManager;
    });

    // Initialize storage services (placeholder for now)
    this.config.storages?.forEach(storage => {
      // TODO: Implement StorageManager
      this.storage[storage.name] = {} as IStorageManager;
    });
  }

  getHttp(serviceName = 'app'): IHttpClient {
    return this.http[serviceName];
  }

  getDb(serviceName: string): IDatabaseManager {
    return this.db[serviceName];
  }

  getMessaging(serviceName: string): IMessagingManager {
    return this.messaging[serviceName];
  }

  getStorage(serviceName: string): IStorageManager {
    return this.storage[serviceName];
  }

  getCtx(): ITestContext {
    return this.ctx;
  }

  getClock(): IClockManager {
    return this.clock;
  }

  getBus(): IEventBusManager {
    return this.bus;
  }
}