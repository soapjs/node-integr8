# SoapJS Integr8

Framework-agnostic integration testing with Testcontainers. Test your APIs against real databases and services without mocking.

> ⚠️ **Work in Progress** - Currently in development towards v1.0.0.

## What is Integr8?

Integr8 is a powerful testing framework that solves the problem of flaky, unreliable integration tests by providing:

- **Real Environment Testing**: Spin up your entire application stack with Testcontainers
- **Database State Management**: Smart strategies for deterministic test isolation
- **Framework Agnostic**: Works with Express, NestJS, Fastify, and more
- **Override System**: Mock external services while keeping real database
- **Parallel Testing**: Isolated environments for each test worker
- **CLI Tools**: Easy setup and management with clean, colored output

## What Problems Does It Solve?

- **Deterministic Tests**: No more flaky tests due to shared database state
- **Real API Testing**: Test against actual HTTP endpoints, not mocks
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
# Local development
npx integr8 init --app-type local

# Docker Compose
npx integr8 init --app-type docker-compose

# Container only
npx integr8 init --app-type container
```

### 2. Configure

Edit `integr8.api.config.json`:

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "testdb",
        "POSTGRES_USER": "testuser",
        "POSTGRES_PASSWORD": "testpass"
      },
      "dbStrategy": "savepoint",
      "seed": {
        "command": "npm run seed"
      }
    },
    {
      "name": "app",
      "type": "service",
      "image": "my-app:latest",
      "command": "npm start",
      "ports": [3000],
      "healthcheck": {
        "command": "curl -f http://localhost:3000/health",
        "interval": 1000,
        "timeout": 30000,
        "retries": 3
      },
      "dependsOn": ["postgres"]
    }
  ],
  "adapters": [
    { "type": "express" }
  ],
  "testDirectory": "tests"
}
```

### 3. Generate Tests

```bash
# Generate test templates from your routes
npx integr8 generate --command "npx soap list-routes" --scenarios

# Add individual endpoints as needed
npx integr8 add-endpoint "GET /users/:id" --scenarios
```

### 4. Run Tests

```bash
# Start environment
npx integr8 up

# Run tests (detects existing environment)
npx integr8 run

# Stop environment
npx integr8 down
```

## Configuration Examples

### Docker Compose Setup

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "testdb",
        "POSTGRES_USER": "testuser",
        "POSTGRES_PASSWORD": "testpass"
      },
      "dbStrategy": "savepoint",
      "seed": {
        "command": "npm run seed"
      }
    },
    {
      "name": "app",
      "type": "service",
      "image": "my-app:latest",
      "command": "npm start",
      "ports": [3000],
      "healthcheck": {
        "command": "curl -f http://localhost:3000/health",
        "interval": 1000,
        "timeout": 30000,
        "retries": 3
      },
      "dependsOn": ["postgres"]
    }
  ],
  "adapters": [
    { "type": "express" }
  ],
  "testDirectory": "tests"
}
```

### Local Development Setup

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "testdb",
        "POSTGRES_USER": "testuser",
        "POSTGRES_PASSWORD": "testpass"
      },
      "dbStrategy": "savepoint",
      "seed": {
        "command": "npm run seed"
      }
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm start",
      "ports": [3000],
      "workingDirectory": ".",
      "healthcheck": {
        "command": "curl -f http://localhost:3000/health",
        "interval": 1000,
        "timeout": 30000,
        "retries": 3
      },
      "dependsOn": ["postgres"]
    }
  ],
  "adapters": [
    { "type": "express" }
  ],
  "testDirectory": "tests"
}
```

### Multiple Services Setup

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "testdb",
        "POSTGRES_USER": "testuser",
        "POSTGRES_PASSWORD": "testpass"
      },
      "dbStrategy": "savepoint",
      "seed": {
        "command": "npm run seed"
      }
    },
    {
      "name": "redis",
      "type": "redis",
      "image": "redis:7-alpine",
      "ports": [6379]
    },
    {
      "name": "mailhog",
      "type": "mailhog",
      "image": "mailhog/mailhog:latest",
      "ports": [1025, 8025]
    },
    {
      "name": "app",
      "type": "service",
      "image": "my-app:latest",
      "command": "npm start",
      "ports": [3000],
      "healthcheck": {
        "command": "curl -f http://localhost:3000/health",
        "interval": 1000,
        "timeout": 30000,
        "retries": 3
      },
      "dependsOn": ["postgres", "redis", "mailhog"]
    }
  ],
  "adapters": [
    { "type": "express" }
  ],
  "testDirectory": "tests"
}
```

## Database Strategies

Integr8 provides different database isolation strategies:

### Savepoint Strategy (Fastest)
```json
{
  "dbStrategy": "savepoint"
}
```
- ⚡⚡⚡⚡⚡ Fastest (~1ms setup)
- Uses transaction rollbacks
- Best for: Development, Unit Tests

### Schema Strategy (Balanced)
```json
{
  "dbStrategy": "schema"
}
```
- ⚡⚡⚡⚡ Good speed (~50ms setup)
- Separate schemas per test
- Best for: Integration Tests

### Database Strategy (Isolated)
```json
{
  "dbStrategy": "database"
}
```
- ⚡⚡⚡ Slower (~200ms setup)
- New database per test
- Best for: E2E Tests, MongoDB

### Snapshot Strategy (Universal)
```json
{
  "dbStrategy": "snapshot"
}
```
- ⚡⚡ Slowest (~1000ms setup)
- Volume snapshots
- Best for: Complex scenarios

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
# Generate from routes
npx integr8 generate --command "npx soap list-routes" --scenarios

# Add single endpoint
npx integr8 add-endpoint "GET /users/:id" --scenarios
```

## NestJS Users

If you're using NestJS, check out the dedicated version with enhanced NestJS support:

**[@soapjs/integr8-nestjs](https://www.npmjs.com/package/@soapjs/integr8-nestjs)**

## License

MIT License

## Contact

**Radoslaw Kamysz**  
Email: radoslaw.kamysz@gmail.com
