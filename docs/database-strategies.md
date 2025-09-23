# Database Strategies in Integr8

Integr8 provides multiple database strategies for test isolation, each optimized for different use cases and performance requirements.

## Available Strategies

### 1. Savepoint Strategy (`savepoint`)
**Best for**: PostgreSQL, MySQL with transaction support
**Performance**: ⚡⚡⚡⚡⚡ (Fastest)
**Isolation**: ⭐⭐⭐ (Good)

Uses database savepoints for fast rollback between tests.

```typescript
export default createConfig({
  dbStrategy: 'savepoint',
  services: [createPostgresService()]
});
```

**Pros:**
- Fastest execution
- Minimal resource usage
- Works with most SQL databases

**Cons:**
- Requires transaction support
- Limited isolation (shared schema)
- Can have side effects in complex scenarios

### 2. Schema Strategy (`schema`)
**Best for**: PostgreSQL, MySQL, SQL Server
**Performance**: ⚡⚡⚡⚡ (Fast)
**Isolation**: ⭐⭐⭐⭐ (Very Good)

Creates separate schemas for each test.

```typescript
export default createConfig({
  dbStrategy: 'schema',
  parallelIsolation: 'schema'
});
```

**Pros:**
- Good isolation
- Fast setup/teardown
- Works with most SQL databases
- Supports parallel testing

**Cons:**
- Slightly slower than savepoint
- Schema management overhead

### 3. Database Strategy (`database`)
**Best for**: MongoDB, NoSQL databases
**Performance**: ⚡⚡⚡ (Medium)
**Isolation**: ⭐⭐⭐⭐⭐ (Excellent)

Creates separate databases for each test.

```typescript
export default createConfig({
  dbStrategy: 'database',
  services: [createMongoService()]
});
```

**Pros:**
- Complete isolation
- Works with any database type
- No side effects between tests

**Cons:**
- Slower setup/teardown
- Higher resource usage
- Database creation overhead

### 4. Snapshot Strategy (`snapshot`)
**Best for**: Any database with volume support
**Performance**: ⚡⚡ (Slow)
**Isolation**: ⭐⭐⭐⭐⭐ (Excellent)

Uses Docker volume snapshots for complete state management.

```typescript
export default createConfig({
  dbStrategy: 'snapshot'
});
```

**Pros:**
- Complete isolation
- Works with any database
- Perfect state restoration

**Cons:**
- Slowest execution
- High resource usage
- Requires volume support

## Hybrid Strategies

### 5. Hybrid Savepoint-Schema (`hybrid-savepoint-schema`)
**Best for**: Complex PostgreSQL applications
**Performance**: ⚡⚡⚡ (Medium)
**Isolation**: ⭐⭐⭐⭐ (Very Good)

Combines savepoints for fast rollback with schemas for isolation.

```typescript
export default createConfig({
  dbStrategy: 'hybrid-savepoint-schema'
});
```

### 6. Hybrid Schema-Database (`hybrid-schema-database`)
**Best for**: Multi-tenant applications
**Performance**: ⚡⚡ (Slow)
**Isolation**: ⭐⭐⭐⭐⭐ (Excellent)

Uses schemas for structure and databases for complete isolation.

```typescript
export default createConfig({
  dbStrategy: 'hybrid-schema-database'
});
```

### 7. Transactional Schema (`transactional-schema`)
**Best for**: High-performance testing
**Performance**: ⚡⚡⚡⚡ (Fast)
**Isolation**: ⭐⭐⭐⭐ (Very Good)

Uses transactions within schemas for optimal performance.

```typescript
export default createConfig({
  dbStrategy: 'transactional-schema'
});
```

## Performance Comparison

| Strategy | Setup Time | Teardown Time | Memory Usage | Isolation Level |
|----------|------------|---------------|--------------|-----------------|
| savepoint | ~1ms | ~1ms | Low | Good |
| schema | ~50ms | ~30ms | Medium | Very Good |
| database | ~200ms | ~100ms | High | Excellent |
| snapshot | ~1000ms | ~500ms | Very High | Excellent |
| hybrid-savepoint-schema | ~60ms | ~40ms | Medium | Very Good |
| hybrid-schema-database | ~250ms | ~150ms | High | Excellent |
| transactional-schema | ~40ms | ~20ms | Medium | Very Good |

## Choosing the Right Strategy

### For Development/CI
```typescript
// Fast feedback loop
dbStrategy: 'savepoint'
```

### For Integration Tests
```typescript
// Good balance of speed and isolation
dbStrategy: 'schema'
```

### For E2E Tests
```typescript
// Complete isolation
dbStrategy: 'database'
```

### For Complex Scenarios
```typescript
// Maximum isolation with good performance
dbStrategy: 'hybrid-savepoint-schema'
```

## Configuration Examples

### PostgreSQL with TypeORM
```typescript
export default createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      }
    })
  ],
  dbStrategy: 'savepoint',
  parallelIsolation: 'schema',
  seed: createTypeORMEntitiesSeedConfig(
    [User, Product, Order],
    sampleData,
    { clearBeforeSeed: true, runMigrations: false }
  )
});
```

### MongoDB with Mongoose
```typescript
export default createConfig({
  services: [
    createMongoService('mongo', {
      environment: {
        MONGO_INITDB_DATABASE: 'testdb'
      }
    })
  ],
  dbStrategy: 'database',
  seed: createSeedConfig('npm run seed:mongo')
});
```

### Multi-Database Setup
```typescript
export default createConfig({
  services: [
    createPostgresService('postgres'),
    createMongoService('mongo'),
    createRedisService('redis')
  ],
  dbStrategy: 'hybrid-schema-database',
  parallelIsolation: 'db'
});
```

