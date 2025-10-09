# Testing Seeding Strategies

This document describes how to test different seeding strategies in integr8.

## How It Works

The framework **automatically** manages seeding based on the selected strategy. When you call `setupEnvironment()`, the framework:

1. **Analyzes configuration** - checks which databases have seeding configured
2. **Registers global hooks** - automatically adds `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
3. **Tracks test context** - knows which file and test are currently executing
4. **Executes seeding in background** - according to strategy, without interfering with test code
5. **Restores state** - automatic rollback/reset according to configuration

**You don't need to do anything** - just call `setupEnvironment()` with appropriate configuration!

## Available Strategies

### 1. `once` - Once for All Tests
- **Description**: Seed run once before all tests from all files
- **Advantages**: Fastest, minimal database load
- **Disadvantages**: No isolation between tests, tests can affect each other
- **Use Case**: Ideal for tests that don't modify data
- **Automatic Behavior**: Framework seeds once at first `beforeAll`, skips subsequent ones

### 2. `per-file` - Once Per Test File
- **Description**: Seed run once before each test file
- **Advantages**: Good isolation between files, moderate speed
- **Disadvantages**: Tests in the same file can affect each other
- **Use Case**: Most commonly used strategy (default)
- **Automatic Behavior**: Framework seeds in `beforeAll` for each file

### 3. `per-test` - Once Per Test
- **Description**: Seed run before each test
- **Advantages**: Full isolation between tests
- **Disadvantages**: Slowest, high database load
- **Use Case**: For tests that heavily modify data
- **Automatic Behavior**: Framework seeds in `beforeEach` before each test

## Test Files

### Configuration
```json
{
  "services": [
    {
      "name": "postgres",
      "type": "postgres",
      "isolation": "savepoint",
      "seed": {
        "strategy": "once",
        "command": "node examples/simple-seed.js",
        "timeout": 10000
      }
    }
  ]
}
```

### Example Tests

**IMPORTANT**: The framework automatically manages seeding in the background based on the selected strategy. You don't need to manually call functions like `seedForFile`, `seedForTest`, etc. in your tests!

#### Testing 'once' Strategy
```typescript
// test-once-strategy.test.ts
import { setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

describe('Once Strategy Tests', () => {
  beforeAll(async () => {
    const config = require('./seeding-test.config.json');
    await setupEnvironment(config);
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  // Note: No need to manually call seeding!
  // Framework automatically handles it in the background

  test('should have seeded data', async () => {
    // Test automatically has access to data
    expect(true).toBe(true);
  });

  test('should still have the same data', async () => {
    // 'once' strategy - same data for all tests
    expect(true).toBe(true);
  });
});
```

#### Testing 'per-file' Strategy
```typescript
// test-per-file-strategy.test.ts
import { setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

describe('Per-File Strategy Tests', () => {
  beforeAll(async () => {
    const config = require('./seeding-test.config.json');
    config.services[0].seed.strategy = 'per-file';
    await setupEnvironment(config);
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  // Note: No need to manually call seeding!
  // Framework automatically handles it in the background

  test('should have fresh seeded data', async () => {
    // Test automatically has fresh data for this file
    expect(true).toBe(true);
  });

  test('should have the same data', async () => {
    // 'per-file' strategy - same data within the file
    expect(true).toBe(true);
  });
});
```

#### Testing 'per-test' Strategy
```typescript
// test-per-test-strategy.test.ts
import { setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

describe('Per-Test Strategy Tests', () => {
  beforeAll(async () => {
    const config = require('./seeding-test.config.json');
    config.services[0].seed.strategy = 'per-test';
    await setupEnvironment(config);
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  // Note: No need to manually call seeding!
  // Framework automatically handles it in the background

  test('should have fresh seeded data', async () => {
    // Test automatically has fresh data
    expect(true).toBe(true);
  });

  test('should have fresh data again', async () => {
    // 'per-test' strategy - fresh data for each test
    expect(true).toBe(true);
  });
});
```

## Test Scripts

### 1. Simple Seeding Script
```bash
# Run simple script
node examples/simple-seed.js
```

### 2. Comprehensive Strategy Test
```bash
# Run full strategy test
node examples/test-seeding.js
```

### 3. Test Specific Strategy
```bash
# Test 'once' strategy for file
node examples/test-seeding.js once file user.test.ts

# Test 'per-test' strategy for specific test
node examples/test-seeding.js per-test test user.test.ts "should create user"
```

## Running Tests

### 1. Prepare Environment
```bash
# Start test environment
npx integr8 up --config examples/seeding-test.config.json
```

### 2. Run Tests
```bash
# Run all seeding tests
npx integr8 test --config examples/seeding-test.config.json

# Run specific test
npx integr8 test --config examples/seeding-test.config.json --pattern "once-strategy"
```

### 3. Check Logs
Seeding logs contain:
- 🌱 Seeding start
- Seeding skipped (already executed)
- ✅ Seeding completed
- ❌ Seeding error
- Execution time
- Worker ID
- Seeding strategy

## Example Logs

### 'once' Strategy
```
🌱 Executing 'once' strategy for file: user.test.ts
🌱 Starting seeding for file: user.test.ts
   Strategy: once
   Worker ID: test-worker
🌱 Running seed command: node examples/simple-seed.js
✅ Seed command completed successfully in 1250ms
✅ Seeding completed for file: user.test.ts in 1250ms

 Skipping 'once' strategy for file: product.test.ts (already seeded)
```

### 'per-file' Strategy
```
🌱 Executing 'per-file' strategy for file: user.test.ts
🌱 Starting seeding for file: user.test.ts
   Strategy: per-file
   Worker ID: test-worker
✅ Seeding completed for file: user.test.ts in 1200ms

🌱 Executing 'per-file' strategy for file: product.test.ts
🌱 Starting seeding for file: product.test.ts
   Strategy: per-file
   Worker ID: test-worker
✅ Seeding completed for file: product.test.ts in 1180ms
```

### 'per-test' Strategy
```
🌱 Executing 'per-test' strategy for test: should create user in file: user.test.ts
🌱 Starting seeding for test: should create user, user.test.ts
   Strategy: per-test
   Worker ID: test-worker
✅ Seeding completed for test: should create user, user.test.ts in 1150ms

🌱 Executing 'per-test' strategy for test: should update user in file: user.test.ts
🌱 Starting seeding for test: should update user, user.test.ts
   Strategy: per-test
   Worker ID: test-worker
✅ Seeding completed for test: should update user, user.test.ts in 1200ms
```

## Troubleshooting

### 1. Seeding Timeout
```json
{
  "seed": {
    "command": "node examples/simple-seed.js",
    "timeout": 30000
  }
}
```

### 2. Seeding Error
- Check if seeding script exists
- Check script execution permissions
- Check error logs in console

### 3. No Seeding Logs
- Make sure `seed.command` is configured
- Check if `DatabaseManager.initialize()` is being called
- Check if `SeedManager` is properly integrated

## Best Practices

1. **Use 'once' strategy** for tests that don't modify data
2. **Use 'per-file' strategy** as default for most tests
3. **Use 'per-test' strategy** only when you need full isolation
4. **Test strategies** before deploying to production
5. **Monitor execution times** of seeding
6. **Use timeouts** to avoid hanging tests
