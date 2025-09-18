# Adding Endpoints to Existing Test Files

SoapJS Integr8 can safely add new endpoint tests to existing test files using AST manipulation.

## Basic Usage

### Add single endpoint
```bash
# Add GET /users/:id to existing users test file
npx integr8 add-endpoint "GET /users/:id"

# Add POST /users with multiple scenarios
npx integr8 add-endpoint "POST /users" --scenarios

# Specify target file explicitly
npx integr8 add-endpoint "GET /users/:id" --file ./tests/integration/users.integration.test.ts
```

### Dry run (preview changes)
```bash
# See what would be added without making changes
npx integr8 add-endpoint "GET /users/:id" --dry-run
```

### Controller-based auto-detection
```bash
# Auto-detect file based on controller name
npx integr8 add-endpoint "GET /users/:id" --controller users
```

## Examples

### Before: Existing test file
```typescript
// users.integration.test.ts
import { defineScenario, setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

beforeAll(async () => {
  const config = require('../integr8.config.ts').default;
  await setupEnvironment(config);
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('Users API Integration Tests', () => {
  describe('GET /users', () => {
    test('should handle GET /users', async ({ http }) => {
      const response = await http.get('/users');
      expect(response.status).toBe(200);
      expect(true).toBe(false); // This test needs implementation
    });
  });
});
```

### Command
```bash
npx integr8 add-endpoint "GET /users/:id" --scenarios
```

### After: Updated test file
```typescript
// users.integration.test.ts
import { defineScenario, setupEnvironment, teardownEnvironment } from '@soapjs/integr8';

beforeAll(async () => {
  const config = require('../integr8.config.ts').default;
  await setupEnvironment(config);
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('Users API Integration Tests', () => {
  describe('GET /users', () => {
    test('should handle GET /users', async ({ http }) => {
      const response = await http.get('/users');
      expect(response.status).toBe(200);
      expect(true).toBe(false); // This test needs implementation
    });
  });

  describe('GET /users/:id', () => {
    test('should successfully handle GET /users/:id', async ({ http }) => {
      const response = await http.get('/users/:id');
      
      // TODO: Add proper assertions
      expect(response.status).toBe(200);
      expect(true).toBe(false); // This test needs implementation
    });

    test('should return 404 for non-existent resource on GET /users/:id', async ({ http }) => {
      const response = await http.get('/users/:id');
      
      // TODO: Add proper assertions
      expect(response.status).toBe(404);
      expect(true).toBe(false); // This test needs implementation
    });

    test('should return 401 for unauthorized access to GET /users/:id', async ({ http }) => {
      const response = await http.get('/users/:id');
      
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
| `<endpoint>` | Endpoint to add (e.g., "GET /users/:id") | Required |
| `--file` | Target test file (auto-detected if not specified) | Auto-detect |
| `--controller` | Controller name for auto-detection | Auto-detect |
| `--scenarios` | Generate multiple test scenarios | `false` |
| `--no-scenarios` | Generate single test scenario | `true` |
| `--backup` | Create backup before modification | `true` |
| `--no-backup` | Skip backup creation | `false` |
| `--dry-run` | Show what would be added without making changes | `false` |

## Auto-detection Logic

The system automatically detects the target file using this priority:

1. **Explicit file** (`--file` option)
2. **Controller-based** (`--controller` option)
3. **Path-based** (from endpoint path, e.g., `/users/:id` → `users.integration.test.ts`)

### File search locations:
- `./tests/integration/{controller}.integration.test.ts`
- `./tests/{controller}.integration.test.ts`
- `./{controller}.integration.test.ts`

## Safety Features

### Backup Creation
```bash
# Creates backup before modification (default)
npx integr8 add-endpoint "GET /users/:id" --backup

# Skip backup (not recommended)
npx integr8 add-endpoint "GET /users/:id" --no-backup
```

### Duplicate Detection
```bash
# If endpoint already exists
npx integr8 add-endpoint "GET /users"
# Error: Endpoint GET /users already exists in users.integration.test.ts
```

### Dry Run
```bash
# Preview changes without modifying files
npx integr8 add-endpoint "GET /users/:id" --dry-run

# Output:
# Would add endpoint:
#   Method: GET
#   Path: /users/:id
#   File: ./tests/integration/users.integration.test.ts
#   Scenarios: Multiple
```

## Generated Test Scenarios

### Single Scenario (default)
- Basic success test with expected status code

### Multiple Scenarios (`--scenarios`)
- Success scenario
- Validation error (400) for POST/PUT/PATCH
- Not found (404) for GET/PUT/DELETE/PATCH
- Unauthorized (401) for all methods

## Error Handling

### Common Errors
```bash
# Invalid endpoint format
npx integr8 add-endpoint "invalid-format"
# Error: Invalid endpoint format: invalid-format. Expected format: "METHOD /path"

# File not found
npx integr8 add-endpoint "GET /users/:id" --file ./nonexistent.test.ts
# Error: Target file does not exist: ./nonexistent.test.ts

# Endpoint already exists
npx integr8 add-endpoint "GET /users"
# Error: Endpoint GET /users already exists in users.integration.test.ts

# Could not determine target file
npx integr8 add-endpoint "GET /unknown"
# Error: Could not determine target file. Use --file to specify explicitly.
```

## Best Practices

1. **Always use dry-run first** to preview changes
2. **Keep backups enabled** for safety
3. **Use explicit file paths** for complex project structures
4. **Review generated code** before committing
5. **Remove failing assertions** (`expect(true).toBe(false)`)
6. **Add proper test data** and assertions

## Integration with Existing Workflow

```bash
# 1. Generate initial tests
npx integr8 generate --command "npx soap list-routes"

# 2. Add missing endpoints as needed
npx integr8 add-endpoint "GET /users/:id" --scenarios
npx integr8 add-endpoint "PUT /users/:id" --scenarios

# 3. Run tests
npm test
```
