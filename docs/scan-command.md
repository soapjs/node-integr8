# Scan Command

The `integr8 scan` command automatically discovers service endpoints and generates integration tests for them.

## Usage

```bash
integr8 scan [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--command <cmd>` | Command to run for endpoint discovery | - |
| `--json <path>` | Path to JSON file with endpoints | - |
| `--type <type>` | Scan type: `all`, `only-new` | `all` |
| `--output <dir>` | Output directory for tests | `./tests` |
| `--config <path>` | Path to integr8 config file | Auto-detected |
| `--format <format>` | Output format: `json`, `yaml` | `json` |

## Examples

### Scan with command
```bash
# Using npm script
integr8 scan --command="npm run list-endpoints" --type=all

# Using direct command
integr8 scan --command="node scripts/list-endpoints.js" --type=only-new

# Custom output directory
integr8 scan --command="npm run list-endpoints" --output=./integration-tests
```

### Scan with JSON file
```bash
# From JSON file
integr8 scan --json=endpoints.json --type=all

# Only new endpoints
integr8 scan --json=endpoints.json --type=only-new

# Custom config
integr8 scan --json=endpoints.json --config=integr8.api.config.js
```

## JSON Format

The JSON file should contain an array of endpoint objects:

```json
[
  {
    "method": "GET",
    "path": "/health",
    "controller": "HealthController",
    "middleware": [],
    "params": [],
    "request": {
      "headers": {},
      "query": {}
    },
    "response": {
      "200": {
        "status": "ok",
        "timestamp": "2024-01-01T00:00:00Z"
      },
      "500": {
        "error": "Internal Server Error"
      }
    },
    "description": "Health check endpoint"
  }
]
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `method` | string | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `path` | string | Endpoint path (e.g., "/api/users/:id") |
| `controller` | string | Controller name |
| `middleware` | string[] | List of middleware names |
| `params` | string[] | Path parameters (e.g., ["id"]) |
| `request` | object | Request examples |
| `response` | object | Response examples by status code |
| `description` | string | Endpoint description |

## Generated Test Files

Tests are generated in the format: `<endpoint>.<method>.test.ts`

Examples:
- `health.get.test.ts` for `GET /health`
- `users.post.test.ts` for `POST /api/users`
- `users-id.get.test.ts` for `GET /api/users/:id`

## Scan Types

### `all`
Generates tests for all discovered endpoints, overwriting existing files.

### `only-new`
Only generates tests for endpoints that don't have existing test files.

## Setting up Endpoint Discovery

### NestJS Example

1. Create a discovery script:

```javascript
// scripts/list-endpoints.js
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');

async function listEndpoints() {
  const app = await NestFactory.create(AppModule, { logger: false });
  
  const routes = [];
  // ... discovery logic ...
  
  console.log(JSON.stringify(routes, null, 2));
  await app.close();
}

listEndpoints();
```

2. Add to package.json:

```json
{
  "scripts": {
    "list-endpoints": "node scripts/list-endpoints.js"
  }
}
```

3. Run scan:

```bash
integr8 scan --command="npm run list-endpoints" --type=all
```

### Express.js Example

```javascript
// scripts/list-endpoints.js
const app = require('./app');

const routes = [];
app._router.stack.forEach(layer => {
  if (layer.route) {
    Object.keys(layer.route.methods).forEach(method => {
      routes.push({
        method: method.toUpperCase(),
        path: layer.route.path,
        controller: 'Unknown',
        middleware: [],
        params: [],
        request: {},
        response: {}
      });
    });
  }
});

console.log(JSON.stringify(routes, null, 2));
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Scan endpoints and generate tests
  run: |
    integr8 scan --command="npm run list-endpoints" --type=only-new
    integr8 run
```

### Docker

```dockerfile
# Generate tests during build
RUN integr8 scan --json=endpoints.json --output=/app/tests
```

## Troubleshooting

### Command fails
- Ensure the command can run without dependencies (database, external services)
- Use mock mode or dry-run mode in your discovery script
- Check that the command outputs valid JSON

### No endpoints found
- Verify the discovery script is working correctly
- Check that the application can start without external dependencies
- Ensure the JSON format is correct

### Tests not generated
- Check file permissions in the output directory
- Verify the integr8 config file exists
- Ensure the endpoint format is valid
