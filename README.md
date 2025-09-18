# SoapJS Integr8

Framework-agnostic integration testing with Testcontainers. Test your APIs against real databases and services without mocking.

## Features

- **Real Environment Testing**: Spin up your entire application stack with Testcontainers
- **Database State Management**: Smart strategies for deterministic test isolation
- **Framework Agnostic**: Works with Express, NestJS, Fastify, and more
- **Override System**: Mock external services while keeping real database
- **Parallel Testing**: Isolated environments for each test worker
- **CLI Tools**: Easy setup and management

## What This Solves

- **Deterministic Tests**: No more flaky tests due to shared database state
- **Real API Testing**: Test against actual HTTP endpoints, not mocks
- **Fast Feedback**: Savepoint rollbacks instead of full database reseeds
- **Easy Setup**: One command to spin up your entire test environment
- **Framework Independence**: Switch frameworks without changing your tests

## Architecture

### Environment Orchestrator
Manages Testcontainers lifecycle and service coordination.

### DB State Manager
Implements different isolation strategies:
- **Savepoint**: PostgreSQL/MySQL transaction rollbacks (fastest)
- **Schema**: Separate schemas per test scenario
- **Database**: New database per scenario (MongoDB)
- **Snapshot**: Volume snapshots for complex scenarios

### Override System
Runtime dependency injection overrides via control port.

### HTTP Client
Retry logic, timeout handling, and response assertions.

## Quick Start

### 1. Install

```bash
npm install @soapjs/integr8
```

### 2. Initialize

```bash
npx integr8 init
```

This creates:
- `integr8.config.ts` - Configuration file
- `tests/` - Sample test directory
- `.gitignore` - Test artifacts

### 3. Configure

Edit `integr8.config.ts`:

```typescript
import { createConfig, createPostgresService, createAppConfig, createSeedConfig, createExpressAdapter } from 'integr8';

export default createConfig({
  services: [
    createPostgresService(),
  ],
  app: createAppConfig({
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  seed: createSeedConfig('npm run seed'),
  dbStrategy: 'savepoint',
  adapters: [
    createExpressAdapter(),
  ],
});
```

### 4. Write Tests

```typescript
import { defineScenario, setupEnvironment, teardownEnvironment } from 'integr8';

beforeAll(async () => {
  const config = require('./integr8.config.ts').default;
  await setupEnvironment(config);
});

afterAll(async () => {
  await teardownEnvironment();
});

test('should create user', async ({ http, db }) => {
  const response = await http.post('/users', {
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  expect(response.status).toBe(201);
  expect(response.data).toHaveProperty('id');
});
```

### 5. Run Tests

```bash
# Start environment
npx integr8 up

# Run tests
npx integr8 run

# Stop environment
npx integr8 down
```

## 📖 Configuration

### Services

```typescript
services: [
  createPostgresService('postgres', {
    environment: {
      POSTGRES_DB: 'testdb',
      POSTGRES_USER: 'testuser',
      POSTGRES_PASSWORD: 'testpass',
    }
  }),
  createMongoService('mongo'),
  createRedisService('redis'),
  createMailhogService('mailhog'),
]
```

### App Configuration

```typescript
app: createAppConfig({
  image: 'my-app:latest',        // Docker image
  command: 'npm start',          // Start command
  healthcheck: '/health',        // Health check endpoint
  port: 3000,                    // App port
  environment: {                 // Environment variables
    NODE_ENV: 'test',
  }
})
```

### Database Strategy

```typescript
dbStrategy: 'savepoint'  // 'savepoint' | 'schema' | 'database' | 'snapshot'
```

- **savepoint**: Fastest, uses transaction rollbacks
- **schema**: Separate schemas per test
- **database**: New database per test (MongoDB)
- **snapshot**: Volume snapshots (slower but universal)

## Testing API

### HTTP Client

```typescript
// GET request
const response = await http.get('/users');

// POST with data
const response = await http.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With options
const response = await http.get('/users', {
  headers: { 'Authorization': 'Bearer token' },
  timeout: 5000,
  retries: 3
});
```

