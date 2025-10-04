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
  "testDir": "tests"
}
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
  "testDir": "tests"
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
  "testDir": "tests"
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
  "testDir": "tests"
}
```

## Database Strategies

Integr8 provides different database isolation strategies with intelligent recommendations:

> 📚 **New to database strategies?** Check out our [comprehensive guide](./docs/database-strategies.md) that explains everything in simple terms!

### 🎯 Smart Strategy Selection

The CLI now automatically shows only compatible strategies for your database type during interactive setup:

```bash
# Interactive setup now shows only compatible strategies
npx integr8 init --interactive
```

### Available Strategies

#### Savepoint Strategy (Fastest)
```json
{
  "dbStrategy": "savepoint"
}
```
- ⚡⚡⚡⚡⚡ Fastest (~1ms setup)
- Uses transaction rollbacks
- **Compatible with:** PostgreSQL, MySQL
- **Best for:** Development, Unit Tests

#### Schema Strategy (Balanced)
```json
{
  "dbStrategy": "schema"
}
```
- ⚡⚡⚡⚡ Good speed (~50ms setup)
- Separate schemas per test
- **Compatible with:** PostgreSQL, MySQL
- **Best for:** Integration Tests

#### Database Strategy (Isolated)
```json
{
  "dbStrategy": "database"
}
```
- ⚡⚡⚡ Slower (~200ms setup)
- New database per test
- **Compatible with:** PostgreSQL, MySQL, MongoDB
- **Best for:** E2E Tests, MongoDB

#### Snapshot Strategy (Universal)
```json
{
  "dbStrategy": "snapshot"
}
```
- ⚡⚡ Slowest (~1000ms setup)
- Volume snapshots
- **Compatible with:** PostgreSQL, MySQL, MongoDB
- **Best for:** Complex scenarios

#### Hybrid Strategies
- `hybrid-savepoint-schema` - Combine savepoints with schema isolation
- `hybrid-schema-database` - Combine schema with database isolation  
- `transactional-schema` - Use transactions within schemas

## Logging Control

Integr8 provides fine-grained logging control for each service:

> 📚 **Need help with logging?** Check out our [detailed logging guide](./docs/logging-control.md) with examples and best practices!

### Service-Level Logging

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": false,           // Disable all logs
      "logging": true,            // Enable all logs (debug level)
      "logging": "error",         // Only show errors
      "logging": "warn",          // Show warnings and errors
      "logging": "log",           // Show log, warn, error (default)
      "logging": "info",          // Show info, log, warn, error
      "logging": "debug"          // Show everything
    }
  ]
}
```

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

## Endpoint Discovery Configuration

Configure how integr8 discovers your API endpoints:

```json
{
  "endpointDiscovery": {
    "command": "npm run list-routes",
    "timeout": 10000
  }
}
```

- `command` - Command to run for endpoint discovery (default: "npm run list-routes")
- `timeout` - Timeout in milliseconds (default: 10000)

The command should output JSON array of endpoints with this structure:
```json
[
  {
    "method": "GET",
    "path": "/api/users",
    "resource": "users",
    "url": "http://localhost:3000/api/users",
    "description": "Get all users"
  },
  {
    "method": "POST",
    "path": "/api/users",
    "resource": "users",
    "url": "http://localhost:3000/api/users",
    "description": "Create new user"
  },
  {
    "method": "GET",
    "path": "/api/users/123",
    "resource": "users",
    "url": "http://localhost:3000/api/users/123",
    "description": "Get user by ID"
  }
]
```

**Required fields:**
- `method` - HTTP method (GET, POST, PUT, DELETE, etc.)
- `path` - API path (e.g., "/api/users")
- `url` - Full URL (e.g., "http://localhost:3000/api/users")

**Optional fields:**
- `resource` - Resource name for test file naming (e.g., "users"). If provided, test files will be named `users.get.api.test.ts`, `users.post.api.test.ts`, etc.
- `endpoint` - Explicit name for test file (fallback if resource not provided)
- `description` - Human-readable description
- `body` - Request body template
- `queryParams` - Query parameters template
- `pathParams` - Path parameters template
- `expectedStatus` - Expected HTTP status code
- `expectedResponse` - Expected response template

**Test file naming priority:**
1. `resource` field (e.g., "users" → `users.get.api.test.ts`)
2. `endpoint` field (e.g., "user-details" → `user-details.get.api.test.ts`)
3. Auto-generated from path (e.g., "/api/users" → `users.get.api.test.ts`)

## Test Creation with JSON Files

For the `create` command, you can provide a JSON file with detailed test configurations:

```json
[
  {
    "url": "http://localhost:3000/api/users",
    "method": "GET",
    "expectedStatus": 200,
    "description": "Get all users"
  },
  {
    "url": "http://localhost:3000/api/users",
    "method": "POST",
    "body": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "expectedStatus": 201,
    "expectedResponse": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "description": "Create new user"
  },
  {
    "url": "http://localhost:3000/api/users/123",
    "method": "GET",
    "pathParams": {
      "id": "123"
    },
    "queryParams": {
      "include": "profile"
    },
    "expectedStatus": 200,
    "description": "Get user by ID with profile"
  }
]
```

### JSON Configuration Options

- `url` - Full URL to test (required)
- `method` - HTTP method (default: GET)
- `body` - Request body as JSON object
- `queryParams` - Query parameters as JSON object
- `pathParams` - Path parameters as JSON object
- `expectedStatus` - Expected HTTP status code
- `expectedResponse` - Expected response as JSON object
- `description` - Test description

## BaseUrl Auto-Detection

The `create` command automatically detects the base URL from your configuration:

1. **HTTP Config**: Uses `http.baseUrl` if configured
2. **HTTP Port**: Uses `http.port` to build `http://localhost:PORT`
3. **Container Ports**: Uses first container port if available
4. **Fallback**: Defaults to `http://localhost:3000`

This means URLs like `http://localhost:3000/api/users` will be normalized to `/api/users` for test file generation.

## 📚 Documentation

For detailed guides and explanations, check out our documentation:

- **[Database Strategies Guide](./docs/database-strategies.md)** - Complete explanation of database isolation strategies
- **[Logging Control Guide](./docs/logging-control.md)** - How to control log output for each service
- **[Configuration Examples](./docs/configuration-examples.md)** - Real-world configuration examples
- **[Documentation Index](./docs/README.md)** - Overview of all available guides

## NestJS Users

If you're using NestJS, check out the dedicated version with enhanced NestJS support:

**[@soapjs/integr8-nestjs](https://www.npmjs.com/package/@soapjs/integr8-nestjs)**

## License

MIT License

## Contact

**Radoslaw Kamysz**  
Email: radoslaw.kamysz@gmail.com
