# Override System - Dynamic Component Mocking

The override system in Integr8 enables dynamic mocking of application components during tests, without requiring environment restarts.

## How it works?

1. **Adapter** is injected into the application during startup in test mode
2. **Test middleware** adds special endpoints (`/override`, `/health`)
3. **OverrideManager** in tests sends requests to these endpoints
4. **Adapter** applies overrides to actual components (services, middleware, guards, etc.)

## NestJS Integration

### Installation

```bash
npm install @soapjs/integr8-nestjs
```

### Configuration

```typescript
// app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { NestJSAdapter, createTestMiddleware } from '@soapjs/integr8-nestjs';

@Module({
  providers: [
    {
      provide: 'INTEGR8_ADAPTER',
      useFactory: () => {
        if (process.env.NODE_ENV === 'test') {
          return new NestJSAdapter();
        }
        return null;
      }
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    if (process.env.NODE_ENV === 'test') {
      consumer
        .apply(createTestMiddleware())
        .forRoutes('*');
    }
  }
}
```

## Usage in Tests

### Basic Mocking

```typescript
import { setupEnvironment, teardownEnvironment, getEnvironmentContext } from '@soapjs/integr8';

describe('User API Tests', () => {
  beforeAll(async () => {
    await setupEnvironment();
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should mock UserService', async () => {
    const ctx = getEnvironmentContext();
    
    // Mock service
    await ctx.getCtx().override.service('UserService').withMock({
      findById: async (id: string) => ({
        id,
        name: 'Mocked User',
        email: 'mock@test.com'
      })
    });
    
    // Call endpoint
    const response = await ctx.getHttp().get('/users/123');
    
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('Mocked User');
  });
});
```

### Authentication Mocking

```typescript
test('should test as admin', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock auth as admin
  await ctx.getCtx().override.auth().asAdmin();
  
  // Endpoint requiring admin permissions
  const response = await ctx.getHttp().post('/admin/users', {
    name: 'New User'
  });
  
  expect(response.status).toBe(201);
});

test('should test with specific roles', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock specific roles
  await ctx.getCtx().override.auth().withRoles('moderator', 'editor');
  
  const response = await ctx.getHttp().get('/admin/dashboard');
  expect(response.status).toBe(200);
});

test('should test with specific user', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock specific user
  await ctx.getCtx().override.auth().withUsers({
    id: '123',
    email: 'test@example.com',
    role: 'user',
    permissions: ['read', 'write']
  });
  
  const response = await ctx.getHttp().get('/profile');
  expect(response.status).toBe(200);
  expect(response.data.email).toBe('test@example.com');
});
```

### Repository Mocking

```typescript
test('should mock repository', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock repository
  await ctx.getCtx().override.repository('UserRepository').withMock({
    findAll: async () => [
      { id: '1', name: 'User 1' },
      { id: '2', name: 'User 2' }
    ],
    save: async (user: any) => ({ ...user, id: 'new-id' })
  });
  
  const response = await ctx.getHttp().get('/users');
  expect(response.data).toHaveLength(2);
});
```

### Middleware Mocking

```typescript
test('should mock rate limiting middleware', async () => {
  const ctx = getEnvironmentContext();
  
  // Disable rate limiting in test
  await ctx.getCtx().override.middleware('RateLimitMiddleware').withMock(
    (req: any, res: any, next: any) => next()
  );
  
  // You can send many requests without limits
  for (let i = 0; i < 100; i++) {
    const response = await ctx.getHttp().get('/api/data');
    expect(response.status).toBe(200);
  }
});
```

### Guard Mocking (NestJS)

```typescript
test('should mock auth guard', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock guard to always allow
  await ctx.getCtx().override.guard('AuthGuard').withMock({
    canActivate: () => true
  });
  
  const response = await ctx.getHttp().get('/protected-route');
  expect(response.status).toBe(200);
});
```

### Clearing Overrides

```typescript
test('should reset overrides between tests', async () => {
  const ctx = getEnvironmentContext();
  
  // Set override
  await ctx.getCtx().override.service('UserService').withValue(mockService);
  
  // ... test ...
  
  // Clear all overrides
  await ctx.getCtx().override.clear();
  
  // Now service works normally
});
```

## API Reference

### OverrideManager

#### `service(name: string)`
Mock service by name.

```typescript
await ctx.override.service('UserService').withMock(mockImplementation);
await ctx.override.service('EmailService').withValue(mockValue);
```

#### `repository(name: string)`
Mock repository by name.

```typescript
await ctx.override.repository('UserRepository').withMock(mockRepo);
```

#### `middleware(name: string)`
Mock middleware by name.

```typescript
await ctx.override.middleware('AuthMiddleware').withMock((req, res, next) => next());
```

#### `guard(name: string)` (NestJS)
Mock guard by name.

```typescript
await ctx.override.guard('RolesGuard').withMock({ canActivate: () => true });
```

#### `provider(name: string)`
Mock any provider by name.

```typescript
await ctx.override.provider('ConfigService').withValue({ apiKey: 'test-key' });
```

#### `auth(middlewareName?: string)`
Special API for authentication mocking.

