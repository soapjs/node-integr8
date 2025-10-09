# Writing Tests

This guide shows you how to write integration tests with Integr8.

## Basic Test Structure

```typescript
import { 
  setupEnvironment, 
  teardownEnvironment, 
  getEnvironmentContext 
} from '@soapjs/integr8';

// Setup - runs once before all tests
beforeAll(async () => {
  const config = require('../../integr8.api.config.js');
  await setupEnvironment(config);
});

// Teardown - runs once after all tests
afterAll(async () => {
  await teardownEnvironment();
});

describe('User API', () => {
  it('should create a user', async () => {
    const ctx = getEnvironmentContext();
    
    const response = await ctx.getHttp().post('/users', {
      name: 'John Doe',
      email: 'john@example.com'
    });
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
  });
});
```

## Environment Context

The context provides access to all services:

```typescript
const ctx = getEnvironmentContext();

// HTTP Client
const http = ctx.getHttp();           // Default 'app' service
const http = ctx.getHttp('api');      // Named service

// Database
const db = ctx.getDb('postgres');

// Messaging
const queue = ctx.getMessaging('rabbitmq');

// Storage
const storage = ctx.getStorage('s3');

// Test Context
const testCtx = ctx.getCtx();

// Event Bus
const bus = ctx.getBus();

// Clock Manager
const clock = ctx.getClock();
```

## HTTP Client

### GET Request

```typescript
const response = await ctx.getHttp().get('/users');

expect(response.status).toBe(200);
expect(response.data).toBeInstanceOf(Array);
```

### POST Request

```typescript
const response = await ctx.getHttp().post('/users', {
  name: 'John',
  email: 'john@example.com'
});

expect(response.status).toBe(201);
expect(response.data.id).toBeDefined();
```

### PUT Request

```typescript
const response = await ctx.getHttp().put('/users/1', {
  name: 'John Updated'
});

expect(response.status).toBe(200);
```

### PATCH Request

```typescript
const response = await ctx.getHttp().patch('/users/1', {
  email: 'newemail@example.com'
});

expect(response.status).toBe(200);
```

### DELETE Request

```typescript
const response = await ctx.getHttp().delete('/users/1');

expect(response.status).toBe(204);
```

### Custom Headers

```typescript
const response = await ctx.getHttp().get('/users', {
  headers: {
    'Authorization': 'Bearer token123',
    'X-Custom-Header': 'value'
  }
});
```

### Query Parameters

```typescript
const response = await ctx.getHttp().get('/users?page=1&limit=10');

// Or using options
const response = await ctx.getHttp().get('/users', {
  params: { page: 1, limit: 10 }
});
```

## Database Testing

### Query Database

```typescript
const db = ctx.getDb('postgres');

const result = await db.query('SELECT * FROM users WHERE email = $1', [
  'john@example.com'
]);

expect(result.rows).toHaveLength(1);
```

### Transactions

```typescript
const db = ctx.getDb('postgres');

await db.transaction(async (tx) => {
  await tx.query('INSERT INTO users (name) VALUES ($1)', ['John']);
  await tx.query('INSERT INTO profiles (user_id) VALUES ($1)', [1]);
  // Automatically commits on success, rolls back on error
});
```

### Database Snapshots

```typescript
describe('User CRUD', () => {
  beforeEach(async () => {
    const db = ctx.getDb('postgres');
    await db.snapshot('before-test');
  });
  
  afterEach(async () => {
    const db = ctx.getDb('postgres');
    await db.restore('before-test');
  });
  
  it('should create user', async () => {
    // Test creates data
    // Automatically restored after test
  });
});
```

## Seeding

### Seed for File

Seed once before all tests in a file:

```typescript
beforeAll(async () => {
  await setupEnvironment(config);
  await ctx.getDb('postgres').seedForFile('users.seed.sql');
});
```

### Seed for Test

Seed before each specific test:

```typescript
beforeEach(async () => {
  await ctx.getDb('postgres').seedForTest('test-1', __filename);
});

afterEach(async () => {
  await ctx.getDb('postgres').restoreAfterTest('test-1', __filename);
});
```

