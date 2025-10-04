import { ITransaction } from '../types';

export class DatabaseTransaction implements ITransaction {
  private connectionString: string;
  private isActive: boolean = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async begin(): Promise<void> {
    this.isActive = true;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.isActive) {
      throw new Error('Transaction not active');
    }
    return { rows: [], rowCount: 0 };
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction not active');
    }
    this.isActive = false;
  }

  async rollback(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction not active');
    }
    this.isActive = false;
  }
}