```typescript
// Predefined roles
await ctx.override.auth().asAdmin();
await ctx.override.auth().asUser();
await ctx.override.auth().asGuest();

// Custom role and permissions
await ctx.override.auth().withRoles('moderator', 'editor');
await ctx.override.auth().withPermissions(['read', 'write', 'delete']);

// Custom user
await ctx.override.auth().withUsers({ id: '123', email: 'test@example.com' });
```

#### `clear()`
Clear all overrides.

```typescript
await ctx.override.clear();
```

### Builder Methods

#### `.with(implementation)`
Replace component with new implementation.

```typescript
await ctx.override.service('UserService').with(new MockUserService());
```

#### `.withMock(mockFn)`
Replace with mock function or object with methods.

```typescript
await ctx.override.service('UserService').withMock({
  findById: jest.fn().mockResolvedValue({ id: '123' })
});
```

#### `.withValue(value)`
Replace with constant value.

```typescript
await ctx.override.provider('API_KEY').withValue('test-api-key');
```

## Advanced Usage

### Mocking with Context

```typescript
test('should mock with request context', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock service that uses request context
  await ctx.override.service('AuditService').withMock({
    log: async (action: string, req: any) => {
      console.log(`[TEST AUDIT] ${action} by ${req.user.id}`);
    }
  });
  
  await ctx.override.auth().withUsers({ id: 'test-user-id' });
  
  const response = await ctx.getHttp().post('/items', { name: 'Test' });
  expect(response.status).toBe(201);
});
```

### Mocking with Call Verification

```typescript
test('should verify service calls', async () => {
  const ctx = getEnvironmentContext();
  const mockFn = jest.fn().mockResolvedValue({ success: true });
  
  await ctx.override.service('EmailService').withMock({
    sendEmail: mockFn
  });
  
  await ctx.getHttp().post('/register', {
    email: 'test@example.com',
    password: 'password'
  });
  
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'test@example.com'
    })
  );
});
```

### Override per Test

```typescript
describe('User Tests with different overrides', () => {
  beforeEach(async () => {
    const ctx = getEnvironmentContext();
    // Clear overrides before each test
    await ctx.getCtx().override.clear();
  });

  test('scenario 1: User exists', async () => {
    const ctx = getEnvironmentContext();
    await ctx.override.service('UserService').withMock({
      findById: async () => ({ id: '123', name: 'John' })
    });
    // ... test ...
  });

  test('scenario 2: User not found', async () => {
    const ctx = getEnvironmentContext();
    await ctx.override.service('UserService').withMock({
      findById: async () => null
    });
    // ... test ...
  });
});
```

## Express Integration

```typescript
// app.ts
import express from 'express';
import { ExpressAdapter, createTestMiddleware } from '@soapjs/integr8-express';

const app = express();

if (process.env.NODE_ENV === 'test') {
  const adapter = new ExpressAdapter();
  app.set('INTEGR8_ADAPTER', adapter);
  app.use(createTestMiddleware());
}

// ... rest of configuration
```

## Debugging

### Checking Active Overrides

```typescript
// GET /__test__/health returns information about overrides
const ctx = getEnvironmentContext();
const health = await ctx.getHttp().get('/__test__/health');
console.log(health.data);
// {
//   status: 'ok',
//   timestamp: '2025-01-07T...',
//   integr8: true,
//   overrides: ['service:UserService', 'middleware:AuthMiddleware']
// }
```

### Logs

Set `logging: 'debug'` in configuration to see all overrides:

```json
{
  "services": [
    {
      "name": "app",
      "type": "nestjs",
      "logging": "debug"
    }
  ]
}
```

## Best Practices

1. **Always clear overrides** between tests using `beforeEach` or `afterEach`
2. **Mock only what you need** - excessive mocking can hide problems
3. **Use typing** - TypeScript will help avoid errors in mocks
4. **Test end-to-end** - overrides are a tool, but some tests should use real components
5. **Document mocks** - explain why something is mocked in comments

## Example Scenarios

### Testing with External APIs

```typescript
test('should mock external API', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock service that calls external API
  await ctx.override.service('PaymentGateway').withMock({
    charge: async (amount: number) => ({
      success: true,
      transactionId: 'mock-tx-123'
    })
  });
  
  const response = await ctx.getHttp().post('/checkout', {
    items: [{ id: '1', price: 100 }]
  });
  
  expect(response.data.success).toBe(true);
});
```

### Testing Error Scenarios

```typescript
test('should handle service errors', async () => {
  const ctx = getEnvironmentContext();
  
  // Mock service to throw error
  await ctx.override.service('UserService').withMock({
    findById: async () => {
      throw new Error('Database connection failed');
    }
  });
  
  const response = await ctx.getHttp().get('/users/123');
  
  expect(response.status).toBe(500);
  expect(response.data.error).toBeDefined();
});
```

### Testing with Different Permissions

```typescript
describe('Admin endpoints', () => {
  test('admin can delete users', async () => {
    const ctx = getEnvironmentContext();
    await ctx.override.auth().asAdmin();
    
    const response = await ctx.getHttp().delete('/users/123');
    expect(response.status).toBe(204);
  });

  test('regular user cannot delete users', async () => {
    const ctx = getEnvironmentContext();
    await ctx.override.auth().asUser();
    
    const response = await ctx.getHttp().delete('/users/123');
    expect(response.status).toBe(403);
  });
});
```
