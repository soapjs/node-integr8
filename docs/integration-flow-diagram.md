# Integration Flow Diagram: Seeding + DB Strategies

## 🔄 General Flow

```
START TEST SUITE
       ↓
   DB STRATEGY
   (Prepare isolation)
       ↓
   SEED STRATEGY
   (Add data)
       ↓
   RUN TESTS
       ↓
   SEED RESTORE
   (Restore data)
       ↓
   DB RESTORE
   (Restore isolation)
       ↓
   NEXT TEST/FILE
```

## 📊 Detailed Flows

### 1. SAVEPOINT + PER-FILE

```
Start
  ↓
Create Savepoint (sp_1)
  ↓
Run Seed Command
  ↓
Test File 1
  ↓
Rollback to Savepoint (sp_1) ← Restores state before seeding
  ↓
Create Savepoint (sp_2)
  ↓
Run Seed Command
  ↓
Test File 2
  ↓
Rollback to Savepoint (sp_2)
```

### 2. SCHEMA + PER-FILE

```
Start
  ↓
Create Schema (test_file1_worker1)
  ↓
Run Seed Command (in new schema)
  ↓
Test File 1 (uses new schema)
  ↓
Drop Schema (test_file1_worker1) ← Removes entire schema with data
  ↓
Create Schema (test_file2_worker1)
  ↓
Run Seed Command (in new schema)
  ↓
Test File 2 (uses new schema)
  ↓
Drop Schema (test_file2_worker1)
```

### 3. DATABASE + PER-TEST

```
Start
  ↓
Create Database (test_test1_worker1)
  ↓
Run Seed Command (in new database)
  ↓
Test 1 (uses new database)
  ↓
Drop Database (test_test1_worker1) ← Removes entire database
  ↓
Create Database (test_test2_worker1)
  ↓
Run Seed Command (in new database)
  ↓
Test 2 (uses new database)
  ↓
Drop Database (test_test2_worker1)
```

## 🎯 Selection Matrix

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│                 │   SAVEPOINT  │    SCHEMA    │   DATABASE   │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ ONCE            │ ⚡⚡⚡⚡⚡ ⭐⭐   │ ⚡⚡⚡⚡ ⭐⭐⭐   │ ⚡⚡⚡ ⭐⭐⭐⭐  │
│ PER-FILE        │ ⚡⚡⚡⚡ ⭐⭐⭐   │ ⚡⚡⚡ ⭐⭐⭐⭐  │ ⚡⚡ ⭐⭐⭐⭐⭐ │
│ PER-TEST        │ ⚡⚡⚡ ⭐⭐⭐⭐  │ ⚡⚡ ⭐⭐⭐⭐⭐ │ ⚡ ⭐⭐⭐⭐⭐ │
│ CUSTOM          │ ⚡⚡⚡ ⭐⭐⭐⭐  │ ⚡⚡ ⭐⭐⭐⭐⭐ │ ⚡ ⭐⭐⭐⭐⭐ │
└─────────────────┴──────────────┴──────────────┴──────────────┘

Legend:
⚡ = Speed (more = faster)
⭐ = Isolation (more = better isolation)
```

## 🔧 Code Implementation

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

## 💡 Key Principles

1. **DB Strategy** determines **HOW** data is isolated
2. **Seed Strategy** determines **WHEN** data is added
3. **Restore Strategy** determines **HOW** data is restored
4. **Combination** gives different levels of speed and isolation

## 🚨 Important Notes

- **MongoDB**: Doesn't support savepoints → use `database` strategy
- **Parallel Tests**: `schema` and `database` are safe
- **Performance**: `savepoint` + `once` = fastest
- **Isolation**: `database` + `per-test` = best isolation