## Performance Monitoring

Integr8 automatically tracks performance metrics for each strategy:

```typescript
// Get performance metrics
const metrics = dbStateManager.getPerformanceMetrics();

// Get average operation time
const avgTime = dbStateManager.getAverageOperationTime('createSavepoint');

// Get strategy performance comparison
const performance = dbStateManager.getStrategyPerformance();
console.log(performance);
// Output: { savepoint: 1.2, schema: 45.6, database: 180.3 }
```

## Seeding Strategies

Integr8 provides flexible seeding strategies to match different testing needs:

### Basic Seeding Strategies

```typescript
// 1. Seed once before all tests (fastest)
seed: createOnceSeedConfig('npm run seed')

// 2. Seed before each file, restore after (balanced)
seed: createPerFileSeedConfig('npm run seed')

// 3. Seed before each test, restore after (maximum isolation)
seed: createPerTestSeedConfig('npm run seed')

// 4. Custom scenarios (maximum flexibility)
seed: createCustomSeedConfig([
  {
    name: 'admin-tests',
    condition: (ctx) => ctx.fileName?.includes('admin'),
    seedData: adminData,
    restoreAfter: true
  }
])
```

### Seeding Strategy Comparison

| Strategy | Speed | Isolation | Use Case |
|----------|-------|-----------|----------|
| `once` | ⚡⚡⚡⚡⚡ | ⭐⭐ | Development, Unit Tests |
| `per-file` | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Integration Tests, CI/CD |
| `per-test` | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | E2E Tests, Complex Scenarios |
| `custom` | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Special Requirements |

## Integration with Seeding Strategies

Database strategies work together with seeding strategies to provide complete test isolation:

### How They Work Together

- **DB Strategy** determines **HOW** data is isolated between tests
- **Seed Strategy** determines **WHEN** data is added to tests
- **Restore Strategy** determines **HOW** data is restored after tests

### Common Combinations

| DB Strategy | Seed Strategy | Result | Use Case |
|-------------|---------------|--------|----------|
| `savepoint` | `once` | ⚡⚡⚡⚡⚡ ⭐⭐ | Development, Unit Tests |
| `savepoint` | `per-file` | ⚡⚡⚡⚡ ⭐⭐⭐ | Fast Integration Tests |
| `schema` | `per-file` | ⚡⚡⚡ ⭐⭐⭐⭐ | CI/CD, Integration Tests |
| `database` | `per-test` | ⚡⚡ ⭐⭐⭐⭐⭐ | E2E Tests, Complex Scenarios |
| `hybrid-savepoint-schema` | `custom` | ⚡⚡⚡ ⭐⭐⭐⭐ | Complex Applications |

### Example Integration

```typescript
// Savepoint + Per-File: Fast with good isolation
export const config = createConfig({
  dbStrategy: 'savepoint',        // Fast rollbacks
  seed: createPerFileSeedConfig('npm run seed'), // Seed before each file
  // Result: Each file gets fresh data, fast rollbacks between files
});

// Database + Per-Test: Maximum isolation
export const config = createConfig({
  dbStrategy: 'database',         // Complete isolation
  seed: createPerTestSeedConfig('npm run seed'), // Seed before each test
  // Result: Each test gets its own database with fresh data
});
```

## Timeout Configuration

Integr8 provides flexible timeout configuration to prevent tests from hanging and provide better control over execution.

### Default Timeouts

```typescript
export default createConfig({
  services: [createPostgresService()],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  // Default timeouts:
  testTimeout: 30000,      // 30 seconds for individual tests
  setupTimeout: 10000,     // 10 seconds for setup
  teardownTimeout: 5000    // 5 seconds for teardown
});
```

### Timeout Presets

```typescript
// Fast execution (development)
...createFastTimeoutConfig()    // 15s test, 5s setup, 2s teardown

// CI/CD optimized
...createCITimeoutConfig()      // 45s test, 15s setup, 7s teardown

// E2E tests
...createE2ETimeoutConfig()     // 120s test, 20s setup, 10s teardown

// Custom timeouts
...createTimeoutConfig(60000, 20000, 10000) // 60s test, 20s setup, 10s teardown
```

### Timeout Best Practices

| Test Type | Test Timeout | Setup Timeout | Teardown Timeout | Use Case |
|-----------|--------------|---------------|------------------|----------|
| Unit Tests | 10s | 3s | 1s | Fast feedback |
| Integration Tests | 45s | 15s | 7s | Balanced |
| E2E Tests | 120s | 20s | 10s | Full scenarios |
| Performance Tests | 300s | 60s | 30s | Load testing |

## Best Practices

1. **Start with savepoint** for development
2. **Use schema** for integration tests
3. **Use database** for E2E tests
4. **Monitor performance** and adjust accordingly
5. **Use hybrid strategies** for complex scenarios
6. **Consider parallel isolation** for CI/CD
7. **Choose seeding strategy** based on your needs
8. **Use custom scenarios** for special requirements
9. **Combine DB and seed strategies** for optimal results
10. **Consider MongoDB limitations** (no savepoints)
11. **Configure appropriate timeouts** for your test scenarios
12. **Use timeout presets** for common scenarios

## Troubleshooting

### Savepoint Issues
- Ensure database supports transactions
- Check for long-running transactions
- Verify connection pooling settings

### Schema Issues
- Check database permissions
- Verify schema naming conflicts
- Ensure proper cleanup

### Database Issues
- Check database creation limits
- Verify connection limits
- Monitor resource usage

### Snapshot Issues
- Ensure Docker volume support
- Check available disk space
- Verify snapshot permissions
