# SoapJS Integr8

Framework-agnostic integration testing with Testcontainers. Test your APIs against real databases and services without mocking.

> ⚠️ **Work in Progress** - Currently in development towards v1.0.0. API is stable and won't change, only additions will be made.

## What is Integr8?

Integr8 is a powerful testing framework that solves the problem of flaky, unreliable integration tests by providing:

- **Real Environment Testing**: Spin up your entire application stack with Testcontainers
- **Database State Management**: Smart strategies for deterministic test isolation
- **Framework Agnostic**: Works with Express, NestJS, Fastify, and more
- **Override System**: Mock external services while keeping real database
- **Coverage Analysis**: Track which endpoints are tested and enforce thresholds
- **Parallel Testing**: Isolated environments for each test worker
- **CLI Tools**: Easy setup and management with clean, colored output

## What Problems Does It Solve?

- **Deterministic Tests**: No more flaky tests due to shared database state
- **Real API Testing**: Test against actual HTTP endpoints, not mocks
- **Dynamic Mocking**: Override services, guards, and middleware at runtime without restart
- **Fast Feedback**: Savepoint rollbacks instead of full database reseeds
- **Easy Setup**: One command to spin up your entire test environment
- **Framework Independence**: Switch frameworks without changing your tests

## Installation

```bash
npm install @soapjs/integr8
```

## Quick Start

### 1. Initialize

```bash
# Interactive mode
npx integr8 init -i
```

### 2. Review the config

Edit `integr8.api.config.js`:

```js
module.exports = {
  testType: "api",
  testDir: "integr8/tests",
  services: [
    {
      name: "app",
      category: "service",
      type: undefined,
      mode: "local",
      communicationType: "http",
      http: {
        baseUrl: "http://localhost",
        port: 3000,
        prefix: "/api"
      },
      framework: "nestjs",
      readiness: {
        enabled: true,
        endpoint: "/health",
        command: ""
      },
      local: {
        command: "npm start",
        workingDirectory: "."
      },
    }
  ],
  databases: [
    {
      name: "main-db",
      category: "database",
      type: "postgresql",
      mode: "container",
      isolation: "savepoint",
      seeding: {
        strategy: "per-file",
        command: "ts-node src/seeds/seed.ts",
      },
      container: {
        image: "postgres:15-alpine",
        containerName: "test-db",
        ports: [
          {
            host: 5432,
            container: 5432
          }
        ],
        environment: {
          POSTGRES_USER: "postgres",
          POSTGRES_PASSWORD: "password",
          POSTGRES_DB: "testdb"
        },
        envMapping: {
          host: "DB_HOST",
          port: "DB_PORT",
          username: "DB_USERNAME",
          password: "DB_PASSWORD",
          database: "DB_NAME",
          url: "DATABASE_URL"
        }
      }
    }
  ],
  storages: [],
  messaging: [],
  scanning: {
    decorators: {
      enabled: true,
      framework: 'nestjs',
      decorators: {
        controllers: ['@Controller', '@RestController'],
        routes: ['@Get', '@Post', '@Put', '@Delete', '@Patch'],
        statusCodes: ['@HttpCode'],
        apiDocs: ['@ApiResponse', '@ApiOperation']
      },
      paths: ['src'],
      // paths: ['src/controllers', 'src/modules'],
      exclude: ['**/*.spec.ts', '**/*.test.ts']
    },
    output: 'lista.json'
  }
};
```

### 3. Generate Tests

```bash
# Scan endpoints and generate tests (uses config)
npx integr8 scan

# Or with custom command
npx integr8 scan --command "npm run list-routes"
```

### 4. Run Tests

```bash
# Start environment
npx integr8 up

# Run tests (detects existing environment)
npx integr8 test

# Stop environment
npx integr8 down

# or run 
npx integr8 ci
```

## Database Isolation Strategies

Integr8 provides different database isolation strategies with intelligent recommendations:

