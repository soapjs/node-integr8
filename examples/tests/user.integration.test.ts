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

describe('User API Integration Tests', () => {
  test('should respond to health check', async ({ http }) => {
    const response = await http.get('/health');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
    expect(response.data).toHaveProperty('timestamp');
  });

  test('should create a new user', async ({ http, db }) => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    const response = await http.post('/users', userData);
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('name', userData.name);
    expect(response.data).toHaveProperty('email', userData.email);
  });

  test('should retrieve all users', async ({ http }) => {
    const response = await http.get('/users');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  });

  test('should retrieve a specific user', async ({ http }) => {
    // First create a user
    const createResponse = await http.post('/users', {
      name: 'Specific User',
      email: 'specific@example.com'
    });
    
    const userId = createResponse.data.id;
    
    // Then retrieve it
    const getResponse = await http.get(`/users/${userId}`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.data).toHaveProperty('id', userId);
    expect(getResponse.data).toHaveProperty('name', 'Specific User');
  });

  test('should update a user', async ({ http }) => {
    // First create a user
    const createResponse = await http.post('/users', {
      name: 'Update User',
      email: 'update@example.com'
    });
    
    const userId = createResponse.data.id;
    
    // Then update it
    const updateResponse = await http.put(`/users/${userId}`, {
      name: 'Updated User',
      email: 'updated@example.com'
    });
    
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data).toHaveProperty('name', 'Updated User');
    expect(updateResponse.data).toHaveProperty('email', 'updated@example.com');
  });

  test('should delete a user', async ({ http }) => {
    // First create a user
    const createResponse = await http.post('/users', {
      name: 'Delete User',
      email: 'delete@example.com'
    });
    
    const userId = createResponse.data.id;
    
    // Then delete it
    const deleteResponse = await http.delete(`/users/${userId}`);
    
    expect(deleteResponse.status).toBe(204);
    
    // Verify it's deleted
    const getResponse = await http.get(`/users/${userId}`);
    expect(getResponse.status).toBe(404);
  });

  test('should handle validation errors', async ({ http }) => {
    const response = await http.post('/users', {
      // Missing required fields
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });

  test('should handle duplicate email', async ({ http }) => {
    const userData = {
      name: 'Duplicate User',
      email: 'duplicate@example.com'
    };
    
    // Create first user
    const firstResponse = await http.post('/users', userData);
    expect(firstResponse.status).toBe(201);
    
    // Try to create second user with same email
    const secondResponse = await http.post('/users', userData);
    expect(secondResponse.status).toBe(500); // Database constraint error
  });
});

describe('Database State Management', () => {
  test('should isolate database state between tests', async ({ http, db }) => {
    // This test should not be affected by previous tests
    const response = await http.get('/users');
    
    expect(response.status).toBe(200);
    // The exact count depends on the seed data, not previous test modifications
    expect(response.data.length).toBeGreaterThanOrEqual(3); // Seed data
  });

  test('should support database snapshots', async ({ http, db }) => {
    // Create a snapshot
    await db.snapshot('test-snapshot');
    
    // Modify data
    await http.post('/users', {
      name: 'Snapshot User',
      email: 'snapshot@example.com'
    });
    
    // Restore snapshot
    await db.restore('test-snapshot');
    
    // Verify data is restored
    const response = await http.get('/users');
    const snapshotUser = response.data.find((user: any) => user.email === 'snapshot@example.com');
    expect(snapshotUser).toBeUndefined();
  });
});

describe('Override System', () => {
  test('should support service overrides', async ({ http, ctx }) => {
    // Override a service (example)
    await ctx.override.service('UserService').withMock(() => ({
      findById: () => ({ id: 1, name: 'Mock User', email: 'mock@example.com' })
    }));
    
    // Test with overridden service
    const response = await http.get('/users/1');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('name', 'Mock User');
  });
});
