# SoapJS Integr8

Framework-agnostic integration testing with Testcontainers. Test your APIs against real databases and services without mocking.

## Features

- **Real Environment Testing**: Spin up your entire application stack with Testcontainers
- **Database State Management**: Smart strategies for deterministic test isolation
- **Framework Agnostic**: Works with Express, NestJS, Fastify, and more
- **Override System**: Mock external services while keeping real database
- **Parallel Testing**: Isolated environments for each test worker
- **CLI Tools**: Easy setup and management
- **Test Template Generation**: Auto-generate tests from route discovery commands
- **AST-based Test Updates**: Safely add endpoints to existing test files
- **Route Discovery**: Framework-agnostic endpoint discovery system
- **Multiple Test Scenarios**: Generate success, error, and validation tests

## What This Solves

- **Deterministic Tests**: No more flaky tests due to shared database state
- **Real API Testing**: Test against actual HTTP endpoints, not mocks
- **Fast Feedback**: Savepoint rollbacks instead of full database reseeds
- **Easy Setup**: One command to spin up your entire test environment
- **Framework Independence**: Switch frameworks without changing your tests
- **Test Coverage**: Automatically generate tests for all your API endpoints
- **Test Maintenance**: Safely add new endpoints without breaking existing tests
- **Framework Agnostic**: Works with any web framework through route discovery
- **Test Consistency**: Standardized test patterns across your entire API

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

### 4. Generate Tests

```bash
# Generate test templates from your routes
npx integr8 generate --command "npx soap list-routes" --scenarios

# Add individual endpoints as needed
npx integr8 add-endpoint "GET /users/:id" --scenarios
```

### 5. Test Organization

Tests are organized by **controller** for optimal performance and maintainability:

```
tests/
├── integration/
│   ├── users.integration.test.ts      # All /users/* endpoints
│   ├── products.integration.test.ts  # All /products/* endpoints
│   └── orders.integration.test.ts    # All /orders/* endpoints
```

**Generated test structure:**
```typescript
// users.integration.test.ts
import { defineScenario, setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

beforeAll(async () => {
  const config = require('../integr8.config.ts').default;
  await setupEnvironment(config);
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('Users API Integration Tests', () => {
  describe('GET /users', () => {
    test('should successfully handle GET /users', async ({ http }) => {
      const response = await http.get('/users');
      expect(response.status).toBe(200);
      expect(true).toBe(false); // This test needs implementation
    });

    test('should return 401 for unauthorized access to GET /users', async ({ http }) => {
      const response = await http.get('/users');
      expect(response.status).toBe(401);
      expect(true).toBe(false); // This test needs implementation
    });
  });

  describe('POST /users', () => {
    test('should successfully handle POST /users', async ({ http }) => {
      const requestData = { name: 'Test Name', email: 'test@example.com' };
      const response = await http.post('/users', requestData);
      expect(response.status).toBe(201);
      expect(true).toBe(false); // This test needs implementation
    });

    test('should return 400 for invalid data on POST /users', async ({ http }) => {
      const requestData = { name: '', email: 'invalid-email' };
      const response = await http.post('/users', requestData);
      expect(response.status).toBe(400);
      expect(true).toBe(false); // This test needs implementation
    });
  });
});
```

**Why Controller-based Organization?**

- **Performance**: Single `beforeAll`/`afterAll` per controller (faster than per-endpoint)
- **Maintainability**: Related endpoints grouped together logically
- **State Management**: Easier to manage database state across related endpoints
- **Parallel Testing**: Better isolation between different controllers
- **AST Safety**: Safe addition of new endpoints to existing files

### 6. Run Tests

```bash
# Start environment
npx integr8 up

# Run tests
npx integr8 run

# Stop environment
npx integr8 down
```

## 📖 Configuration

### Seeding Options

```typescript
// Option 1: Command-based seeding
seed: createSeedConfig('npm run seed')

// Option 2: TypeORM entities with custom data
seed: createTypeORMEntitiesSeedConfig(
  [User, Product],
  [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Laptop', price: 1299.99, stock: 10 }
  ],
  {
    clearBeforeSeed: true,
    runMigrations: false
  }
)
```

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

### Route Discovery Configuration

