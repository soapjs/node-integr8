# Configuration File Discovery

Integr8 automatically discovers your configuration file, so you don't need to specify `--config` every time!

## How It Works

When you run any Integr8 command, it searches for configuration in this order:

### 1. Explicit `--config` flag (Highest Priority)
```bash
npx integr8 up --config ./custom/path/config.js
```

### 2. `.integr8rc` file
Create a `.integr8rc` file in your project root:

```json
{
  "defaultConfig": "./configs/integr8.api.config.json",
  "testType": "api"
}
```

Then just run:
```bash
npx integr8 up
# 📋 Using config from .integr8rc: ./configs/integr8.api.config.json
```

### 3. `package.json` integration
Add to your `package.json`:

```json
{
  "name": "my-app",
  "integr8": {
    "config": "./integr8.api.config.js"
  }
}
```

Then just run:
```bash
npx integr8 up
# 📋 Using config from package.json: ./integr8.api.config.js
```

### 4. Auto-detection by `--test-type`
```bash
npx integr8 up --test-type e2e
# 📋 Auto-detected config: integr8.e2e.config.js
```

Searches in this order:
- `integr8.{testType}.config.js`
- `integr8.{testType}.config.json`

### 5. Standard file names
If no `--test-type` is specified, searches for common names:

- `integr8.api.config.js`
- `integr8.api.config.json`
- `integr8.e2e.config.js`
- `integr8.e2e.config.json`
- `integr8.integration.config.js`
- `integr8.integration.config.json`
- `integr8.config.js`
- `integr8.config.json`

```bash
npx integr8 up
# 📋 Auto-detected config: integr8.api.config.js
```

### 6. Error if nothing found
If no config is found:
```bash
npx integr8 up
# ❌ No integr8 config file found. Run: npx integr8 init
```

## Examples

### Scenario 1: Simple Project (Standard Name)

Just use standard naming:
```
my-app/
├── integr8.api.config.json  ← Standard name
├── package.json
└── src/
```

Commands work without flags:
```bash
npx integr8 up        # Auto-detects integr8.api.config.json
npx integr8 test      # Auto-detects integr8.api.config.json
npx integr8 down      # Auto-detects integr8.api.config.json
```

### Scenario 2: Multiple Test Types

Different configs for different test types:
```
my-app/
├── integr8.api.config.js       ← API tests
├── integr8.e2e.config.js       ← E2E tests
├── integr8.integration.config.js ← Integration tests
└── src/
```

Use `--test-type` to select:
```bash
npx integr8 up --test-type api        # Uses integr8.api.config.js
npx integr8 up --test-type e2e        # Uses integr8.e2e.config.js
npx integr8 up --test-type integration # Uses integr8.integration.config.js
```

### Scenario 3: Custom Location with `.integr8rc`

Store config in a custom location:
```
my-app/
├── .integr8rc                 ← Points to custom location
├── configs/
│   └── integr8.custom.json   ← Actual config
└── src/
```

`.integr8rc`:
```json
{
  "defaultConfig": "./configs/integr8.custom.json"
}
```

Commands work without flags:
```bash
npx integr8 up    # Uses config from .integr8rc
```

### Scenario 4: Monorepo with `package.json`

In a monorepo, each package can define its config:
```
packages/
  api/
    ├── package.json           ← Contains integr8.config
    ├── integr8.config.js
    └── src/
  admin/
    ├── package.json           ← Contains integr8.config
    ├── integr8.config.js
    └── src/
```

`packages/api/package.json`:
```json
{
  "name": "@myapp/api",
  "integr8": {
    "config": "./integr8.config.js"
  }
}
```

### Scenario 5: Override When Needed

You can always override:
```bash
# Use auto-detected config most of the time
npx integr8 up
npx integr8 test

# Override for special cases
npx integr8 up --config ./special-test.config.js
```

## Commands Supporting Auto-Detection

All major commands support auto-detection:

- ✅ `integr8 up` - Start environment
- ✅ `integr8 down` - Stop environment  
- ✅ `integr8 test` - Run tests
- ✅ `integr8 ci` - CI mode
- ✅ `integr8 scan` - Scan endpoints
- ✅ `integr8 create` - Create test files

## Which Method Should I Use?

### Use **Standard Names** if:
- ✅ Simple project with one config
- ✅ Config in project root
- ✅ Want zero configuration

### Use **`.integr8rc`** if:
- ✅ Config in custom location
- ✅ Want to version-control the "default" choice
- ✅ Switching between configs frequently

### Use **`package.json`** if:
- ✅ Monorepo setup
- ✅ Want everything in one place
- ✅ Following Node.js conventions

### Use **`--config` flag** if:
- ✅ One-off override
- ✅ CI/CD with multiple configs
- ✅ Testing different configurations

## Tips

1. **Combine methods** - Use `.integr8rc` for default, override with `--config` when needed
2. **Use `--test-type`** - Quick way to switch between api/e2e/integration configs
3. **Check what's being used** - Commands show which config they detected
4. **Keep it simple** - Standard names work for 90% of cases

## Troubleshooting

### "No integr8 config file found"

1. Check if config file exists:
   ```bash
   ls integr8*.config.*
   ```

2. Create one:
   ```bash
   npx integr8 init
   ```

3. Or specify explicitly:
   ```bash
   npx integr8 up --config ./my-config.js
   ```

### Multiple configs found, wrong one used

Use `--test-type` or `--config` to be specific:
```bash
npx integr8 up --test-type e2e
# or
npx integr8 up --config integr8.e2e.config.js
```

### `.integr8rc` ignored

Make sure it's valid JSON:
```bash
cat .integr8rc | jq .
```

### `package.json` integr8 field ignored

Check syntax:
```json
{
  "integr8": {
    "config": "./path/to/config.js"
  }
}
```

## Examples

See working examples in:
- `examples/.integr8rc` - Example RC file
- `examples/package.json` - Example package.json integration
- `examples/integr8.scan.config.json` - Complete scan config

