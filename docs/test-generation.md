# Test Template Generation

SoapJS Integr8 can automatically generate test templates from your router registry, making it easy to create comprehensive integration tests.

## Features

- **Handlebars Templates**: Clean, maintainable test templates
- **Controller Grouping**: Organize tests by controller for better performance
- **Auto-failing Tests**: Generated tests fail by default, forcing implementation
- **Flexible Output**: Support for Jest and Vitest
- **Custom Imports**: Add your own imports and helpers

## Quick Start

### 1. Configure Route Discovery

SoapJS Integr8 can discover routes from any framework using commands:

```bash
# SoapJS
npx integr8 generate --command "npx soap list-routes"

# NestJS
npx integr8 generate --command "npx nest list-routes"

# Express.js
npx integr8 generate --command "npx express-list-routes"

# Custom script
npx integr8 generate --command "node scripts/list-routes.js"
```

Or configure in `integr8.config.ts`:

```typescript
export default {
  // ... other config
  routes: {
    command: 'npx soap list-routes',
    outputFormat: 'json',
    timeout: 30000
  }
};
```

### 2. Generate Test Templates

**Using config file (recommended):**
```bash
# If routes.command is configured in integr8.config.ts
npx integr8 generate --output ./tests/integration

# Generate with multiple test scenarios per endpoint
npx integr8 generate --scenarios --output ./tests/integration

# Generate endpoint-based tests
npx integr8 generate --type endpoint --output ./tests/integration
```

**Using CLI options:**
```bash
# Generate controller-based tests (recommended)
npx integr8 generate --command "npx soap list-routes" --output ./tests/integration

# Generate with multiple test scenarios per endpoint
npx integr8 generate --scenarios --command "npx soap list-routes" --output ./tests/integration

# Generate endpoint-based tests
npx integr8 generate --type endpoint --command "npx soap list-routes" --output ./tests/integration

# Custom options
npx integr8 generate \
  --command "npx soap list-routes" \
  --output ./tests/integration \
  --framework jest \
  --setup \
  --teardown \
  --scenarios \
  --format json \
  --timeout 30000
```

### 3. Generated Test Structure

**Controller-based (recommended):**
```
tests/
├── integration/
│   ├── users.integration.test.ts
│   ├── products.integration.test.ts
│   └── orders.integration.test.ts
```

**Endpoint-based:**
```
tests/
├── integration/
│   ├── get-users.integration.test.ts
│   ├── post-users.integration.test.ts
│   ├── get-users-id.integration.test.ts
│   └── put-users-id.integration.test.ts
```

## Generated Test Examples

### Simple Test (default)

```typescript
// users.integration.test.ts
import { defineScenario, setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

// Global setup
beforeAll(async () => {
  const config = require('../integr8.config.ts').default;
  await setupEnvironment(config);
});

// Global teardown
afterAll(async () => {
  await teardownEnvironment();
});

describe('Users API Integration Tests', () => {
  describe('GET /users', () => {
    test('should handle GET /users', async ({ http }) => {
      const response = await http.get('/users');
      
      // TODO: Add proper assertions
      expect(response.status).toBe(200);
      expect(true).toBe(false); // This test needs implementation
    });
  });

  describe('POST /users', () => {
    test('should handle POST /users', async ({ http }) => {
      const requestData = {
        // TODO: Add request data
      };
      
      const response = await http.post('/users', requestData);
      
      // TODO: Add proper assertions
      expect(response.status).toBe(201);
      expect(true).toBe(false); // This test needs implementation
    });
  });
});
```

### Multiple Scenarios Test (--scenarios flag)

