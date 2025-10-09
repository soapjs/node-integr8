# NestJS Integration

Integr8 provides first-class support for NestJS applications with automatic decorator scanning and seamless integration.

## Installation

```bash
npm install --save-dev @soapjs/integr8 @soapjs/integr8-nestjs
```

## Quick Setup

```bash
npx integr8 init --template nest --interactive
```

## Configuration

```javascript
module.exports = {
  testType: "api",
  testDir: "integr8/tests/api",
  
  services: [
    {
      name: "app",
      mode: "local",
      framework: "nestjs",
      
      http: {
        port: 3000,
        prefix: "/api"
      },
      
      readiness: {
        enabled: true,
        endpoint: "/health"
      },
      
      local: {
        command: "npm run start:dev"
      }
    }
  ],
  
  scan: {
    decorators: {
      paths: ["src/**/*.controller.ts"],
      decoratorNames: ["Get", "Post", "Put", "Patch", "Delete"],
      routerDecorators: ["Controller"],
      moduleDecorators: ["Module"]
    }
  }
};
```

## Auto-Discovery

Scan your NestJS controllers:

```bash
integr8 scan --decorators --generate-tests
```

### Example Controller

```typescript
@Controller('users')
export class UsersController {
  
  @Get()
  @HttpCode(200)
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }
  
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }
  
  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }
  
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<User> {
    return this.usersService.update(id, dto);
  }
  
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
```

### Generated Tests

```typescript
describe('GET /users', () => {
  it('should handle GET request', async () => {
    const ctx = getEnvironmentContext();
    const response = await ctx.getHttp().get('/users');
    
    expect(response.status).toBe(200);
  });
});

describe('POST /users', () => {
  it('should handle POST request', async () => {
    const ctx = getEnvironmentContext();
    const response = await ctx.getHttp().post('/users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    
    expect(response.status).toBe(201);
  });
});
```

## Module Routing

### Global Prefix

```typescript
// main.ts
app.setGlobalPrefix('api/v1');
```

```javascript
// integr8.config.js
http: {
  prefix: "/api/v1"
}
```

### Module-Level Routes

```typescript
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'api',
        module: ApiModule
      }
    ])
  ]
})
export class AppModule {}
```

Integr8 will detect and combine paths correctly.

## Override Guards and Interceptors

### Override Authentication

```typescript
it('should bypass auth in test', async () => {
  const ctx = getEnvironmentContext();
  
  // Override AuthGuard
  ctx.getCtx().override.guard('AuthGuard', {
    canActivate: () => true
  });
  
  const response = await ctx.getHttp().get('/protected');
  expect(response.status).toBe(200);
});
```

### Override Services

```typescript
it('should mock external API', async () => {
  const ctx = getEnvironmentContext();
  
  // Override external service
  ctx.getCtx().override.service('PaymentService', {
    charge: async (amount) => ({
      success: true,
      transactionId: 'test-123'
    })
  });
  
  const response = await ctx.getHttp().post('/orders', { ... });
  expect(response.status).toBe(201);
});
```

## Testing with TypeORM

```typescript
import { getEnvironmentContext } from '@soapjs/integr8';

describe('User Repository', () => {
  it('should persist user to database', async () => {
    const ctx = getEnvironmentContext();
    const db = ctx.getDb('postgres');
    
    // Create user via API
    await ctx.getHttp().post('/users', {
      name: 'John',
      email: 'john@example.com'
    });
    
    // Verify in database
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      ['john@example.com']
    );
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('John');
  });
});
```

## Testing with Prisma

```typescript
describe('User CRUD with Prisma', () => {
  beforeEach(async () => {
    const db = ctx.getDb('postgres');
    await db.snapshot('before-test');
  });
  
  afterEach(async () => {
    const db = ctx.getDb('postgres');
    await db.restore('before-test');
  });
  
  it('should create user', async () => {
    // Test automatically uses savepoint isolation
    const response = await ctx.getHttp().post('/users', { ... });
    expect(response.status).toBe(201);
  });
});
```

## Testing GraphQL

```typescript
describe('GraphQL API', () => {
  it('should query users', async () => {
    const response = await ctx.getHttp().post('/graphql', {
      query: `
        query {
          users {
            id
            name
            email
          }
        }
      `
    });
    
    expect(response.status).toBe(200);
    expect(response.data.data.users).toBeInstanceOf(Array);
  });
});
```

## Testing Microservices

```typescript
// Test NestJS microservice
describe('User Microservice', () => {
  it('should communicate via message pattern', async () => {
    const ctx = getEnvironmentContext();
    
    // Send message to microservice
    const response = await ctx.getMessaging('user-service').send(
      'user.create',
      { name: 'John' }
    );
    
    expect(response).toHaveProperty('id');
  });
});
```

## NestJS Adapter Features

The `@soapjs/integr8-nestjs` adapter provides:

- **Automatic route discovery** from decorators
- **Guard overriding** for testing protected routes
- **Interceptor mocking** for external services
- **Module introspection** for dependency injection
- **Swagger integration** for API documentation

## Best Practices

1. **Use decorator scanning** - Auto-discover endpoints
2. **Test with real DB** - Use TypeORM/Prisma with actual database
3. **Override guards** - Skip auth in tests when needed
4. **Leverage DI** - Override services via dependency injection
5. **Use transactions** - Fast test isolation with savepoints

## Example: Complete Test Suite

```typescript
import { 
  setupEnvironment, 
  teardownEnvironment, 
  getEnvironmentContext 
} from '@soapjs/integr8';

let ctx;

beforeAll(async () => {
  await setupEnvironment(require('../../integr8.api.config.js'));
  ctx = getEnvironmentContext();
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('Users API', () => {
  describe('GET /users', () => {
    it('should return all users', async () => {
      const response = await ctx.getHttp().get('/users');
      expect(response.status).toBe(200);
    });
  });
  
  describe('POST /users', () => {
    it('should create user', async () => {
      const response = await ctx.getHttp().post('/users', {
        name: 'John Doe',
        email: 'john@example.com'
      });
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
    });
    
    it('should validate email', async () => {
      const response = await ctx.getHttp().post('/users', {
        name: 'John',
        email: 'invalid'
      });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Protected Routes', () => {
    it('should require auth', async () => {
      const response = await ctx.getHttp().get('/users/me');
      expect(response.status).toBe(401);
    });
    
    it('should allow with valid token', async () => {
      // Override AuthGuard for testing
      ctx.getCtx().override.guard('AuthGuard', {
        canActivate: () => true
      });
      
      const response = await ctx.getHttp().get('/users/me');
      expect(response.status).toBe(200);
    });
  });
});
```

## Next Steps

- [Decorator Scanning](./decorator-scanning.md)
- [Override System](./override-system.md)
- [Database Strategies](./database-strategies.md)
- [Writing Tests](./writing-tests.md)

