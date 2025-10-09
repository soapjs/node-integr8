# Scan Configuration Guide

This guide explains how to configure endpoint scanning in Integr8.

## New Unified Configuration (v0.2.0+)

Starting from v0.2.0, all scanning configuration is unified under the `scan` property:

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "paths": ["src"],
      "exclude": ["**/*.spec.ts", "**/*.test.ts"]
    },
    "discovery": {
      "command": "npm run list-routes",
      "timeout": 10000,
      "outputFormat": "json"
    },
    "output": "integr8/tests",
    "generateTests": true
  }
}
```

## Configuration Options

### `scan.decorators`

Scan TypeScript decorators (e.g., NestJS `@Controller`, `@Get`, etc.)

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "decorators": {
        "controllers": ["Controller"],
        "routes": ["Get", "Post", "Put", "Delete", "Patch"],
        "statusCodes": ["HttpCode"],
        "apiDocs": ["ApiResponse", "ApiOperation"]
      },
      "paths": ["src", "src/modules"],
      "exclude": ["**/*.spec.ts", "**/*.test.ts", "**/node_modules/**"]
    }
  }
}
```

**Options:**
- `enabled` - Enable decorator scanning (default: `true` if config exists)
- `framework` - Framework to scan (`nestjs`, `express`, `custom`)
- `decorators` - Specific decorators to look for
- `paths` - Directories to scan (default: `["src"]`)
- `exclude` - Patterns to exclude (default: test files and node_modules)

### `scan.discovery`

Run a command to discover endpoints (alternative to decorator scanning)

```json
{
  "scan": {
    "discovery": {
      "command": "npm run list-routes",
      "timeout": 10000,
      "outputFormat": "json"
    }
  }
}
```

**Options:**
- `command` - Command to execute that outputs endpoints
- `timeout` - Maximum time to wait in milliseconds (default: `10000`)
- `outputFormat` - Expected output format (`json` or `text`)

**Command Output Format:**

The command should output JSON array of endpoints:

```json
[
  {
    "method": "GET",
    "path": "/api/v1/health",
    "description": "GET api/v1/health",
    "resource": "health",
    "expectedStatus": 200,
    "sourceFile": "src/app.controller.ts",
    "lineNumber": 13,
    "decorators": {
      "controller": "api/v1",
      "httpCode": 200,
      "description": ""
    }
  },
  {
    "method": "GET",
    "path": "/api/v1/status",
    "description": "GET api/v1/status",
    "resource": "status",
    "expectedStatus": 200,
    "sourceFile": "src/app.controller.ts",
    "lineNumber": 18,
    "decorators": {
      "controller": "api/v1",
      "httpCode": 200,
      "description": ""
    }
  }
]
```

### `scan.output`

Default output directory for generated test files

```json
{
  "scan": {
    "output": "integr8/tests"
  }
}
```

Can be overridden with `--output` CLI option.

### `scan.generateTests`

Automatically generate test files when scanning

```json
{
  "scan": {
    "generateTests": true
  }
}
```

## CLI Usage

### Using Decorator Scanning

```bash
# Scan all files in configured paths
npx integr8 scan --decorators

# Scan specific file
npx integr8 scan --decorators --file src/controllers/user.controller.ts

# Scan specific directory
npx integr8 scan --decorators --dir src/modules/users

# Generate tests immediately
npx integr8 scan --decorators --generate-tests
```

**Test File Organization:**

The `scan --generate-tests` command groups tests by resource name, creating one test file per resource that includes all HTTP methods (GET, POST, PUT, DELETE, etc.):

```
tests/
  users.api.test.ts       # Contains all user endpoint tests (GET, POST, DELETE, etc.)
  products.api.test.ts    # Contains all product endpoint tests
  orders.api.test.ts      # Contains all order endpoint tests
```

This matches the behavior of the `create` command, keeping related tests together in a single file.

**Intelligent Merging:**