```typescript
// users.integration.test.ts
describe('Users API Integration Tests', () => {
  describe('POST /users', () => {
    test('should successfully handle POST /users', async ({ http }) => {
      const requestData = {
        // TODO: Add request data
        name: 'Test Name',
        email: 'test@example.com'
      };
      
      const response = await http.post('/users', requestData);
      
      // TODO: Add proper assertions
      expect(response.status).toBe(201);
      expect(true).toBe(false); // This test needs implementation
    });

    test('should return 400 for invalid data on POST /users', async ({ http }) => {
      const requestData = {
        // TODO: Add invalid request data
        name: '',
        email: 'invalid-email'
      };
      
      const response = await http.post('/users', requestData);
      
      // TODO: Add proper assertions
      expect(response.status).toBe(400);
      expect(true).toBe(false); // This test needs implementation
    });

    test('should return 401 for unauthorized access to POST /users', async ({ http }) => {
      const requestData = {
        // TODO: Add request data
        name: 'Test Name',
        email: 'test@example.com'
      };
      
      const response = await http.post('/users', requestData);
      
      // TODO: Add proper assertions
      expect(response.status).toBe(401);
      expect(true).toBe(false); // This test needs implementation
    });
  });
});
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--command` | Command to discover routes (overrides config) | From config |
| `--output` | Output directory for test files | `./tests/integration` |
| `--framework` | Test framework (jest\|vitest) | `jest` |
| `--setup` | Include setup/teardown in templates | `true` |
| `--teardown` | Include teardown in templates | `true` |
| `--type` | Template type (controller\|endpoint) | `controller` |
| `--scenarios` | Generate multiple test scenarios per endpoint | `false` |
| `--no-scenarios` | Generate single test per endpoint | `true` |
| `--format` | Output format (json\|text\|auto) | From config |
| `--timeout` | Command timeout in milliseconds | From config |
| `--cwd` | Working directory for command execution | From config |
| `--config` | Path to integr8 config file | `integr8.config.ts` |

## Template Customization

### Handlebars Templates

Templates are located in `src/templates/handlebars/`:

- `controller-test.hbs` - Controller-based tests
- `endpoint-test.hbs` - Endpoint-based tests

### Custom Helpers

Available Handlebars helpers:

- `{{lowercase str}}` - Convert to lowercase
- `{{eq a b}}` - Equality check

### Template Variables

**Controller Template:**
- `{{controllerName}}` - Formatted controller name
- `{{endpoints}}` - Array of route objects
- `{{imports}}` - Custom imports object
- `{{setup}}` - Include setup flag
- `{{teardown}}` - Include teardown flag

**Endpoint Template:**
- `{{endpoint}}` - Single route object
- `{{imports}}` - Custom imports object
- `{{setup}}` - Include setup flag
- `{{teardown}}` - Include teardown flag

## Best Practices

### 1. Use Controller Grouping

Controller-based tests are recommended because:
- Better performance (one setup/teardown per controller)
- Easier state management
- More maintainable code

### 2. Implement Tests Gradually

1. Generate templates
2. Remove `expect(true).toBe(false)` assertions
3. Add proper test data
4. Implement assertions
5. Run tests

### 3. Customize Templates

Create your own Handlebars templates for:
- Specific test patterns
- Custom assertions
- Domain-specific helpers

### 4. Organize Test Data

```typescript
// Create test data files
// tests/data/users.ts
export const userData = {
  valid: { name: 'John Doe', email: 'john@example.com' },
  invalid: { name: '', email: 'invalid-email' }
};
```

## Integration with SoapJS

### RouterRegistry Integration

```typescript
import { RouterRegistry } from '@soapjs/soap';

// Your existing SoapJS setup
const registry = new RouterRegistry();

// Use with Integr8
npx integr8 generate --registry ./src/registry.ts
```

### RouteGroup Support

```typescript
// Group routes for better organization
const userRoutes = new RouteGroup('users', [
  { method: 'GET', path: '/users' },
  { method: 'POST', path: '/users' },
]);

// Generated tests will be grouped by RouteGroup
```

## Troubleshooting

### Common Issues

1. **Registry not found**: Ensure the registry file exports routes correctly
2. **Template errors**: Check Handlebars syntax in templates
3. **Import errors**: Verify custom imports are valid

### Debug Mode

```bash
# Enable debug logging
DEBUG=integr8:* npx integr8 generate
```

## Next Steps

After generating templates:

1. **Implement Tests**: Replace TODO items with real test logic
2. **Add Test Data**: Create realistic test data
3. **Run Tests**: Verify tests work correctly
4. **Coverage**: Use `integr8 coverage` to check API coverage
