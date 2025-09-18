import { createConfig, createPostgresService, createAppConfig, createTypeORMEntitiesSeedConfig, createNestAdapter } from '@soapjs/integr8';
import { User } from './src/users/user.entity';
import { Product } from './src/products/product.entity';
import { Order, OrderItem } from './src/orders/order.entity';

// Comprehensive sample data
const sampleData = [
  // Users
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Bob Johnson', email: 'bob@example.com' },
  { name: 'Alice Brown', email: 'alice@example.com' },
  
  // Products
  { name: 'Laptop', description: 'High-performance laptop', price: 1299.99, stock: 10, category: 'Electronics', createdById: 1 },
  { name: 'Mouse', description: 'Wireless mouse', price: 29.99, stock: 50, category: 'Electronics', createdById: 1 },
  { name: 'Keyboard', description: 'Mechanical keyboard', price: 89.99, stock: 25, category: 'Electronics', createdById: 2 },
  { name: 'Monitor', description: '4K monitor', price: 399.99, stock: 15, category: 'Electronics', createdById: 2 },
  { name: 'Desk', description: 'Standing desk', price: 299.99, stock: 8, category: 'Furniture', createdById: 3 },
  
  // Orders
  { userId: 1, total: 1329.98, status: 'completed', notes: 'First order' },
  { userId: 2, total: 489.98, status: 'pending', notes: 'Second order' },
  { userId: 3, total: 299.99, status: 'shipped', notes: 'Furniture order' },
  
  // Order Items
  { orderId: 1, productId: 1, quantity: 1, price: 1299.99 },
  { orderId: 1, productId: 2, quantity: 1, price: 29.99 },
  { orderId: 2, productId: 3, quantity: 1, price: 89.99 },
  { orderId: 2, productId: 4, quantity: 1, price: 399.99 },
  { orderId: 3, productId: 5, quantity: 1, price: 299.99 }
];

export default createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    }),
  ],
  app: createAppConfig({
    image: 'sample-nestjs-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
    environment: {
      NODE_ENV: 'test',
      PORT: '3000',
    }
  }),
  // Multi-entity seeding with relationships
  seed: createTypeORMEntitiesSeedConfig(
    [User, Product, Order, OrderItem], // All entities
    sampleData, // Comprehensive sample data
    {
      clearBeforeSeed: true, // Clear existing data
      runMigrations: false, // Don't run migrations
      timeout: 45000 // Longer timeout for complex seeding
    }
  ),
  dbStrategy: 'savepoint',
  parallelIsolation: 'schema',
  adapters: [
    createNestAdapter({
      typeorm: true,
      testModule: true
    }),
  ],
  testMode: {
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true,
  }
});