### Database Access

```typescript
// Direct queries
const users = await db.query('SELECT * FROM users');

// Transactions
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO users ...');
  await tx.query('UPDATE users ...');
});

// Snapshots
await db.snapshot('before-test');
// ... modify data ...
await db.restore('before-test');
```

### Override System

```typescript
// Override services
await ctx.override.service('UserService').withMock(() => ({
  findById: () => ({ id: 1, name: 'Mock User' })
}));

// Override repositories
await ctx.override.repository('UserRepository').with({
  findById: () => Promise.resolve({ id: 1, name: 'Mock User' })
});

// Override data sources
await ctx.override.dataSource('Database').with({
  query: () => Promise.resolve({ rows: [] })
});
```

### Clock Management

```typescript
// Enable fake timers
ctx.clock.fake();

// Advance time
ctx.clock.advance(1000); // 1 second

// Set specific time
ctx.clock.setSystemTime(new Date('2024-01-01'));

// Restore real timers
ctx.clock.restore();
```

### Event Bus

```typescript
// Publish events
await ctx.bus.publish('user.created', { userId: 123 });

// Subscribe to events
await ctx.bus.subscribe('user.created', (data) => {
  console.log('User created:', data);
});
```

## CLI Commands

### `integr8 init`
Initialize integr8 in your project.

```bash
npx integr8 init
npx integr8 init --template nest
npx integr8 init --template fastify
```

### `integr8 up`
Start the test environment.

```bash
npx integr8 up
npx integr8 up --config custom.config.ts
npx integr8 up --detach
```

### `integr8 down`
Stop the test environment.

```bash
npx integr8 down
```

### `integr8 run`
Run integration tests.

```bash
npx integr8 run
npx integr8 run --pattern "*.integration.test.ts"
npx integr8 run --watch
```

## Best Practices

### 1. Use Appropriate DB Strategy

```typescript
// Fast tests with PostgreSQL
dbStrategy: 'savepoint'

// Complex scenarios with MongoDB
dbStrategy: 'database'

// Universal but slower
dbStrategy: 'snapshot'
```

### 2. Leverage Snapshots

```typescript
test('complex workflow', async ({ http, db }) => {
  await db.snapshot('initial-state');
  
  // Complex multi-step test
  await http.post('/users', userData);
  await http.post('/orders', orderData);
  await http.post('/payments', paymentData);
  
  // Verify final state
  const response = await http.get('/orders');
  expect(response.data).toHaveLength(1);
});
```

### 3. Override External Services

```typescript
test('should handle payment failure', async ({ http, ctx }) => {
  await ctx.override.service('PaymentService').withMock(() => ({
    processPayment: () => Promise.reject(new Error('Payment failed'))
  }));
  
  const response = await http.post('/orders', orderData);
  expect(response.status).toBe(400);
});
```

### 4. Use Parallel Isolation

```typescript
// For CI/CD
parallelIsolation: 'schema'

// For local development
parallelIsolation: 'none'
```

## Framework Adapters

### Express

```typescript
import { ExpressAdapter } from 'integr8';

// Add to your Express app
app.use('/__test__', ExpressAdapter.createTestMiddleware());
```

### NestJS

```typescript
import { NestAdapter } from 'integr8';

// In your NestJS app
app.use('/__test__', NestAdapter.createTestMiddleware());
```

### Fastify

```typescript
import { FastifyAdapter } from 'integr8';

// In your Fastify app
app.register(FastifyAdapter.createTestPlugin());
```

## Roadmap

### v0.1 (Current)
- PostgreSQL + Express
- Savepoint & Schema strategies
- Basic CLI tools
- Override system

### v0.2 (Next)
- MongoDB support
- Redis integration
- NestJS & Fastify adapters
- Runtime override endpoint

### v0.3 (Future)
- Kafka/NATS helpers
- Snapshot volumes
- Vitest integration
- CI artifacts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Testcontainers](https://testcontainers.org/) for container orchestration
- [Jest](https://jestjs.io/) for test framework inspiration
- The Node.js community for excellent tooling
