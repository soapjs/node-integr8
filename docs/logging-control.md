# Logging Control Guide

## What is Logging Control?

When you run tests with Integr8, you'll see various log messages from different services (databases, your application, etc.). Logging control lets you decide which messages you want to see and which ones you want to hide.

Think of it like adjusting the volume on different TV channels - you can turn up the volume for important channels and mute the ones you don't need.

## Why Control Logging?

### Too Much Noise
Without logging control, you might see hundreds of log messages like:
```
2025-09-25T12:17:10.910Z [postgres] [DEBUG] Executing SQL: SELECT * FROM users
2025-09-25T12:17:10.911Z [postgres] [DEBUG] Created savepoint: sp_worker_1_1234567890
2025-09-25T12:17:10.912Z [redis] [INFO] Connected to Redis server
2025-09-25T12:17:10.913Z [app] [DEBUG] Processing request: GET /api/users
```

This can make it hard to see the important information you actually need.

### Focus on What Matters
With logging control, you can:
- See only errors when everything is working fine
- Get detailed debug information when troubleshooting
- Hide database noise and focus on your application logs
- Different settings for different services

## Log Levels Explained

### Error Level (`"error"`)
**Shows:** Only error messages
**Use when:** Everything is working and you only want to see problems

```
2025-09-25T12:17:10.910Z [postgres] [ERROR] Connection failed: timeout
```

### Warning Level (`"warn"`)
**Shows:** Warnings and errors
**Use when:** You want to see potential issues but not routine operations

```
2025-09-25T12:17:10.910Z [postgres] [WARN] Slow query detected: 2.5s
2025-09-25T12:17:10.911Z [postgres] [ERROR] Connection failed: timeout
```

### Log Level (`"log"`) - Default
**Shows:** General logs, warnings, and errors
**Use when:** You want to see what's happening but not every detail

```
2025-09-25T12:17:10.910Z [postgres] [LOG] Database initialized
2025-09-25T12:17:10.911Z [postgres] [WARN] Slow query detected: 2.5s
2025-09-25T12:17:10.912Z [postgres] [ERROR] Connection failed: timeout
```

### Info Level (`"info"`)
**Shows:** Informational messages, logs, warnings, and errors
**Use when:** You want to see important events and status updates

```
2025-09-25T12:17:10.910Z [postgres] [INFO] Starting database connection
2025-09-25T12:17:10.911Z [postgres] [LOG] Database initialized
2025-09-25T12:17:10.912Z [postgres] [WARN] Slow query detected: 2.5s
2025-09-25T12:17:10.913Z [postgres] [ERROR] Connection failed: timeout
```

### Debug Level (`"debug"`)
**Shows:** Everything - all log messages
**Use when:** You're troubleshooting and need to see every detail

```
2025-09-25T12:17:10.910Z [postgres] [DEBUG] Creating connection pool
2025-09-25T12:17:10.911Z [postgres] [INFO] Starting database connection
2025-09-25T12:17:10.912Z [postgres] [LOG] Database initialized
2025-09-25T12:17:10.913Z [postgres] [DEBUG] Executing SQL: SELECT * FROM users
2025-09-25T12:17:10.914Z [postgres] [WARN] Slow query detected: 2.5s
2025-09-25T12:17:10.915Z [postgres] [ERROR] Connection failed: timeout
```

### Disabled (`false`)
**Shows:** Nothing
**Use when:** You want complete silence from a service

```
(no output)
```

## Configuration Examples

### Quiet Development Setup
Perfect for when you're coding and don't want distractions:

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": "warn"
    },
    {
      "name": "app",
      "type": "service",
      "logging": "log"
    },
    {
      "name": "redis",
      "type": "redis",
      "logging": false
    }
  ]
}
```

**Result:** You'll only see warnings/errors from the database, normal logs from your app, and nothing from Redis.

### Debugging Setup
When something's broken and you need to see everything:

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": "debug"
    },
    {
      "name": "app",
      "type": "service",
      "logging": "debug"
    },
    {
      "name": "redis",
      "type": "redis",
      "logging": "info"
    }
  ]
}
```