```typescript
// Configure route discovery for test generation
routes: {
  command: 'npx soap list-routes',  // Command to discover routes
  outputFormat: 'json',            // Output format: 'json' | 'text' | 'auto'
  timeout: 30000,                   // Command timeout
  workingDirectory: process.cwd(), // Working directory
  environment: {                    // Environment variables
    NODE_ENV: 'test'
  }
}
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

### TypeORM Integration

```typescript
// Option 1: Manual seeding
await TypeORMAdapter.createSeedData(connection, [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' }
]);

// Option 2: Configuration-based seeding
await TypeORMAdapter.runSeeding(connection, {
  typeorm: {
    entities: [User, Product, Order],
    data: [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Laptop', price: 1299.99, stock: 10 }
    ],
    clearBeforeSeed: true,
    runMigrations: false
  }
});

// Clear all data
await TypeORMAdapter.clearAllData(connection, [User]);

// Run migrations
await TypeORMAdapter.runMigrations(connection);

// Revert migrations
await TypeORMAdapter.revertMigrations(connection);
```

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

### `integr8 generate`
Generate test templates from route discovery command.

```bash
# Using config file (recommended)
npx integr8 generate --output ./tests/integration

# Using CLI command
npx integr8 generate --command "npx soap list-routes" --scenarios

# Different frameworks
npx integr8 generate --command "npx nest list-routes" --format json
npx integr8 generate --command "npx express-list-routes" --format text
```

### `integr8 add-endpoint`
Add a single endpoint test to an existing test file.

```bash
# Add endpoint to existing file
npx integr8 add-endpoint "GET /users/:id"

# With multiple scenarios
npx integr8 add-endpoint "POST /users" --scenarios

# Specify target file
npx integr8 add-endpoint "GET /users/:id" --file ./tests/integration/users.integration.test.ts

# Dry run (preview changes)
npx integr8 add-endpoint "GET /users/:id" --dry-run
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

### 5. Generate Test Templates

```bash
# Generate all tests from routes (controller-based organization)
npx integr8 generate --command "npx soap list-routes" --scenarios

# Add individual endpoints to existing files
npx integr8 add-endpoint "GET /users/:id" --scenarios

# Use dry-run to preview changes
npx integr8 add-endpoint "POST /users" --dry-run
```

**Test Organization Strategy:**
- **Controller-based**: One file per controller (e.g., `users.integration.test.ts`)
- **Endpoint grouping**: All endpoints for a controller in one file
- **Scenario coverage**: Multiple test scenarios per endpoint (success, error, validation)
- **Safe updates**: AST-based addition of new endpoints without breaking existing tests

### 6. Framework-Specific Route Discovery

```bash
# SoapJS
npx integr8 generate --command "npx soap list-routes" --format json

# NestJS
npx integr8 generate --command "npx nest list-routes" --format json

# Express.js
npx integr8 generate --command "npx express-list-routes" --format text

# Custom script
npx integr8 generate --command "node scripts/list-routes.js" --format json
```

## Framework Adapters

### Express

```typescript
import { ExpressAdapter } from '@soapjs/integr8';

// Add to your Express app
app.use('/__test__', ExpressAdapter.createTestMiddleware());
```

### NestJS + TypeORM

```typescript
import { TypeORMAdapter } from '@soapjs/integr8';

// In your NestJS app
const testModule = TypeORMAdapter.createTestModule();

// Seed data with TypeORM
await TypeORMAdapter.createSeedData(connection, [
  { name: 'John Doe', email: 'john@example.com' }
]);
```

### Fastify

```typescript
import { FastifyAdapter } from '@soapjs/integr8';

// In your Fastify app
app.register(FastifyAdapter.createTestPlugin());
```

## Roadmap

### v0.1 (Current)
- PostgreSQL + Express
- NestJS + TypeORM support
- Savepoint & Schema strategies
- Basic CLI tools
- Override system
- **Test template generation**
- **AST-based endpoint addition**
- **Route discovery system**

### v0.2 (Next)
- MongoDB support
- Redis integration
- Fastify adapter
- Runtime override endpoint
- **API coverage analysis**
- **Test organization tools**

### v0.3 (Future)
- Kafka/NATS helpers
- Snapshot volumes
- Vitest integration
- CI artifacts
- **Interactive test generation**
- **Test performance optimization**

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
