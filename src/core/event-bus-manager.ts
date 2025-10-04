import { IEventBusManager, Integr8Config } from '../types';
import { Logger } from '../utils/logger';

export class EventBusManager implements IEventBusManager {
  private config: Integr8Config;
  private workerId: string;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private logger: Logger;
  constructor(config: Integr8Config, workerId: string, logger: Logger) {
    this.config = config;
    this.workerId = workerId;
    this.logger = logger;
  }

  async publish(topic: string, data: any): Promise<void> {
    const fullTopic = this.getWorkerSpecificTopic(topic);
    
    // This would publish to the actual event bus (Kafka, NATS, etc.)
    this.logger.log(`Publishing to topic ${fullTopic}:`);
    
    // Also notify local subscribers
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in event handler for topic ${topic}:`, error);
        }
      }
    }
  }

  async subscribe(topic: string, handler: (data: any) => void): Promise<void> {
    const fullTopic = this.getWorkerSpecificTopic(topic);
    
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    
    this.subscribers.get(topic)!.add(handler);
    
    // This would subscribe to the actual event bus
    this.logger.log(`Subscribed to topic ${fullTopic}`);
  }

  async unsubscribe(topic: string, handler: (data: any) => void): Promise<void> {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    }
    
    const fullTopic = this.getWorkerSpecificTopic(topic);
    this.logger.log(`Unsubscribed from topic ${fullTopic}`);
  }

  private getWorkerSpecificTopic(topic: string): string {
    return `${topic}_${this.workerId}`;
  }
}
