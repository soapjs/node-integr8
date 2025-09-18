# Route Discovery Examples

SoapJS Integr8 supports discovering routes from any framework by executing commands. Here are examples for different frameworks:

## SoapJS

```bash
# Generate tests using SoapJS route discovery
npx integr8 generate --command "npx soap list-routes" --format json
```

## NestJS

```bash
# Using @nestjs/cli (if available)
npx integr8 generate --command "npx nest list-routes" --format json

# Using custom script
npx integr8 generate --command "node scripts/list-routes.js" --format json
```

## Express.js

```bash
# Using express-list-routes package
npx integr8 generate --command "npx express-list-routes" --format text

# Using custom script
npx integr8 generate --command "node scripts/list-express-routes.js" --format json
```

## Fastify

```bash
# Using custom script
npx integr8 generate --command "node scripts/list-fastify-routes.js" --format json
```

## Custom Scripts

### Express.js Route Lister

```javascript
// scripts/list-express-routes.js
const express = require('express');
const app = require('../src/app'); // Your Express app

const routes = [];

// Extract routes from Express app
app._router.stack.forEach(middleware => {
  if (middleware.route) {
    const methods = Object.keys(middleware.route.methods);
    methods.forEach(method => {
      routes.push({
        method: method.toUpperCase(),
        path: middleware.route.path,
        controller: 'express'
      });
    });
  }
});

console.log(JSON.stringify(routes, null, 2));
```

### NestJS Route Lister

```typescript
// scripts/list-nest-routes.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function listRoutes() {
  const app = await NestFactory.create(AppModule);
  const server = app.getHttpServer();
  
  const routes = [];
  
  // Extract routes from NestJS app
  // This is a simplified example - you might need to adapt based on your setup
  const router = server._router;
  
  console.log(JSON.stringify(routes, null, 2));
  await app.close();
}

listRoutes().catch(console.error);
```

### Fastify Route Lister

```javascript
// scripts/list-fastify-routes.js
const fastify = require('fastify');
const app = require('../src/app'); // Your Fastify app

const routes = [];

// Extract routes from Fastify app
app.printRoutes({ commonPrefix: false }).split('\n').forEach(line => {
  const match = line.match(/^(\w+)\s+(.+)$/);
  if (match) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      controller: 'fastify'
    });
  }
});

console.log(JSON.stringify(routes, null, 2));
```

## Output Formats

### JSON Format

```json
[
  {
    "method": "GET",
    "path": "/users",
    "controller": "UsersController"
  },
  {
    "method": "POST",
    "path": "/users",
    "controller": "UsersController"
  }
]
```

### Text Format

```
GET /users
POST /users
PUT /users/:id
DELETE /users/:id
```

## CLI Examples

```bash
# Basic usage with SoapJS
npx integr8 generate --command "npx soap list-routes"

# Custom command with timeout
npx integr8 generate --command "node scripts/list-routes.js" --timeout 10000

# Different working directory
npx integr8 generate --command "npx soap list-routes" --cwd ./src

# Force text format
npx integr8 generate --command "npx express-list-routes" --format text

# Generate with scenarios
npx integr8 generate --command "npx soap list-routes" --scenarios

# Endpoint-based tests
npx integr8 generate --command "npx soap list-routes" --type endpoint
```

## Configuration in integr8.config.ts

```typescript
export default {
  // ... other config
  routes: {
    command: 'npx soap list-routes',
    outputFormat: 'json',
    timeout: 30000,
    workingDirectory: process.cwd(),
    environment: {
      NODE_ENV: 'test'
    }
  }
};
```

## Troubleshooting

### Command Not Found
```bash
# Make sure the command is available in PATH
which npx soap list-routes

# Or use full path
npx integr8 generate --command "/usr/local/bin/soap list-routes"
```

### Timeout Issues
```bash
# Increase timeout for slow commands
npx integr8 generate --command "node scripts/list-routes.js" --timeout 60000
```

### Format Detection
```bash
# Force specific format if auto-detection fails
npx integr8 generate --command "custom-command" --format json
```
