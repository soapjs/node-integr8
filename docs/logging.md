# Logging

Configure logging for debugging and monitoring your integration tests.

## Basic Configuration

In your `integr8.config.js`:

```javascript
module.exports = {
  logging: {
    level: "info",        // Log level
    enabled: true,        // Enable/disable logging
    format: "text"        // Output format
  }
};
```

## Log Levels

Available log levels (in order of verbosity):

| Level | When to Use | Output |
|-------|-------------|--------|
| `error` | Only errors | Errors only |
| `warn` | Warnings and errors | Warnings + Errors |
| `log` | Standard logging | Standard messages + Warn + Error |
| `info` | Informational | Info + Log + Warn + Error |
| `debug` | Detailed debugging | Everything |

### Example

```javascript
logging: {
  level: "debug",    // Show all logs
  enabled: true
}
```

## Per-Service Logging

Configure logging for individual services:

```javascript
services: [
  {
    name: "app",
    logging: {
      level: "debug",
      enabled: true
    }
  }
],

databases: [
  {
    name: "postgres",
    logging: {
      level: "warn",     // Only warnings for DB
      enabled: true
    }
  }
]
```

## Log Output

### Standard Format (Text)

```
2025-10-09T10:30:45.123Z [app] [INFO] Starting service...
2025-10-09T10:30:46.456Z [postgres] [DEBUG] Creating savepoint sp_1
2025-10-09T10:30:47.789Z [app] [INFO] Service ready at http://localhost:3000
```

### JSON Format

```javascript
logging: {
  level: "info",
  format: "json"
}
```

Output:

```json
{
  "timestamp": "2025-10-09T10:30:45.123Z",
  "service": "app",
  "level": "INFO",
  "message": "Starting service..."
}
```

## Debugging Tests

### Enable Debug Logging

```javascript
logging: {
  level: "debug",
  enabled: true
}
```

### What You'll See

```
[DEBUG] Reading config from integr8.api.config.js
[DEBUG] Starting database orchestrator...
[DEBUG] Creating container for postgres
[DEBUG] Waiting for postgres to be ready...
[DEBUG] Health check: GET http://localhost:3000/health
[DEBUG] All services ready
[INFO] Starting test: should create user
[DEBUG] Executing query: INSERT INTO users...
[DEBUG] Creating savepoint sp_1
[INFO] Test passed ✓
```

## Selective Logging

### Disable Logging for Specific Services

```javascript
services: [
  {
    name: "app",
    logging: {
      enabled: true,
      level: "info"
    }
  },
  {
    name: "background-worker",
    logging: {
      enabled: false    // No logs for this service
    }
  }
]
```

### Log Only Errors

```javascript
logging: {
  level: "error",    // Only show errors
  enabled: true
}
```

## Environment Variables

Override logging via environment variables:

```bash
# Set log level
INTEGR8_LOG_LEVEL=debug integr8 up

# Disable logging
INTEGR8_LOG_ENABLED=false integr8 test
```

## Programmatic Logging

In your tests, you can use the logger:

```typescript
import { getEnvironmentContext } from '@soapjs/integr8';

it('should do something', async () => {
  const ctx = getEnvironmentContext();
  const logger = ctx.getLogger();
  
  logger.debug('Starting test operation');
  logger.info('Processing user data');
  logger.warn('Slow query detected');
  logger.error('Operation failed');
});
```

## Log Files

### Redirect to File

```bash
integr8 test > test.log 2>&1
```

### JSON Logs for Analysis

```javascript
logging: {
  level: "info",
  format: "json",
  output: "logs/integr8.json"
}
```

Then analyze with tools like:
- `jq` for command-line parsing
- ELK stack for log aggregation
- CloudWatch, Datadog, etc.

## Common Scenarios

### Production-like Logging

```javascript
logging: {
  level: "warn",     // Only warnings and errors
  format: "json",    // Structured logs
  enabled: true
}
```

### Development Debugging

```javascript
logging: {
  level: "debug",    // All details
  format: "text",    // Human-readable
  enabled: true
}
```

### CI/CD

```javascript
logging: {
  level: "info",     // Informational
  format: "text",    // Easy to read in CI logs
  enabled: true
}
```

### Silent Mode

```javascript
logging: {
  enabled: false     // No logs
}
```

## Tips

- **Use `debug` during development** - See exactly what's happening
- **Use `info` in CI** - Balance between visibility and noise
- **Use `error` in production** - Keep logs clean
- **Use JSON format for log aggregation** - Easy to parse
- **Disable logging for performance tests** - Reduce overhead

## Next Steps

- [Configuration Guide](./configuration.md)
- [Writing Tests](./writing-tests.md)
- [CLI Commands](./cli-commands.md)