When you run `scan --generate-tests` multiple times:
- Existing test files are preserved
- Only new endpoints are added to existing files
- Duplicate tests are automatically skipped
- Setup/teardown sections remain unchanged

Example workflow:
```bash
# First scan - generates users.api.test.ts with GET and POST
npx integr8 scan --decorators --generate-tests

# Later, after adding DELETE endpoint - merges into existing file
npx integr8 scan --decorators --generate-tests
# Output: "Merging with existing file: users.api.test.ts"
#         "Added: DELETE /users/:id"
```

### Using Discovery Command

```bash
# Run discovery command from config
npx integr8 scan

# Override with custom command
npx integr8 scan --command "node scripts/list-endpoints.js"

# From JSON file
npx integr8 scan --json endpoints.json
```

### Combined Options

```bash
# Scan decorators and save to specific location
npx integr8 scan --decorators --output tests/api --generate-tests

# Scan only new endpoints
npx integr8 scan --decorators --type only-new --generate-tests
```

## Examples

### NestJS Application

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "decorators": {
        "controllers": ["Controller"],
        "routes": ["Get", "Post", "Put", "Delete", "Patch", "Options", "Head"],
        "statusCodes": ["HttpCode"],
        "apiDocs": ["ApiResponse", "ApiOperation", "ApiTags"]
      },
      "paths": ["src"],
      "exclude": ["**/*.spec.ts", "**/node_modules/**"]
    },
    "output": "test/integration",
    "generateTests": true
  }
}
```

### Express Application with Discovery

```json
{
  "scan": {
    "discovery": {
      "command": "node scripts/list-routes.js",
      "timeout": 5000,
      "outputFormat": "json"
    },
    "output": "tests/api"
  }
}
```

### Monorepo with Multiple Paths

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "paths": [
        "packages/api/src",
        "packages/admin/src"
      ],
      "exclude": [
        "**/*.spec.ts",
        "**/test/**",
        "**/node_modules/**"
      ]
    },
    "output": "tests/e2e"
  }
}
```

## Custom HTTP Status Codes

Integr8 uses conventional REST API status codes by default:
- `GET`: 200
- `POST`: 201
- `PUT`: 200
- `PATCH`: 200
- `DELETE`: 204

**Note:** DELETE can return either 200 (with response body) or 204 (no content). The default is 204, but many APIs use 200.

### Overriding Status Codes

#### In NestJS with Decorators

Use the `@HttpCode()` decorator to specify custom status codes:

```typescript
@Controller('users')
export class UsersController {
  @Delete(':id')
  @HttpCode(200)  // Override default 204 with 200
  async deleteUser(@Param('id') id: string) {
    await this.usersService.delete(id);
    return { success: true, message: 'User deleted' };
  }
}
```

The scanner will automatically detect `@HttpCode()` and use it in generated tests.

#### In JSON Endpoint Configuration

When using `create` command with JSON file, specify `expectedStatus`:

```json
[
  {
    "url": "/api/users/:id",
    "method": "DELETE",
    "expectedStatus": 200,
    "expectedResponse": {
      "success": true,
      "message": "User deleted"
    }
  }
]
```

#### In CLI Create Command

Use the `--expectedStatus` flag:

```bash
npx integr8 create \
  --url /api/users/123 \
  --method DELETE \
  --expectedStatus 200
```

## Tips

1. **Use `--type only-new`** to avoid regenerating existing tests
2. **Combine decorators and discovery** - configure both for flexibility
3. **Organize by module** - use `--output` to separate tests by feature
4. **CI/CD Integration** - scan changed files only in your pipeline
5. **Specify status codes** - Use `@HttpCode()` decorators or `expectedStatus` in config to match your API's actual responses

## Troubleshooting

### "Decorator scanning not configured"

Add `scan.decorators` to your config:

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "paths": ["src"]
    }
  }
}
```

### "scan.discovery.command must be configured"

Either provide `--command` flag or add to config:

```json
{
  "scan": {
    "discovery": {
      "command": "npm run list-routes"
    }
  }
}
```