> 📚 **New to database strategies?** Check out our [comprehensive guide](./docs/database-strategies.md) that explains everything in simple terms!

### 🎯 Smart Isolation Strategy Selection

The CLI now automatically shows only compatible strategies for your database type during interactive setup:

```bash
# Interactive setup now shows only compatible strategies
npx integr8 init -i
```

### Available Isolation Strategies

#### Savepoint Strategy (Fastest)
```json
{
  "isolation": "savepoint"
}
```
- ⚡⚡⚡⚡⚡ Fastest (~1ms setup)
- Uses transaction rollbacks
- **Compatible with:** PostgreSQL, MySQL
- **Best for:** Development, Unit Tests

#### Schema Strategy (Balanced)
```json
{
  "isolation": "schema"
}
```
- ⚡⚡⚡⚡ Good speed (~50ms setup)
- Separate schemas per test
- **Compatible with:** PostgreSQL, MySQL
- **Best for:** Integration Tests

#### Database Strategy (Isolated)
```json
{
  "isolation": "database"
}
```
- ⚡⚡⚡ Slower (~200ms setup)
- New database per test
- **Compatible with:** PostgreSQL, MySQL, MongoDB
- **Best for:** E2E Tests, MongoDB

#### Snapshot Strategy (Universal)
```json
{
  "isolation": "snapshot"
}
```
- ⚡⚡ Slowest (~1000ms setup)
- Volume snapshots
- **Compatible with:** PostgreSQL, MySQL, MongoDB
- **Best for:** Complex scenarios

## Endpoint Scanning & Test Generation

Integr8 can automatically scan your codebase for endpoints and generate test files.

### Configuration

Configure scanning in `integr8.config.json`:

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "paths": ["src"],
      "exclude": ["**/*.spec.ts", "**/*.test.ts"]
    },
    "discovery": {
      "command": "npm run list-routes",
      "timeout": 10000
    },
    "output": "integr8/tests",
    "generateTests": true
  }
}
```

### Scan Entire Project

```bash
# Scan decorators and save endpoints to JSON
npx integr8 scan --decorators --output endpoints.json

# Scan and auto-generate test files
npx integr8 scan --decorators --generate-tests

# Use discovery command instead
npx integr8 scan --command "npm run list-routes"
```

### Scan Specific Files or Directories

You can target specific files or directories for scanning:

```bash
# Scan a specific file
npx integr8 scan --decorators --file src/controllers/user.controller.ts --generate-tests

# Scan a specific directory
npx integr8 scan --decorators --dir src/controllers --generate-tests

# Combine both
npx integr8 scan --decorators --file src/auth/auth.controller.ts --dir src/api --generate-tests
```

This is useful when:
- 🎯 You're adding a new controller and want to quickly generate tests for it
- 📁 You're working on a specific module and need tests only for that directory
- 🚀 You want to iteratively generate tests as you develop

The `--file` and `--dir` options work only with `--decorators` flag.

> 📚 **Full guide**: See [Scan Configuration](./docs/scan-configuration.md) for complete examples and migration guide.

## Endpoint Coverage Analysis

Track which of your API endpoints are covered by tests:

```bash
# Analyze coverage (auto-detects config)
npx integr8 coverage

# Output:
Endpoint Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  Total Endpoints:    45
  Tested Endpoints:   32 (71.1%)
  Untested Endpoints: 13 (28.9%)

By HTTP Method:
  GET     15/20  (75.0%)  ████████████████░░░░
  POST    10/15  (66.7%)  █████████████░░░░░░░
  PUT      4/6   (66.7%)  █████████████░░░░░░░
  DELETE   3/4   (75.0%)  ████████████████░░░░
