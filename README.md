# @SoapJS/Integr8

**Framework-agnostic integration testing with real services, databases, and containers.**

Test your APIs against real PostgreSQL, Redis, Kafka, and more - without mocking. Built on Testcontainers for reliable, reproducible tests.

[![npm version](https://img.shields.io/npm/v/@soapjs/integr8.svg)](https://www.npmjs.com/package/@soapjs/integr8)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **Beta**: Currently in active development. API is stable but new features are being added.

## Why Integr8?

- **Real Environment Testing** - Spin up actual databases and services with Docker
- **Deterministic Tests** - Smart database isolation strategies (savepoints, schemas, snapshots)
- **Framework Agnostic** - Works with Express, NestJS, Fastify, or vanilla Node.js
- **Coverage Analysis** - Track which endpoints are tested and enforce thresholds
- **Auto-Discovery** - Scan decorators or routes to generate tests automatically
- **Fast Execution** - Parallel testing with isolated environments per worker
- **Dynamic Overrides** - Mock external services without touching your code

## Installation

```bash
npm install --save-dev @soapjs/integr8
```

### Framework Adapters (Optional)

For better integration with your framework:

```bash
# NestJS
npm install --save-dev @soapjs/integr8-nestjs

# Express
npm install --save-dev @soapjs/integr8-express
```

## Quick Start

### 1. Initialize

```bash
npx integr8 init --interactive
```

This creates:
- `integr8.api.config.js` - Configuration file
- `.gitignore` entries

### 2. Write Your First Test

```typescript
import { setupEnvironment, teardownEnvironment, getEnvironmentContext } from '@soapjs/integr8';

beforeAll(async () => {
  await setupEnvironment(require('../../integr8.api.config.js'));
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('GET /users', () => {
  it('should return list of users', async () => {
    const ctx = getEnvironmentContext();
    
    const response = await ctx.getHttp().get('/users');
    
    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Array);
  });
});
```

### 3. Start Environment & Run Tests

```bash
# Start all services (app, databases, etc.)
npx integr8 up

# Run tests
npx integr8 test

# Stop environment
npx integr8 down
```

## Documentation

### Getting Started
- [Configuration Guide](./docs/configuration.md) - How to configure services, databases, and more
- [Writing Tests](./docs/writing-tests.md) - Test patterns and best practices
- [CLI Commands](./docs/cli-commands.md) - Complete command reference

### Advanced Features
- [Database Strategies](./docs/database-strategies.md) - Isolation strategies (savepoint, schema, snapshot)
- [Seeding](./docs/seeding-database.md) - Database seeding strategies
- [Coverage Analysis](./docs/coverage.md) - Track endpoint test coverage
- [Scanning & Discovery](./docs/scan-configuration.md) - Auto-discover endpoints
- [Override System](./docs/override-system.md) - Mock services and dependencies
- [Logging](./docs/logging.md) - Configure logging levels

### Integration Guides
- [NestJS Integration](./docs/nestjs-integration.md) - Using with NestJS
- [Express Integration](./docs/express-integration.md) - Using with Express
- [Decorator Scanning](./docs/decorator-scanning.md) - Auto-scan NestJS controllers

## Core Concepts

### Test Types

Integr8 supports multiple test levels:

- **API Tests** - Test HTTP endpoints with real services
- **Component Tests** - Test individual components with dependencies (coming soon)
- **E2E Tests** - Full end-to-end user flows (coming soon)
- **Inter-Service Tests** - Multi-service communication testing (coming soon)

### Database Isolation

Choose the right strategy for your tests:

- **Savepoint** - Fast rollbacks (default)
- **Schema** - Isolated schemas per test
- **Database** - Separate database per test
- **Snapshot** - Filesystem-level snapshots

[Learn more →](./docs/database-strategies.md)

### Seeding Strategies

- **Once** - Seed once at startup
- **Per-File** - Seed before each test file
- **Per-Test** - Seed before each test

[Learn more →](./docs/seeding-database.md)

## 🛠️ CLI Commands

### Environment Management

```bash
integr8 up              # Start test environment
integr8 down            # Stop test environment
integr8 cleanup         # Clean up orphaned containers
```

### Testing

```bash
integr8 test            # Run integration tests
integr8 test --watch    # Run in watch mode
integr8 ci              # Run in CI mode (up → test → down)
```

### Code Generation

```bash
integr8 scan  # Discover endpoints
integr8 scan --decorators --generate-tests  # Auto-generate tests
integr8 create --url /users --method GET  # Create test for endpoint
```

### Analysis

```bash
integr8 coverage   # Analyze endpoint coverage
integr8 coverage --threshold 80   # Enforce coverage threshold
```

[Full command reference →](./docs/cli-commands.md)

## Example Configuration

```javascript
module.exports = {
  testType: "api",
  testDir: "integr8/tests/api",
  
  services: [
    {
      name: "app",
      mode: "local",
      http: {
        port: 3000,
        prefix: "/api"
      },
      local: {
        command: "npm start"
      }
    }
  ],
  
  databases: [
    {
      name: "postgres",
      type: "postgres",
      mode: "container",
      isolation: "savepoint",
      container: {
        image: "postgres:15",
        ports: [{ host: 5432, container: 5432 }],
        environment: {
          POSTGRES_DB: "testdb",
          POSTGRES_USER: "test",
          POSTGRES_PASSWORD: "test"
        }
      }
    }
  ]
};
```

## Current Features

**Supported Services**
- HTTP/REST APIs (Express, NestJS, Fastify)
- PostgreSQL, MySQL, MongoDB
- Redis, Memcached
- RabbitMQ, Kafka
- Local processes or Docker containers

**Testing Features**
- API endpoint testing
- Database state management
- Parallel test execution
- Service health checks
- Environment isolation
- Auto-discovery (decorators & routes)
- Coverage analysis
- Test generation

**Developer Experience**
- Interactive CLI setup
- Colored terminal output
- Watch mode for tests
- CI/CD ready
- TypeScript support

## Roadmap

### (Near Future)
- [ ] WebSocket support
- [ ] gRPC client integration
- [ ] GraphQL endpoint testing
- [ ] Component-level tests (intra-service)
- [ ] Enhanced seeding with fixtures
- [ ] Inter-service testing
- [ ] Contract testing
- [ ] Service mesh support
- [ ] Performance/Load testing

### v1.0.0
- [ ] Scenario DSL
- [ ] Advanced chaos testing
- [ ] Full E2E with browser automation
- [ ] Multi-protocol support (HTTP, WS, gRPC, GraphQL)

[See full roadmap →](./docs/roadmap.md)

## License

MIT © [SoapJS](https://github.com/soapjs)

## Related Packages

- [@soapjs/integr8-nestjs](https://www.npmjs.com/package/@soapjs/integr8-nestjs) - NestJS adapter with decorator scanning
- [@soapjs/integr8-express](https://www.npmjs.com/package/@soapjs/integr8-express) - Express adapter with route discovery

## Support

- [Documentation](./docs)
- [Issue Tracker](https://github.com/soapjs/node-integr8/issues)
- [Discussions](https://github.com/soapjs/node-integr8/discussions)
- [SoapJS Docs](https://docs.soapjs.com)

## Author

**Radosław Kamysz**
- Email: radoslaw.kamysz@gmail.com
- GitHub: [@soapjs](https://github.com/soapjs)
- Website: [soapjs.com](https://soapjs.com)

---

Made with ❤️ by the SoapJS team
