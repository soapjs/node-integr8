# CLI Commands

Complete reference for all Integr8 CLI commands.

## `integr8 init`

Initialize Integr8 in your project.

### Usage

```bash
integr8 init [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--interactive` | `-i` | Interactive setup wizard | `false` |
| `--template <name>` | `-t` | Template (express, nest, fastify) | `express` |
| `--test-dir <path>` | | Test directory | `integr8/tests` |
| `--format <type>` | `-f` | Config format (js, json) | `js` |
| `--app-type <type>` | | App mode (local, container, docker-compose) | `container` |
| `--test-type <type>` | | Test type (api, e2e, integration) | `api` |

### Examples

```bash
# Interactive mode (recommended)
integr8 init --interactive

# Express with local app
integr8 init --template express --app-type local

# NestJS with Docker Compose
integr8 init --template nest --app-type docker-compose

# Custom test directory
integr8 init --test-dir tests/integration
```

### What It Creates

- Configuration file (`integr8.{type}.config.{format}`)
- Test directory structure
- Sample test file
- `.gitignore` entries
- Docker files (if using docker-compose)

---

## `integr8 up`

Start the test environment (services, databases, etc.).

### Usage

```bash
integr8 up [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--config <path>` | `-c` | Config file path | `integr8.api.config.js` |
| `--test-type <type>` | `-t` | Test type | Auto-detect |
| `--detach` | `-d` | Run in detached mode | `false` |
| `--fast` | `-f` | Skip health checks | `false` |

### Examples

```bash
# Start environment
integr8 up

# Start and run in background
integr8 up --detach

# Skip health checks (faster startup)
integr8 up --fast

# Use custom config
integr8 up --config integr8.e2e.config.js
```

### What It Does

1. Validates configuration
2. Starts containers (databases, messaging, storage)
3. Starts application services
4. Performs health checks
5. Sets up status server
6. Displays service information

---

## `integr8 down`

Stop the test environment.

### Usage

```bash
integr8 down [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--config <path>` | `-c` | Config file path | `integr8.api.config.js` |
| `--test-type <type>` | `-t` | Test type | Auto-detect |

### Examples

```bash
# Stop environment
integr8 down

# Stop specific config
integr8 down --config integr8.e2e.config.js
```

---

## `integr8 test`

Run integration tests.

### Usage

```bash
integr8 test [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--config <path>` | `-c` | Config file path | `integr8.api.config.js` |
| `--test-type <type>` | `-t` | Test type | Auto-detect |
| `--pattern <pattern>` | `-p` | Test name pattern | - |
| `--watch` | `-w` | Watch mode | `false` |
| `--wait-for-ready` | | Wait for environment | `false` |
| `--wait-timeout <ms>` | | Wait timeout | `300000` |

### Examples

```bash
# Run all tests
integr8 test

# Run specific tests
integr8 test --pattern "User API"

# Watch mode
integr8 test --watch

# Wait for environment to be ready
integr8 test --wait-for-ready --wait-timeout 60000
```

---

## `integr8 ci`

Run tests in CI mode (up → test → down).

### Usage

```bash
integr8 ci [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config <path>` | Config file path | `integr8.api.config.js` |
| `--test-type <type>` | Test type | Auto-detect |
| `--pattern <pattern>` | Test name pattern | - |
| `--timeout <ms>` | Overall timeout | `600000` |
| `--verbose` | Verbose output | `false` |
| `--no-cleanup` | Skip cleanup on exit | `false` |

### Examples

```bash
# Run in CI mode
integr8 ci

# With verbose output
integr8 ci --verbose

# Skip cleanup for debugging
integr8 ci --no-cleanup
```

### CI/CD Integration

**GitHub Actions:**

```yaml
- name: Run Integration Tests
  run: npx integr8 ci --verbose
```

**GitLab CI:**

```yaml
test:
  script:
    - npx integr8 ci --verbose
```

---

## `integr8 scan`

Discover and scan API endpoints.

### Usage

