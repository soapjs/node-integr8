# Configuration Examples

This guide provides real-world configuration examples for different scenarios and use cases.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Development Configurations](#development-configurations)
- [CI/CD Configurations](#cicd-configurations)
- [Debugging Configurations](#debugging-configurations)
- [Multi-Service Configurations](#multi-service-configurations)
- [Database-Specific Configurations](#database-specific-configurations)

## Basic Setup

### Minimal Configuration
Perfect for getting started:

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
      "dbStrategy": "schema"
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm start",
      "ports": [3000],
      "dependsOn": ["postgres"]
    }
  ],
  "testDir": "tests"
}
```

## Development Configurations

### Quiet Development Setup
Minimal logging for focused development:

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
      "logging": "warn"
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm run dev",
      "ports": [3000],
      "dependsOn": ["postgres"],
      "logging": "log"
    }
  ],
  "testDir": "tests"
}
```

### Fast Development Setup
Optimized for speed during development:

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
      "logging": false
    },
    {
      "name": "redis",
      "type": "redis",
      "image": "redis:7-alpine",
      "ports": [6379],
      "logging": false
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm run dev",
      "ports": [3000],
      "dependsOn": ["postgres", "redis"],
      "logging": "warn"
    }
  ],
  "testDir": "tests"
}
```

## CI/CD Configurations

### Clean CI Setup
Minimal logging for clean CI output:

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
      "dbStrategy": "database",
      "logging": "error"
    },
    {
      "name": "app",
      "type": "service",
      "mode": "container",
      "image": "my-app:latest",
      "ports": [3000],
      "dependsOn": ["postgres"],
      "logging": "error"
    }
  ],
  "testDir": "tests",
  "testTimeout": 60000
}
```

### Robust CI Setup
Maximum isolation for reliable CI:

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
      "dbStrategy": "database",
      "logging": "error",
      "seed": {
        "command": "npm run seed:ci"
      }
    },
    {
      "name": "redis",
      "type": "redis",
      "image": "redis:7-alpine",
      "ports": [6379],
      "logging": false
    },
    {
      "name": "app",
      "type": "service",
      "mode": "container",
      "image": "my-app:latest",
      "ports": [3000],
      "dependsOn": ["postgres", "redis"],
      "logging": "error"
    }
  ],
  "testDir": "tests",
  "testTimeout": 120000,
  "setupTimeout": 30000
}
```

## Debugging Configurations

### Full Debug Setup
Maximum verbosity for troubleshooting:

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
      "dbStrategy": "database",
      "logging": "debug"
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm run dev",
      "ports": [3000],
      "dependsOn": ["postgres"],
      "logging": "debug"
    }
  ],
  "testDir": "tests"
}
```

### Targeted Debug Setup
Debug specific services only:

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
      "dbStrategy": "database",
      "logging": "debug"
    },
    {
      "name": "redis",
      "type": "redis",
      "image": "redis:7-alpine",
      "ports": [6379],
      "logging": "warn"
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm run dev",
      "ports": [3000],
      "dependsOn": ["postgres", "redis"],
      "logging": "log"
    }
  ],
  "testDir": "tests"
}
```

## Multi-Service Configurations

### Full Stack Application
Complete setup with all services:

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
      "dbStrategy": "schema",
      "logging": "info"
    },
    {
      "name": "redis",
      "type": "redis",
      "image": "redis:7-alpine",
      "ports": [6379],
      "logging": "warn"
    },
    {
      "name": "mailhog",
      "type": "mailhog",
      "image": "mailhog/mailhog:latest",
      "ports": [1025, 8025],
      "logging": false
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm start",
      "ports": [3000],
      "dependsOn": ["postgres", "redis", "mailhog"],
      "logging": "info"
    }
  ],
  "testDir": "tests"
}
```

### Microservices Setup
Multiple application services:

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
      "dbStrategy": "schema",
      "logging": "info"
    },
    {
      "name": "api",
      "type": "service",
      "mode": "local",
      "command": "npm run start:api",
      "ports": [3001],
      "dependsOn": ["postgres"],
      "logging": "info"
    },
    {
      "name": "worker",
      "type": "service",
      "mode": "local",
      "command": "npm run start:worker",
      "ports": [3002],
      "dependsOn": ["postgres"],
      "logging": "warn"
    },
    {
      "name": "frontend",
      "type": "service",
      "mode": "local",
      "command": "npm run start:frontend",
      "ports": [3000],
      "dependsOn": ["api"],
      "logging": "log"
    }
  ],
  "testDir": "tests"
}
```

## Database-Specific Configurations

### PostgreSQL with TypeORM
Full-featured PostgreSQL setup:

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
      "dbStrategy": "schema",
      "logging": "info",
      "seed": {
        "typeorm": {
          "entities": ["User", "Product", "Order"],
          "data": [
            { "User": { "name": "Test User", "email": "test@example.com" } }
          ],
          "clearBeforeSeed": true,
          "runMigrations": true
        }
      }
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm start",
      "ports": [3000],
      "dependsOn": ["postgres"],
      "logging": "info"
    }
  ],
  "adapters": [
    { "type": "typeorm" }
  ],
  "testDir": "tests"
}
```