```

### Configuration

```json
{
  "coverage": {
    "output": "coverage-report.json",
    "threshold": 70
  }
}
```

### Features

- Visual coverage report with progress bars
- 🎯 Intelligent path matching (`/users/123` matches `/users/:id`)
- 📈 Coverage by HTTP method
- 🚦 Threshold enforcement for CI/CD
- JSON report for tracking over time
- 🔗 Auto-shows after `scan` if configured

> 📚 **Full guide**: See [Coverage Guide](./docs/coverage.md) for complete documentation and CI/CD integration.

## Override System - Dynamic Mocking

Integr8 provides a powerful **override system** that allows you to dynamically mock any component of your application at runtime - no restart needed!

> 📚 **Full documentation**: See [Override System Guide](./docs/override-system.md) for complete examples and API reference.

### Quick Example

```typescript
import { setupEnvironment, getEnvironmentContext } from '@soapjs/integr8';

describe('User Tests', () => {
  beforeAll(async () => {
    await setupEnvironment();
  });

  test('should mock user service', async () => {
    const ctx = getEnvironmentContext();
    
    // Dynamically mock UserService
    await ctx.getCtx().override.service('UserService').withMock({
      findById: async (id) => ({ id, name: 'Mock User' })
    });
    
    const response = await ctx.getHttp().get('/users/123');
    expect(response.data.name).toBe('Mock User');
  });

  test('should test as admin', async () => {
    const ctx = getEnvironmentContext();
    
    // Mock authentication
    await ctx.getCtx().override.auth().asAdmin();
    
    const response = await ctx.getHttp().post('/admin/users', {
      name: 'New User'
    });
    
    expect(response.status).toBe(201);
  });
});
```

### What You Can Mock

- **Services** - Mock any service or provider
- **Repositories** - Override database repositories
- **Guards** - Control authorization logic (NestJS)
- **Middleware** - Modify request/response flow
- **Authentication** - Test with different user roles and permissions
- **External APIs** - Mock third-party integrations

### Integration with NestJS

```bash
npm install @soapjs/integr8-nestjs
```

```typescript
// app.module.ts
import { Integr8TestModule } from '@soapjs/integr8-nestjs';

@Module({
  imports: [
    ...(process.env.NODE_ENV === 'test' ? [Integr8TestModule] : [])
  ]
})
export class AppModule {}
```

```typescript
// main.ts
import { bootstrapNestJsIntegr8 } from '@soapjs/integr8-nestjs';

if (process.env.INTEGR8_MODE === 'true') {
  const app = await bootstrapNestJsIntegr8(AppModule);
  await app.listen(3000);
}
```

See [NestJS Integration Example](./examples/nestjs-integration/) for complete setup.

## Automatic Database Seeding

Integr8 provides **automatic database seeding** that works transparently in the background - no manual hooks needed!

### How It Works

When you configure seeding in your database config, Integr8 automatically:
1. Detects your seeding strategy
2. Registers global test hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`)
3. Tracks test files and individual tests
4. Executes seeding at the right time based on your strategy
5. Restores database state automatically

**You just write clean tests** - the framework handles everything in the background!

### Configuration

```json
{
  "databases": [
    {
      "name": "postgres",
      "type": "postgres",
      "dbStrategy": "savepoint",
      "seed": {
        "strategy": "per-file",        // once | per-file | per-test
        "command": "npm run seed",     // Command to run
        "timeout": 30000,              // Timeout in ms
        "restore": "rollback"          // none | rollback | reset | snapshot
      }
    }
  ]
}
```

### Seeding Strategies

#### `once` - Seed Once for All Tests
```json
{ "seed": { "strategy": "once" } }
```
- ⚡⚡⚡⚡⚡ Fastest - seeds only once
- Best for read-only tests
- No isolation between tests

#### `per-file` - Seed Per Test File (Default)
```json
{ "seed": { "strategy": "per-file" } }
```
- ⚡⚡⚡⚡ Fast - seeds once per file
- Good isolation between files
- Best for most use cases

#### `per-test` - Seed Per Individual Test
```json
{ "seed": { "strategy": "per-test" } }
```
- ⚡⚡⚡ Slower - seeds before each test
- Full isolation between tests
- Best for tests that modify data heavily

