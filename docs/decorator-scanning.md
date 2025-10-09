# Decorator Scanning

Automatically discover API endpoints from your NestJS controllers using decorator scanning.

## Overview

Integr8 can scan your codebase for route decorators and automatically:
- Discover all endpoints
- Extract HTTP methods and paths
- Generate test files
- Calculate coverage

## Configuration

Add decorator scanning to your config:

```javascript
module.exports = {
  scan: {
    decorators: {
      paths: [
        "src/**/*.controller.ts",
        "src/api/**/*.ts"
      ],
      
      decoratorNames: [
        "Get", "Post", "Put", "Patch", "Delete",
        "HttpGet", "HttpPost"  // Custom decorators
      ],
      
      routerDecorators: [
        "Controller",
        "ApiTags"
      ],
      
      moduleDecorators: [
        "Module"
      ],
      
      excludePaths: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.spec.ts"
      ]
    }
  }
};
```

## NestJS Example

### Controller to Scan

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete } from '@nestjs/common';

@Controller('users')
export class UsersController {
  
  @Get()
  findAll() {
    return [];
  }
  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {};
  }
  
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateUserDto) {
    return {};
  }
  
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return {};
  }
  
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return {};
  }
}
```

### Scan Results

```bash
integr8 scan --decorators
```

Output:

```json
[
  {
    "method": "GET",
    "path": "/users",
    "resource": "users",
    "sourceFile": "src/users/users.controller.ts",
    "lineNumber": 8
  },
  {
    "method": "GET",
    "path": "/users/:id",
    "resource": "users",
    "sourceFile": "src/users/users.controller.ts",
    "lineNumber": 13
  },
  {
    "method": "POST",
    "path": "/users",
    "resource": "users",
    "expectedStatus": 201,
    "sourceFile": "src/users/users.controller.ts",
    "lineNumber": 18
  },
  {
    "method": "PUT",
    "path": "/users/:id",
    "resource": "users",
    "sourceFile": "src/users/users.controller.ts",
    "lineNumber": 24
  },
  {
    "method": "DELETE",
    "path": "/users/:id",
    "resource": "users",
    "expectedStatus": 204,
    "sourceFile": "src/users/users.controller.ts",
    "lineNumber": 29
  }
]
```

## Supported Decorators

### HTTP Method Decorators

- `@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`
- `@HttpGet()`, `@HttpPost()`, etc. (custom)
- `@All()` - All HTTP methods

### Routing Decorators

- `@Controller('path')` - Base path
- `@ApiTags('users')` - API grouping

### Status Code Decorators

- `@HttpCode(201)` - Expected status code

### Module Decorators

- `@Module()` - Module-level routing

## Path Resolution

Integr8 combines paths from multiple decorator levels:

```typescript
@Module({ path: 'api' })        // Router: /api
class AppModule {}

@Controller('users')            // Controller: /users
class UsersController {
  
  @Get(':id/posts')             // Method: /:id/posts
  getUserPosts() {}
}

// Result: GET /api/users/:id/posts
```

## Auto-Generate Tests

Generate test files from scanned endpoints:

```bash
integr8 scan --decorators --generate-tests
```

Creates:

```
integr8/tests/api/
├── users.api.test.ts       # All user endpoints
├── posts.api.test.ts       # All post endpoints
└── auth.api.test.ts        # All auth endpoints
```

### Generated Test Example

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
      name: 'Test User'
    });
    
    expect(response.status).toBe(201);
  });
});
```

## Scan Specific Files

### Single File

```bash
integr8 scan --decorators --file src/users/users.controller.ts
```

### Specific Directory

```bash
integr8 scan --decorators --dir src/api
```

## Filtering

### Only New Endpoints

Only scan endpoints without existing tests:

```bash
integr8 scan --decorators --type only-new --generate-tests
```

### Custom Output

```bash
integr8 scan --decorators --output my-endpoints.json --format json
```

## Integration with Coverage

Scan and immediately check coverage:

```javascript
// In your config
coverage: {
  enabled: true,
  threshold: 80
}
```

```bash
integr8 scan --decorators
# Automatically shows coverage report
```

## Advanced: Custom Decorators

Support your own decorators:

```javascript
scan: {
  decorators: {
    decoratorNames: [
      "Get", "Post",
      "CustomRoute",      // Your custom decorator
      "ApiEndpoint"       // Another custom one
    ]
  }
}
```

## TypeScript Parsing

Integr8 uses TypeScript AST parsing to:
- Extract decorator metadata
- Resolve import paths
- Combine route paths
- Detect HTTP codes

Works with:
- TypeScript controllers
- JavaScript with decorators (experimental)
- Babel decorators (legacy and stage 2)

## Troubleshooting

### Decorators Not Found

Check that:
1. Paths in config match your file structure
2. `decoratorNames` include your decorators
3. Files are TypeScript (`.ts`)
4. Decorators are imported from framework

### Wrong Paths Generated

Verify:
1. Controller decorator has correct path
2. Module routing is configured
3. Method decorators have correct paths

### Performance

For large codebases:
- Scan specific directories with `--dir`
- Use `excludePaths` to skip unnecessary files
- Cache scan results and use `--type only-new`

## Next Steps

- [Scan Configuration](./scan-configuration.md)
- [Coverage Analysis](./coverage.md)
- [NestJS Integration](./nestjs-integration.md)
- [Writing Tests](./writing-tests.md)