### MongoDB Setup
MongoDB-specific configuration:

```json
{
  "services": [
    {
      "name": "mongo",
      "type": "mongo",
      "image": "mongo:7",
      "ports": [27017],
      "environment": {
        "MONGO_INITDB_DATABASE": "testdb",
        "MONGO_INITDB_ROOT_USERNAME": "testuser",
        "MONGO_INITDB_ROOT_PASSWORD": "testpass"
      },
      "dbStrategy": "database",
      "logging": "info",
      "seed": {
        "command": "npm run seed:mongo"
      }
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm start",
      "ports": [3000],
      "dependsOn": ["mongo"],
      "logging": "info"
    }
  ],
  "testDir": "tests"
}
```

### MySQL Setup
MySQL-specific configuration:

```json
{
  "services": [
    {
      "name": "mysql",
      "type": "mysql",
      "image": "mysql:8.0",
      "ports": [3306],
      "environment": {
        "MYSQL_DATABASE": "testdb",
        "MYSQL_USER": "testuser",
        "MYSQL_PASSWORD": "testpass",
        "MYSQL_ROOT_PASSWORD": "rootpass"
      },
      "dbStrategy": "schema",
      "logging": "info",
      "seed": {
        "command": "mysql -u testuser -ptestpass testdb < seed.sql"
      }
    },
    {
      "name": "app",
      "type": "service",
      "mode": "local",
      "command": "npm start",
      "ports": [3000],
      "dependsOn": ["mysql"],
      "logging": "info"
    }
  ],
  "testDir": "tests"
}
```

## Environment-Specific Configs

### Development Environment
```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "devdb",
        "POSTGRES_USER": "devuser",
        "POSTGRES_PASSWORD": "devpass"
      },
      "dbStrategy": "savepoint",
      "logging": "warn"
    }
  ],
  "testDir": "tests"
}
```

### Staging Environment
```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "stagingdb",
        "POSTGRES_USER": "staginguser",
        "POSTGRES_PASSWORD": "stagingpass"
      },
      "dbStrategy": "database",
      "logging": "error"
    }
  ],
  "testDir": "tests",
  "testTimeout": 60000
}
```

### Production-like Environment
```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "image": "postgres:15-alpine",
      "ports": [5432],
      "environment": {
        "POSTGRES_DB": "proddb",
        "POSTGRES_USER": "produser",
        "POSTGRES_PASSWORD": "prodpass"
      },
      "dbStrategy": "database",
      "logging": "error"
    }
  ],
  "testDir": "tests",
  "testTimeout": 120000,
  "setupTimeout": 30000,
  "teardownTimeout": 10000
}
```

## Tips for Configuration

### 1. Start Simple
Begin with the basic setup and add complexity as needed.

### 2. Use Environment Variables
```json
{
  "environment": {
    "POSTGRES_DB": "${DB_NAME:-testdb}",
    "POSTGRES_USER": "${DB_USER:-testuser}",
    "POSTGRES_PASSWORD": "${DB_PASSWORD:-testpass}"
  }
}
```

### 3. Separate Configs by Environment
- `integr8.dev.config.json` - Development
- `integr8.ci.config.json` - CI/CD
- `integr8.debug.config.json` - Debugging

### 4. Use Different Strategies for Different Needs
- Development: `savepoint` (fast)
- CI/CD: `database` (reliable)
- Debugging: `database` (isolated)

### 5. Adjust Logging Based on Context
- Development: `warn` or `error` (quiet)
- Debugging: `debug` (verbose)
- CI/CD: `error` (clean output)

## Need Help?

- Check the [Database Strategies Guide](./database-strategies.md) for strategy selection
- Read the [Logging Control Guide](./logging-control.md) for logging configuration
- Use the CLI recommendation tool: `npx integr8 suggest-strategy --database postgres`