### Clean Test Code

No need for manual seeding calls! Just write clean tests:

```typescript
import { setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

describe('My API Tests', () => {
  beforeAll(async () => {
    const config = require('./integr8.config.json');
    await setupEnvironment(config);  // That's it! Seeding is automatic
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should work with seeded data', async () => {
    // Data is automatically seeded based on your strategy
    // Just write your test logic!
  });
});
```

The framework automatically:
- Seeds data before your tests (based on strategy)
- Restores state after tests (based on restore setting)
- Manages everything in the background

## Logging Control

Integr8 provides fine-grained logging control for each service:

### Service-Level Logging


### Log Levels Hierarchy
- `error` - Only errors
- `warn` - Warnings and errors  
- `log` - Log, warnings, errors (default)
- `info` - Info, log, warnings, errors
- `debug` - Everything (most verbose)

### Examples

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": "debug"          // Verbose database logs
    },
    {
      "name": "app", 
      "type": "service",
      "logging": "warn"           // Only warnings and errors
    },
    {
      "name": "redis",
      "type": "redis",
      "logging": false            // No logs
    }
  ]
}
```

## CLI Commands

### Environment Management
```bash
# Start environment
npx integr8 up

# Fast start (skip health checks)
npx integr8 up --fast

# Stop environment
npx integr8 down
```

### Test Execution
```bash
# Run all tests
npx integr8 run

# Run specific tests
npx integr8 run --pattern "users.*"

# Watch mode
npx integr8 run --watch

# CI mode (up + run + down)
npx integr8 ci
```

### Test Generation
```bash
# Scan endpoints and generate tests (uses config endpointDiscovery.command)
npx integr8 scan

# Scan with custom command and timeout
npx integr8 scan --command "npm run list-routes" --timeout 10000

# Scan from JSON file
npx integr8 scan --json endpoints.json

# Generate only new tests (skip existing)
npx integr8 scan --type only-new

# Scan and generate tests based on decorators
npx integr8 scan --decorators --generate-tests
```

### Test Creation
```bash
# Create tests from JSON file with URLs (auto-detects baseUrl from config)
npx integr8 create --urls endpoints.json --test-directory tests

# Create single test with parameters
npx integr8 create --url "http://localhost:3000/api/users" --method GET --expectedStatus 200

# Create POST test with body and expected response
npx integr8 create --url "http://localhost:3000/api/users" --method POST --body '{"name": "John", "age": 30}' --expectedStatus 201 --expectedResponse '{"id": 1, "name": "John"}'

# Create test with query parameters
npx integr8 create --url "http://localhost:3000/api/users" --method GET --queryParams '{"page": 1, "limit": 10}' --expectedStatus 200
```

## 📚 Documentation

For detailed guides and explanations, check out our documentation:

- **[Configuration Discovery](./docs/config-discovery.md)** - Auto-detection of config files
- **[Coverage Analysis](./docs/coverage.md)** - Endpoint test coverage tracking
- **[Override System Guide](./docs/override-system.md)** - Dynamic mocking and component override system
- **[Database Strategies Guide](./docs/database-strategies.md)** - Complete explanation of database isolation strategies
- **[Scan Configuration](./docs/scan-configuration.md)** - Endpoint scanning configuration and examples
- **[Seeding Strategies](./docs/seeding-database.md)** - Database seeding examples and strategies

### Examples

- **[NestJS Integration](./examples/nestjs-integration/)** - Complete NestJS setup with override system
- **[Express Integration](./examples/express-integration/)** - Complete Express.js setup with override system

### Framework Packages

- **[@soapjs/integr8-nestjs](https://github.com/soapjs/integr8-nestjs)** - NestJS integration package
- **[@soapjs/integr8-express](https://github.com/soapjs/integr8-express)** - Express.js integration package

## License

MIT License

## Contact

**Radoslaw Kamysz**  
Email: radoslaw.kamysz@gmail.com