```bash
integr8 scan [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--decorators` | Scan using decorators | `false` |
| `--command <cmd>` | Discovery command | From config |
| `--json <path>` | JSON file with routes | - |
| `--file <path>` | Scan specific file | - |
| `--dir <path>` | Scan specific directory | - |
| `--type <type>` | Filter (all, only-new) | `all` |
| `--output <path>` | Output file | `endpoints.json` |
| `--format <format>` | Output format (json, yaml) | `json` |
| `--generate-tests` | Generate test files | `false` |
| `--config <path>` | Config file | Auto-detect |

### Examples

```bash
# Scan using decorators (NestJS)
integr8 scan --decorators

# Scan and generate tests
integr8 scan --decorators --generate-tests

# Scan specific file
integr8 scan --decorators --file src/users/users.controller.ts

# Scan using discovery command
integr8 scan --command "npm run list-routes"

# Scan from JSON file
integr8 scan --json routes.json --generate-tests

# Only scan new endpoints
integr8 scan --decorators --type only-new
```

[Learn more about scanning →](./scan-configuration.md)

---

## `integr8 create`

Create test files for endpoints.

### Usage

```bash
integr8 create [options]
```

### Options

| Option | Description | Required |
|--------|-------------|----------|
| `--url <url>` | Single URL to test | One of --url or --urls |
| `--urls <path>` | JSON file with URLs | One of --url or --urls |
| `--method <method>` | HTTP method | `GET` |
| `--test-type <type>` | Test type | `api` |
| `--test-framework <fw>` | Framework (jest, vitest) | `jest` |
| `--test-dir <path>` | Test directory | From config |
| `--config <path>` | Config file | Auto-detect |

### Examples

```bash
# Create test for single endpoint
integr8 create --url /users --method GET

# Create from JSON file
integr8 create --urls endpoints.json

# Custom test directory
integr8 create --url /posts --test-dir tests/api
```

### URLs JSON Format

```json
[
  {
    "url": "/users",
    "method": "GET",
    "resource": "users",
    "expectedStatus": 200
  },
  {
    "url": "/users",
    "method": "POST",
    "body": { "name": "John" },
    "expectedStatus": 201
  }
]
```

---

## `integr8 coverage`

Analyze endpoint test coverage.

### Usage

```bash
integr8 coverage [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config <path>` | Config file | Auto-detect |
| `--type <type>` | Test type | `api` |
| `--threshold <num>` | Minimum coverage % | From config |
| `--output <path>` | Report output file | `coverage-report.json` |

### Examples

```bash
# Analyze coverage
integr8 coverage

# Enforce 80% threshold
integr8 coverage --threshold 80

# Custom output
integr8 coverage --output reports/api-coverage.json
```

### Output

```
Endpoint Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  Total Endpoints:    15
  Tested Endpoints:   12 (80.0%)
  Untested Endpoints: 3 (20.0%)

By HTTP Method:
  GET       8/10  (80.0%)  ████████████████░░░░
  POST      3/4   (75.0%)  ███████████████░░░░░
  DELETE    1/1   (100.0%) ████████████████████
```

[Learn more about coverage →](./coverage.md)

---

## `integr8 cleanup`

Clean up orphaned containers and networks.

### Usage

```bash
integr8 cleanup [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--force` | `-f` | Skip confirmation | `false` |

### Examples

```bash
# Clean up (with confirmation)
integr8 cleanup

# Force cleanup
integr8 cleanup --force
```

### What It Cleans

- Integr8 containers (prefixed with `worker_`)
- Testcontainers networks
- Unused Docker volumes

---

## Global Options

Available for all commands:

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

---

## Configuration File Detection

Integr8 automatically detects config files in this order:

1. Specified via `--config` option
2. `integr8.{test-type}.config.js`
3. `integr8.{test-type}.config.json`
4. `integr8.api.config.js`
5. `integr8.api.config.json`

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Configuration error |
| `3` | Test failure |
| `4` | Coverage threshold not met |

## Next Steps

- [Configuration Guide](./configuration.md)
- [Writing Tests](./writing-tests.md)
- [Coverage Analysis](./coverage.md)
- [Scanning Configuration](./scan-configuration.md)