**Result:** You'll see every single log message from all services.

### Production-like Setup
Minimal logging for CI/CD or production-like testing:

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": "error"
    },
    {
      "name": "app",
      "type": "service",
      "logging": "warn"
    },
    {
      "name": "redis",
      "type": "redis",
      "logging": false
    }
  ]
}
```

**Result:** Only errors and warnings - perfect for automated testing.

### Mixed Setup
Different levels for different needs:

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": "info"
    },
    {
      "name": "app",
      "type": "service",
      "logging": "debug"
    },
    {
      "name": "mailhog",
      "type": "mailhog",
      "logging": false
    },
    {
      "name": "redis",
      "type": "redis",
      "logging": "warn"
    }
  ]
}
```

**Result:** 
- Database: Important events and status updates
- App: Everything (you're probably debugging your app)
- Mailhog: Silent (you don't care about email logs)
- Redis: Only warnings and errors

## Log Format Explained

Each log message follows this format:
```
TIMESTAMP [SERVICE-NAME] [LEVEL] Message
```

**Example:**
```
2025-09-25T12:17:10.910Z [postgres] [INFO] Database connection established
```

- **TIMESTAMP:** When the log was created (ISO format)
- **SERVICE-NAME:** Which service created the log (postgres, app, redis, etc.)
- **LEVEL:** How important the message is (DEBUG, INFO, LOG, WARN, ERROR)
- **Message:** What actually happened

## Common Scenarios

### Scenario 1: "My tests are too noisy"
**Problem:** You see hundreds of database query logs
**Solution:** Set database logging to `"warn"` or `"error"`

```json
{
  "name": "postgres",
  "type": "postgres",
  "logging": "warn"
}
```

### Scenario 2: "I can't see what my app is doing"
**Problem:** You need to debug your application logic
**Solution:** Set app logging to `"debug"`

```json
{
  "name": "app",
  "type": "service",
  "logging": "debug"
}
```

### Scenario 3: "I only want to see problems"
**Problem:** You want a clean output with only issues
**Solution:** Set all services to `"error"` or `"warn"`

```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "logging": "error"
    },
    {
      "name": "app",
      "type": "service",
      "logging": "error"
    }
  ]
}
```

### Scenario 4: "I'm debugging a database issue"
**Problem:** You need to see all database operations
**Solution:** Set database logging to `"debug"`

```json
{
  "name": "postgres",
  "type": "postgres",
  "logging": "debug"
}
```

## Tips and Best Practices

### 1. Start Simple
Begin with default settings (no logging config) and adjust as needed.

### 2. Use Different Levels for Different Services
You don't need the same level for all services. Be selective.

### 3. Adjust Based on What You're Doing
- **Coding:** Use `"warn"` or `"error"` for quiet development
- **Debugging:** Use `"debug"` for the service you're investigating
- **CI/CD:** Use `"error"` for clean automated test output

### 4. Don't Be Afraid to Change
You can easily change logging levels as your needs change. It's just a configuration change.

### 5. Use Environment-Specific Configs
Create different config files for different environments:
- `integr8.dev.config.json` - Debug logging for development
- `integr8.ci.config.json` - Error-only logging for CI/CD
- `integr8.debug.config.json` - Full debug logging for troubleshooting

## Quick Reference

| Level | Shows | Use When |
|-------|-------|----------|
| `false` | Nothing | You want silence |
| `"error"` | Only errors | Everything works, show only problems |
| `"warn"` | Warnings + errors | You want to see potential issues |
| `"log"` | General + warnings + errors | Default - shows what's happening |
| `"info"` | Info + general + warnings + errors | You want status updates |
| `"debug"` | Everything | You're troubleshooting |
| `true` | Everything (same as debug) | You want maximum verbosity |

Remember: You can always adjust these settings as your needs change!
