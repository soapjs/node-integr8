# Endpoint Coverage Analysis

Integr8 can analyze which of your API endpoints are covered by tests and generate a detailed coverage report.

## How It Works

The `coverage` command:
1. **Scans all available endpoints** using your scan configuration (decorators or discovery)
2. **Parses your test files** to find HTTP calls (`ctx.getHttp().get('/path')`)
3. **Matches endpoints** with intelligent path normalization (`/users/123` matches `/users/:id`)
4. **Generates report** showing coverage by HTTP method
5. **Saves JSON** for CI/CD integration
6. **Checks threshold** and fails if coverage is too low

## Configuration

Add `coverage` to your `integr8.config.json`:

```json
{
  "scan": {
    "decorators": {
      "enabled": true,
      "framework": "nestjs",
      "paths": ["src"]
    }
  },
  "coverage": {
    "output": "coverage-report.json",
    "threshold": 70
  },
  "testDir": "integr8/tests"
}
```

### Options

- `output` - Path for JSON report (required)
- `threshold` - Minimum coverage percentage (optional)
  - If set > 0, command fails with exit code 1 if coverage is below threshold
  - Perfect for CI/CD pipelines

## Usage

### Basic Usage

```bash
# Analyze coverage (auto-detects config)
npx integr8 coverage

# Output:
Endpoint Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  Total Endpoints:    45
  Tested Endpoints:   32 (71.1%)
  Untested Endpoints: 13 (28.9%)

By HTTP Method:
  GET     15/20  (75.0%)  ████████████████░░░░
  POST    10/15  (66.7%)  █████████████░░░░░░░
  PUT      4/6   (66.7%)  █████████████░░░░░░░
  DELETE   3/4   (75.0%)  ████████████████░░░░

⚠️  Untested Endpoints (13):
  ❌ GET     /api/v1/admin/settings
  ❌ GET     /api/v1/reports/monthly
  ❌ POST    /api/v1/notifications
  ...

Report saved to: coverage-report.json
✅ Coverage 71.1% meets threshold 70%
```

### With Options

```bash
# Specify config
npx integr8 coverage --config integr8.api.config.js

# Use test type for auto-detection
npx integr8 coverage --test-type e2e

# Override threshold
npx integr8 coverage --threshold 80

# Custom output path
npx integr8 coverage --output reports/coverage.json
```

## Path Matching Intelligence

The coverage analyzer intelligently matches paths with parameters:

### Example Matches

```
✅ /users/:id     matches /users/123
✅ /users/:id     matches /users/abc123  
✅ /posts/:id/comments/:commentId  matches /posts/456/comments/789

❌ /users/:id     DOES NOT match /users/123/profile
❌ /users         DOES NOT match /users/123
```

### What Counts as a Parameter

- **Numbers**: `123`, `456`
- **UUIDs**: `550e8400-e29b-41d4-a716-446655440000`
- **MongoDB ObjectIds**: `507f1f77bcf86cd799439011`
- **Short IDs**: `a1`, `xyz` (max 3 chars, excluding common words like `api`, `v1`)

### Common Words Excluded

These are NOT treated as parameters:
- `api`, `v1`, `v2`
- `new`, `all`, `me`

## Test File Scanning

The analyzer looks for HTTP calls in your test files:

### Recognized Patterns

```typescript
// Basic call
ctx.getHttp().get('/users')

// With service name
ctx.getHttp('app').post('/users', data)

// With await
await ctx.getHttp().delete('/users/123')

// With query params (ignored in matching)
ctx.getHttp().get('/users?page=1&limit=10')  // Matches /users
```

### Supported Methods

- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `HEAD`, `OPTIONS`

## CI/CD Integration

### GitHub Actions

```yaml
name: API Coverage

on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      
      # Run coverage check
      - run: npx integr8 coverage --threshold 70
      
      # Upload report as artifact
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: coverage-report
          path: coverage-report.json
```

### GitLab CI

```yaml
coverage:
  script:
    - npm install
    - npx integr8 coverage --threshold 70
  artifacts:
    reports:
      coverage_report:
        coverage_format: json
        path: coverage-report.json
```

### Fail Build on Low Coverage

```bash
# In your CI script
npx integr8 coverage --threshold 80

# Exit code:
# 0 - Coverage >= threshold
# 1 - Coverage < threshold
```

## Integration with Scan

If you have `coverage` configured, the `scan` command automatically shows coverage after scanning:

```bash
npx integr8 scan --decorators --generate-tests

# Output:
Found 45 endpoints from decorators
✅ Test generation completed!

Analyzing endpoint coverage...
Scanning available endpoints...
   Found 45 endpoints
...
```

This only happens if `coverage` is in your config - no extra flags needed!

## JSON Report Format

```json
{
  "timestamp": "2025-10-08T10:30:00.000Z",
  "summary": {
    "total": 45,
    "tested": 32,
    "untested": 13,
    "percentage": 71.11
  },
  "byMethod": {
    "GET": {
      "total": 20,
      "tested": 15,
      "percentage": 75.0
    },
    "POST": {
      "total": 15,
      "tested": 10,
      "percentage": 66.67
    }
  },
  "untested": [
    {
      "method": "GET",
      "path": "/api/v1/admin/settings",
      "source": "src/controllers/admin.controller.ts"
    }
  ],
  "tested": [
    {
      "method": "GET",
      "path": "/api/v1/users",
      "testFile": "integr8/tests/users.get.test.ts"
    }
  ]
}
```

## Use Cases

### 1. Track Coverage Over Time

```bash
# Generate reports with dates
npx integr8 coverage --output "coverage-$(date +%Y-%m-%d).json"

# Compare with previous
```

### 2. Find Untested Endpoints

```bash
npx integr8 coverage | grep "❌"
```

### 3. Set Coverage Gates

```json
{
  "coverage": {
    "threshold": 80,
    "output": "coverage-report.json"
  }
}
```

```bash
# Fails if < 80%
npx integr8 coverage
```

### 4. Track Progress

```bash
# Before adding tests
npx integr8 coverage
# Coverage: 60%

# After adding tests
npx integr8 coverage  
# Coverage: 75% ✅
```

## Best Practices

1. **Set realistic thresholds** - Start at 60-70%, gradually increase
2. **Run in CI** - Prevent coverage regression
3. **Focus on critical paths** - Not all endpoints need equal coverage
4. **Combine with scan** - Generate tests and check coverage together
5. **Track over time** - Save reports to monitor progress

## Troubleshooting

### "No scan configuration found"

Add scan configuration to your config:

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

### "Test directory not found"

Specify `testDir` in config:

```json
{
  "testDir": "./tests/integration"
}
```

### Coverage seems wrong

1. **Check test file patterns** - Must include `.test.` or `.spec.`
2. **Check HTTP calls format** - Use `ctx.getHttp().method(path)`
3. **Verify path matching** - `/users/123` should match `/users/:id`

### No endpoints detected in tests

Make sure your tests use the Integr8 HTTP client:

```typescript
// ✅ Good
const ctx = getEnvironmentContext();
await ctx.getHttp().get('/users');

// ❌ Won't be detected
await axios.get('http://localhost:3000/users');
```

## Examples

See example configuration:
- `examples/integr8.scan.config.json` - With coverage configured
- `examples/nestjs-integration/integr8.config.json` - Full setup

## Future Enhancements

Planned features:
- Historical tracking
- HTML report generation
- Coverage badges
- Diff reports (compare two coverage files)
- Coverage by resource/module

