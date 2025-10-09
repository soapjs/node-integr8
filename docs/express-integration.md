# Express Integration

Integr8 works seamlessly with Express applications for integration testing.

## Installation

```bash
npm install --save-dev @soapjs/integr8 @soapjs/integr8-express
```

## Quick Setup

```bash
npx integr8 init --template express --interactive
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
      framework: "express",
      
      http: {
        port: 3000,
        prefix: "/api"
      },
      
      readiness: {
        enabled: true,
        endpoint: "/health"
      },
      
      local: {
        command: "node server.js",
        cwd: "."
      }
    }
  ],
  
  databases: [
    {
      name: "postgres",
      type: "postgres",
      mode: "container",
      isolation: "savepoint",
      
      container: {
        image: "postgres:15",
        ports: [{ host: 5432, container: 5432 }],
        environment: {
          POSTGRES_DB: "testdb",
          POSTGRES_USER: "test",
          POSTGRES_PASSWORD: "test"
        }
      }
    }
  ]
};
```

## Route Discovery

### Manual Discovery Script

Create a route discovery script:

```javascript
// scripts/list-routes.js
const express = require('express');
const app = require('./app');

function listRoutes(app) {
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const methods = Object.keys(middleware.route.methods);
      methods.forEach(method => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path
        });
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods);
          methods.forEach(method => {
            routes.push({
              method: method.toUpperCase(),
              path: handler.route.path
            });
          });
        }
      });
    }
  });
  
  console.log(JSON.stringify(routes, null, 2));
}

listRoutes(app);
```

### Configure Discovery

```javascript
scan: {
  discovery: {
    command: "node scripts/list-routes.js",
    timeout: 10000
  }
}
```

### Run Discovery

```bash
integr8 scan --generate-tests
```

## Example Application

### app.js

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  const user = await db.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  res.status(201).json(user);
});

module.exports = app;
```

### server.js

```javascript
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Writing Tests

```typescript
import { 
  setupEnvironment, 
  teardownEnvironment, 
  getEnvironmentContext 
} from '@soapjs/integr8';

let ctx;

beforeAll(async () => {
  const config = require('../../integr8.api.config.js');
  await setupEnvironment(config);
  ctx = getEnvironmentContext();
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const response = await ctx.getHttp().get('/api/users');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
  
  describe('POST /api/users', () => {
    beforeEach(async () => {
      const db = ctx.getDb('postgres');
      await db.snapshot('before-test');
    });
    
    afterEach(async () => {
      const db = ctx.getDb('postgres');
      await db.restore('before-test');
    });
    
    it('should create a user', async () => {
      const response = await ctx.getHttp().post('/api/users', {
        name: 'Jane Doe',
        email: 'jane@example.com'
      });
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe('Jane Doe');
    });
  });
});
```

## Testing with Middleware

### Authentication Middleware

```javascript
// middleware/auth.js
module.exports = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Verify token...
  req.user = { id: 1, email: 'user@example.com' };
  next();
};
```

### Test with Auth

```typescript
it('should require authentication', async () => {
  const response = await ctx.getHttp().get('/api/users/me');
  expect(response.status).toBe(401);
});

it('should allow authenticated requests', async () => {
  const response = await ctx.getHttp().get('/api/users/me', {
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  
  expect(response.status).toBe(200);
});
```

## Testing with Databases

### Using pg (node-postgres)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/api/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users');
  res.json(result.rows);
});
```

### Test Database Operations

```typescript
it('should persist user to database', async () => {
  const response = await ctx.getHttp().post('/api/users', {
    name: 'John',
    email: 'john@example.com'
  });
  
  expect(response.status).toBe(201);
  
  // Verify in database
  const db = ctx.getDb('postgres');
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    ['john@example.com']
  );
  
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].name).toBe('John');
});
```

## Testing Error Handling

```javascript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});
```

```typescript
it('should handle server errors', async () => {
  // Trigger error by sending invalid data
  const response = await ctx.getHttp().post('/api/users', {
    email: 'invalid'  // Missing required field 'name'
  });
  
  expect(response.status).toBe(500);
  expect(response.data).toHaveProperty('error');
});
```

## Router-Based Apps

### Express Router

```javascript
const router = express.Router();

router.get('/users', async (req, res) => { ... });
router.post('/users', async (req, res) => { ... });

app.use('/api', router);
```

Discovery script handles routers automatically.

## Testing File Uploads

```typescript
it('should upload file', async () => {
  const formData = new FormData();
  formData.append('file', fileBuffer, 'test.jpg');
  
  const response = await ctx.getHttp().post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  expect(response.status).toBe(201);
  expect(response.data.fileUrl).toBeDefined();
});
```

## Express Adapter Features

The `@soapjs/integr8-express` adapter provides:

- **Route discovery** from Express router stack
- **Middleware introspection** for testing middleware
- **Request/Response mocking** for unit tests
- **Helper utilities** for common Express patterns

## Best Practices

1. **Use route discovery** - Automatically find all endpoints
2. **Test middleware** - Verify auth, validation, error handling
3. **Use real database** - Test actual SQL queries
4. **Leverage savepoints** - Fast test isolation
5. **Test error scenarios** - Verify error middleware

## Example: Complete Test Suite

```typescript
import { setupEnvironment, teardownEnvironment, getEnvironmentContext } from '@soapjs/integr8';

let ctx;

beforeAll(async () => {
  await setupEnvironment(require('../../integr8.api.config.js'));
  ctx = getEnvironmentContext();
});

afterAll(async () => {
  await teardownEnvironment();
});

describe('Express API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await ctx.getHttp().get('/health');
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    });
  });
  
  describe('User CRUD', () => {
    let userId;
    
    it('should create user', async () => {
      const response = await ctx.getHttp().post('/api/users', {
        name: 'John Doe',
        email: 'john@example.com'
      });
      
      expect(response.status).toBe(201);
      userId = response.data.id;
    });
    
    it('should get user', async () => {
      const response = await ctx.getHttp().get(`/api/users/${userId}`);
      
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('John Doe');
    });
    
    it('should update user', async () => {
      const response = await ctx.getHttp().put(`/api/users/${userId}`, {
        name: 'John Updated'
      });
      
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('John Updated');
    });
    
    it('should delete user', async () => {
      const response = await ctx.getHttp().delete(`/api/users/${userId}`);
      
      expect(response.status).toBe(204);
    });
  });
});
```

## Next Steps

- [Writing Tests](./writing-tests.md)
- [Configuration Guide](./configuration.md)
- [Database Strategies](./database-strategies.md)
- [Override System](./override-system.md)

