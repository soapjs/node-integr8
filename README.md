# SoapJS Integr8

Framework-agnostic integration testing with Testcontainers. Test your APIs against real databases and services without mocking.

## Features

- **Real Environment Testing**: Spin up your entire application stack with Testcontainers
- **Database State Management**: Smart strategies for deterministic test isolation
- **Framework Agnostic**: Works with Express, NestJS, Fastify, and more
- **Override System**: Mock external services while keeping real database
- **Parallel Testing**: Isolated environments for each test worker
- **CLI Tools**: Easy setup and management
- **Multiple App Types**: Docker Compose, Local, or Container execution
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
# Docker Compose (recommended)
npx integr8 init --app-type docker-compose

# Local development
npx integr8 init --app-type local

# Container only
npx integr8 init --app-type container
```

This creates:
- `integr8.config.js` - Configuration file
- `tests/` - Sample test directory
- `Dockerfile.integr8` & `docker-compose.integr8.yml` (if docker-compose)
- `.gitignore` - Test artifacts

### 3. Configure

Edit `integr8.config.js`:

#### Docker Compose (Recommended)
```javascript
module.exports = {
  services: [
    {
      type: 'postgres',
      image: 'postgres:15-alpine',
      port: 5432,
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      }
    }
  ],
  app: {
    type: 'docker-compose',
    composeFile: 'docker-compose.yml',
    service: 'app',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000
  },
  seed: {
    command: 'npm run seed'
  },
  dbStrategy: 'savepoint',
  adapters: [
    { type: 'express' }
  ],
  testDir: 'tests'
};
```

#### Local Development
```javascript
module.exports = {
  services: [
    {
      type: 'postgres',
      image: 'postgres:15-alpine',
      port: 5432,
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass'
      }
    }
  ],
  app: {
    type: 'local',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
    workingDirectory: '.'
  },
  seed: {
    command: 'npm run seed'
  },
  dbStrategy: 'savepoint',
  adapters: [
    { type: 'express' }
  ],
  testDir: 'tests'
};
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

**Development workflow:**
```bash
# Start environment
npx integr8 up

# Run tests
npx integr8 run

# Stop environment
npx integr8 down
```

**CI/CD workflow:**
```bash
# Single command (up + run + down)
npx integr8 ci
```

## 📖 Configuration

### App Types

Integr8 supports three different ways to run your application:

#### 1. Docker Compose (Recommended)
Best for production-like testing with full containerization.

```javascript
app: {
  type: 'docker-compose',
  composeFile: 'docker-compose.integr8.yml',
  service: 'app',
  command: 'npm start',
  healthcheck: '/health',
  port: 3000
}
```

**Benefits:**
- ✅ Full containerization
- ✅ Production-like environment
- ✅ Automatic dependency management
- ✅ Easy to scale and maintain
- ✅ Custom compose file support
- ✅ Automatic DB health checks
- ✅ Proper seeding flow

#### 2. Local Development
Best for fast development and debugging.

```javascript
app: {
  type: 'local',
  command: 'npm start',
  healthcheck: '/health',
  port: 3000,
  workingDirectory: '.'
}
```

**Benefits:**
- ✅ Fastest startup
- ✅ Easy debugging
- ✅ Direct access to logs
- ✅ No Docker required

#### 3. Container Only
Basic container execution without Docker Compose.

```javascript
app: {
  type: 'container',
  image: 'node:18',
  command: 'npm start',
  healthcheck: '/health',
  port: 3000
}
```

**Benefits:**
- ✅ Simple container execution
- ✅ Good for CI/CD
- ✅ Lightweight setup

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
# Basic initialization with Docker Compose
npx integr8 init

# With specific template and app type
npx integr8 init --template nest --app-type docker-compose
npx integr8 init --template express --app-type local
npx integr8 init --template fastify --app-type container

# With custom test directory and config format
npx integr8 init --test-dir ./e2e-tests --format json --app-type local
```

**Options:**
- `--template <template>` - Template to use (express, nest, fastify)
- `--test-dir <path>` - Test directory path (default: tests)
- `--format <format>` - Config file format (js, json)
- `--app-type <type>` - App type (docker-compose, local, container)

### `integr8 up`
Start the test environment.

```bash
npx integr8 up
npx integr8 up --config custom.config.ts
npx integr8 up --detach
npx integr8 up --compose-file docker-compose.custom.yml
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

### `integr8 ci`
Run integration tests in CI mode (up + run + down).

```bash
# CI/CD pipeline
npx integr8 ci

# With options
npx integr8 ci --pattern "*.integration.test.ts" --timeout 600000 --verbose

# Debug mode (skip cleanup)
npx integr8 ci --no-cleanup
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

## CI/CD Integration

### GitHub Actions

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npx integr8 ci --verbose
```

### GitLab CI

```yaml
integration-tests:
  stage: test
  image: node:18-alpine
  
  before_script:
    - npm ci
  
  script:
    - npx integr8 ci --pattern "*.integration.test.ts"
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Integration Tests') {
            steps {
                sh 'npm ci'
                sh 'npx integr8 ci --timeout 600000'
            }
        }
    }
}
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

### 7. Development vs CI Workflows

**Development (flexible):**
```bash
# Start environment once
npx integr8 up

# Run tests multiple times
npx integr8 run
npx integr8 run --watch
npx integr8 run --pattern "users.*"

# Stop when done
npx integr8 down
```

**CI/CD (atomic):**
```bash
# Single command for pipeline
npx integr8 ci

# With specific options
npx integr8 ci --pattern "*.integration.test.ts" --timeout 600000 --verbose
```

**Key differences:**
- **Development**: Manual control, multiple test runs, debugging
- **CI/CD**: Atomic execution, always cleanup, single command

### 8. Docker Compose Workflow

**Using default compose file:**
```bash
# Uses docker-compose.integr8.yml from config
npx integr8 up
```

**Using custom compose file:**
```bash
# Override compose file via CLI
npx integr8 up --compose-file docker-compose.custom.yml

# Or update config
app: {
  type: 'docker-compose',
  composeFile: 'docker-compose.custom.yml',
  service: 'app'
}
```

**Compose file structure:**
```yaml
# docker-compose.integr8.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-soapjs_test}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.integr8
    environment:
      - DATABASE_URL=postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-password}@postgres:5432/${DB_NAME:-soapjs_test}
      - TEST_MODE=1
    depends_on:
      postgres:
        condition: service_healthy
```

**Flow:**
1. **Start compose** - All services start
2. **Wait for DB** - Health check ensures database is ready
3. **Seed data** - Run seeding commands
4. **App ready** - Application starts and is ready for tests

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
