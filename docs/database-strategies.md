# Database Strategies Explained

## What are Database Strategies?

When you run tests, you need to make sure each test starts with a clean database state. Think of it like resetting a game board before each new game - you want to make sure no leftover pieces from the previous game affect the new one.

Database strategies are different ways to achieve this "clean slate" for your tests. Each strategy has different trade-offs between speed, isolation, and complexity.

## Why Do We Need Database Strategies?

Imagine you have a test that creates a user account, and another test that checks if a user exists. If the first test doesn't clean up after itself, the second test might find the user from the first test and give you a false positive result.

Database strategies solve this by ensuring each test gets its own isolated database environment.

## Available Strategies

### 1. Savepoint Strategy ⚡⚡⚡⚡⚡ (Fastest)

**What it does:** Uses database transactions to create "checkpoints" that can be rolled back.

**How it works:**
- Before each test: Creates a savepoint (like a bookmark)
- After each test: Rolls back to the savepoint (like undoing all changes)

**Pros:**
- ⚡⚡⚡⚡⚡ Extremely fast (~1ms setup time)
- Perfect for unit tests and development
- Uses minimal database resources

**Cons:**
- Only works with SQL databases (PostgreSQL, MySQL)
- Not suitable for tests that need to test transaction behavior
- Can't handle tests that modify database structure

**Best for:** Unit tests, development, simple integration tests

**Example use case:** Testing a function that calculates user statistics - you don't need to test database transactions, just the calculation logic.

---

### 2. Schema Strategy ⚡⚡⚡⚡ (Balanced)

**What it does:** Creates separate database schemas (like separate folders) for each test.

**How it works:**
- Before each test: Creates a new schema with all your tables
- After each test: Drops the entire schema

**Pros:**
- ⚡⚡⚡⚡ Good speed (~50ms setup time)
- Complete isolation between tests
- Can test transaction behavior
- Works with complex database operations

**Cons:**
- Slower than savepoints
- Only works with SQL databases
- Uses more database resources

**Best for:** Integration tests, API tests, most common use cases

**Example use case:** Testing an API endpoint that creates a user and sends a welcome email - you need to test the full flow including database operations.

---

### 3. Database Strategy ⚡⚡⚡ (Isolated)

**What it does:** Creates completely separate databases for each test.

**How it works:**
- Before each test: Creates a new database with all your tables and data
- After each test: Drops the entire database

**Pros:**
- ⚡⚡⚡ Complete isolation
- Works with all database types (PostgreSQL, MySQL, MongoDB)
- Can test complex scenarios
- No interference between tests

**Cons:**
- Slower setup (~200ms)
- Uses more system resources
- Takes longer to clean up

**Best for:** End-to-end tests, MongoDB tests, complex integration scenarios

**Example use case:** Testing a complete user registration flow with email verification, password hashing, and profile creation.

---

### 4. Snapshot Strategy ⚡⚡ (Universal)

**What it does:** Creates snapshots of the database state that can be restored.

**How it works:**
- Before tests: Creates a snapshot of the clean database
- After each test: Restores the snapshot

**Pros:**
- ⚡⚡ Works with all database types
- Can handle very complex scenarios
- Complete isolation
- Good for testing database migrations

**Cons:**
- Slowest option (~1000ms setup)
- Requires snapshot support
- Uses significant disk space

**Best for:** Complex scenarios, database migration tests, when other strategies don't work

**Example use case:** Testing a complex data migration that affects multiple tables and requires specific data states.

---

## How to Choose the Right Strategy

### For Beginners

**Start with Schema Strategy** - it's the sweet spot between speed and reliability for most use cases.

### Decision Tree

```
Do you need to test database transactions?
├─ Yes → Use Schema Strategy or Database Strategy
└─ No → Use Savepoint Strategy (if using SQL database)

Are you using MongoDB?
├─ Yes → Use Database Strategy or Snapshot Strategy
└─ No → Any strategy works

Do you need maximum speed?
├─ Yes → Use Savepoint Strategy (SQL only)
└─ No → Use Schema Strategy

Do you have complex test scenarios?
├─ Yes → Use Database Strategy or Snapshot Strategy
└─ No → Use Savepoint Strategy or Schema Strategy
```

### By Test Type

| Test Type | Recommended Strategy | Reason |
|-----------|---------------------|---------|
| Unit Tests | Savepoint | Fastest, no need for complex isolation |
| Integration Tests | Schema | Good balance of speed and isolation |
| API Tests | Schema | Need to test full request/response cycle |
| E2E Tests | Database | Complete isolation for complex scenarios |
| MongoDB Tests | Database | Only strategy that works with MongoDB |

---

## Configuration Examples


## Performance Comparison

| Strategy | Setup Time | Memory Usage | Isolation Level | Complexity |
|----------|------------|--------------|-----------------|------------|
| Savepoint | ~1ms | Low | Medium | Low |
| Schema | ~50ms | Medium | High | Low |
| Database | ~200ms | High | Very High | Medium |
| Snapshot | ~1000ms | Very High | Very High | High |

---

## Common Pitfalls and Solutions

### Problem: Tests are too slow
**Solution:** Switch to Savepoint strategy (if using SQL database)

### Problem: Tests interfere with each other
**Solution:** Switch to Schema or Database strategy

### Problem: MongoDB tests failing
**Solution:** Use Database strategy (MongoDB doesn't support savepoints)

### Problem: Transaction tests not working
**Solution:** Use Schema or Database strategy (Savepoint can't test transaction rollbacks)

### Problem: Complex test scenarios failing
**Solution:** Use Database or Snapshot strategy for maximum isolation

---

## Getting Help

If you're unsure which strategy to use:

1. **Start with Schema strategy** - it works for 90% of use cases
2. **Use interactive setup** for strategy recommendations:
   ```bash
   npx integr8 init --interactive
   ```
3. **Check the compatibility table** in the main README
4. **Test with a simple example** first, then scale up

Remember: You can always change strategies later as your test suite grows and evolves!
