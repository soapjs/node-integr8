# Seeding and Database Strategies Integration

## 🎯 How Seeding Works with DB Strategies

### Basic Principle
**Seeding** determines **WHEN** data is added, while **DB Strategies** determine **HOW** data is isolated between tests.

## 📊 Integration Matrix

| DB Strategy | Seed Strategy | How It Works | When to Seed | When to Restore |
|-------------|---------------|--------------|--------------|-----------------|
| **savepoint** | `once` | Seed once, no restore | At start | Never |
| **savepoint** | `per-file` | Seed before file, rollback after | Before each file | After each file |
| **savepoint** | `per-test` | Seed before test, rollback after | Before each test | After each test |
| **schema** | `once` | Seed once, no restore | At start | Never |
| **schema** | `per-file` | Seed before file, drop schema after | Before each file | After each file |
| **schema** | `per-test` | Seed before test, drop schema after | Before each test | After each test |
| **database** | `once` | Seed once, no restore | At start | Never |
| **database** | `per-file` | Seed before file, drop database after | Before each file | After each file |
| **database** | `per-test` | Seed before test, drop database after | Before each test | After each test |

## 🔄 Detailed Flow

### 1. SAVEPOINT + PER-FILE SEEDING

```
1. Start Test Suite
   ↓
2. Create Savepoint (sp_1)
   ↓
3. Run Seed Command
   ↓
4. Test File 1
   ↓
5. Rollback to Savepoint (sp_1) ← Restores state before seeding
   ↓
6. Create Savepoint (sp_2)
   ↓
7. Run Seed Command
   ↓
8. Test File 2
   ↓
9. Rollback to Savepoint (sp_2)
```

### 2. SCHEMA + PER-FILE SEEDING

```
1. Start Test Suite
   ↓
2. Create Schema (test_file1_worker1)
   ↓
3. Run Seed Command (in new schema)
   ↓
4. Test File 1 (uses new schema)
   ↓
5. Drop Schema (test_file1_worker1) ← Removes entire schema with data
   ↓
6. Create Schema (test_file2_worker1)
   ↓
7. Run Seed Command (in new schema)
   ↓
8. Test File 2 (uses new schema)
   ↓
9. Drop Schema (test_file2_worker1)
```

### 3. DATABASE + PER-TEST SEEDING

```
1. Start Test Suite
   ↓
2. Create Database (test_test1_worker1)
   ↓
3. Run Seed Command (in new database)
   ↓
4. Test 1 (uses new database)
   ↓
5. Drop Database (test_test1_worker1) ← Removes entire database
   ↓
6. Create Database (test_test2_worker1)
   ↓
7. Run Seed Command (in new database)
   ↓
8. Test 2 (uses new database)
   ↓
9. Drop Database (test_test2_worker1)
```

## 💡 Concrete Configuration Examples

### Fast Development (Savepoint + Once)
```typescript
export const devConfig = createConfig({
  services: [createPostgresService()],
  dbStrategy: 'savepoint',        // Fast isolation
  seed: createOnceSeedConfig('npm run seed'), // Seed once
  // Result: Seed once at start, fast rollbacks
});
```

### CI/CD Pipeline (Schema + Per-File)
```typescript
export const cicdConfig = createConfig({
  services: [createPostgresService()],
  dbStrategy: 'schema',           // Good isolation
  seed: createPerFileSeedConfig('npm run seed'), // Seed before file
  // Result: Isolation between files, seed before each
});
```

### E2E Tests (Database + Per-Test)
```typescript
export const e2eConfig = createConfig({
  services: [createMongoService()],
  dbStrategy: 'database',         // Complete isolation
  seed: createPerTestSeedConfig('npm run seed'), // Seed before test
  // Result: Each test has its own database with data
});
```

### Hybrid Approach (Hybrid + Custom)
```typescript
export const hybridConfig = createConfig({
  services: [createPostgresService()],
  dbStrategy: 'hybrid-savepoint-schema', // Speed + isolation
  seed: createCustomSeedConfig([
    {
      name: 'unit-tests',
      condition: (ctx) => ctx.fileName?.includes('unit'),
      seedData: minimalData,
      restoreAfter: false // Fast tests
    },
    {
      name: 'integration-tests',
      condition: (ctx) => ctx.fileName?.includes('integration'),
      seedCommand: 'npm run seed:full',
      restoreAfter: true // Full isolation
    }
  ])
});
```

## ⚡ Performance vs Isolation

### Fastest (but least isolation)
```typescript
dbStrategy: 'savepoint' + seed: 'once'
// ⚡⚡⚡⚡⚡ Speed, ⭐⭐ Isolation
```

### Balanced
```typescript
dbStrategy: 'schema' + seed: 'per-file'
// ⚡⚡⚡⚡ Speed, ⭐⭐⭐⭐ Isolation
```

### Maximum isolation (but slower)
```typescript
dbStrategy: 'database' + seed: 'per-test'
// ⚡⚡⚡ Speed, ⭐⭐⭐⭐⭐ Isolation
```

## 🔧 Implementation in Code

### SeedManager + DBStateManager Integration

```typescript
class TestRunner {
  async runTestFile(fileName: string) {
    // 1. DB Strategy: Prepare isolation
    await this.dbManager.snapshot(fileName);
    
    // 2. Seed Strategy: Add data
    await this.seedManager.seedForFile(fileName);
    
    // 3. Run tests
    await this.runTests();
    
    // 4. Seed Strategy: Restore data state
    await this.seedManager.restoreAfterFile(fileName);
    
    // 5. DB Strategy: Restore isolation
    await this.dbManager.restore(fileName);
  }
}
```

## 🎯 Strategy Selection

### For Development
- **DB Strategy**: `savepoint` (fast)
- **Seed Strategy**: `once` (seed once)
- **Result**: Maximum speed, minimal isolation

### For Integration Tests
- **DB Strategy**: `schema` (good isolation)
- **Seed Strategy**: `per-file` (seed before file)
- **Result**: Balance of speed and isolation

### For E2E Tests
- **DB Strategy**: `database` (complete isolation)
- **Seed Strategy**: `per-test` (seed before test)
- **Result**: Maximum isolation, slower execution

### For Complex Scenarios
- **DB Strategy**: `hybrid-savepoint-schema` (flexibility)
- **Seed Strategy**: `custom` (custom scenarios)
- **Result**: Maximum flexibility

## 🚨 Important Notes

1. **MongoDB**: Doesn't support savepoints, use `database` strategy
2. **Parallel Tests**: `schema` and `database` strategies are safe
3. **Performance**: `savepoint` + `once` = fastest
4. **Isolation**: `database` + `per-test` = best isolation
5. **Flexibility**: `custom` seeding + `hybrid` strategies = maximum flexibility

## 📈 Monitoring

```typescript
// Check seeding status
const seedStatus = seedManager.getSeedingStatus();
console.log('Seeded files:', seedStatus.seededFiles);
console.log('Current snapshot:', seedStatus.currentSnapshot);

// Check strategy performance
const dbPerformance = dbStateManager.getStrategyPerformance();
console.log('DB Strategy performance:', dbPerformance);
```