[Learn more about seeding →](./seeding-database.md)

## Override System

Override external dependencies without changing code:

```typescript
import { getEnvironmentContext } from '@soapjs/integr8';

it('should handle payment failure', async () => {
  const ctx = getEnvironmentContext();
  
  // Override payment service
  ctx.getCtx().override.service('PaymentService', {
    processPayment: async () => {
      throw new Error('Payment failed');
    }
  });
  
  const response = await ctx.getHttp().post('/orders', {
    items: [{ id: 1, qty: 2 }]
  });
  
  expect(response.status).toBe(402);
  expect(response.data.error).toContain('Payment failed');
});
```

[Learn more about overrides →](./override-system.md)

## Parallel Testing

Integr8 supports parallel test execution with isolated environments:

```json
{
  "jest": {
    "maxWorkers": 4
  }
}
```

Each worker gets:
- Isolated database state (via savepoints/schemas)
- Separate worker ID
- Independent test context

## Test Patterns

### Testing Error Scenarios

```typescript
it('should return 404 for non-existent user', async () => {
  const response = await ctx.getHttp().get('/users/99999');
  
  expect(response.status).toBe(404);
  expect(response.data).toHaveProperty('error');
});
```

### Testing Validation

```typescript
it('should validate email format', async () => {
  const response = await ctx.getHttp().post('/users', {
    name: 'John',
    email: 'invalid-email'
  });
  
  expect(response.status).toBe(400);
  expect(response.data.errors).toContain('email');
});
```

### Testing Authentication

```typescript
it('should require authentication', async () => {
  const response = await ctx.getHttp().get('/users/me');
  
  expect(response.status).toBe(401);
});

it('should allow authenticated requests', async () => {
  const response = await ctx.getHttp().get('/users/me', {
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  
  expect(response.status).toBe(200);
});
```

### Testing Pagination

```typescript
it('should paginate results', async () => {
  const response = await ctx.getHttp().get('/users?page=1&limit=10');
  
  expect(response.status).toBe(200);
  expect(response.data.items).toHaveLength(10);
  expect(response.data.pagination).toEqual({
    page: 1,
    limit: 10,
    total: expect.any(Number)
  });
});
```

### Testing Relationships

```typescript
it('should include user posts', async () => {
  const response = await ctx.getHttp().get('/users/1?include=posts');
  
  expect(response.status).toBe(200);
  expect(response.data.posts).toBeInstanceOf(Array);
});
```

## Test Organization

### By Resource

```
integr8/tests/api/
├── users.api.test.ts
├── posts.api.test.ts
├── comments.api.test.ts
└── auth.api.test.ts
```

### By Feature

```
integr8/tests/api/
├── user-registration.test.ts
├── user-authentication.test.ts
├── post-creation.test.ts
└── comment-moderation.test.ts
```

## Best Practices

### ✅ Do's

- **Use real data** - Don't mock database responses
- **Test happy paths** - Cover main use cases
- **Test error scenarios** - Validate error handling
- **Use snapshots** - Leverage database isolation
- **Clean assertions** - One logical assertion per test
- **Descriptive names** - Clear test descriptions

### ❌ Don'ts

- **Don't share state** - Each test should be independent
- **Don't skip cleanup** - Always restore database state
- **Don't hardcode IDs** - Use created entities
- **Don't test implementation** - Test behavior
- **Don't make assumptions** - Verify everything

## Debugging Tests

### Enable Debug Logging

```javascript
// In your config
logging: {
  level: "debug",
  enabled: true
}
```

### Inspect Requests

```typescript
const response = await ctx.getHttp().get('/users');

console.log('Status:', response.status);
console.log('Headers:', response.headers);
console.log('Data:', response.data);
console.log('Duration:', response.duration, 'ms');
```

### Check Database State

```typescript
const db = ctx.getDb('postgres');
const users = await db.query('SELECT * FROM users');

console.log('Users in DB:', users.rows);
```

## Next Steps

- [Database Strategies](./database-strategies.md)
- [Seeding](./seeding-database.md)
- [Override System](./override-system.md)
- [CLI Commands](./cli-commands.md)

