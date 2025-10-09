# Integr8 Documentation

Welcome to the Integr8 documentation! This guide will help you get the most out of integration testing with real services.

## 📚 Table of Contents

### Getting Started

- **[Configuration Guide](./configuration.md)** - Complete configuration reference
- **[Writing Tests](./writing-tests.md)** - How to write effective integration tests
- **[CLI Commands](./cli-commands.md)** - Complete command reference

### Core Concepts

- **[Database Strategies](./database-strategies.md)** - Isolation strategies (savepoint, schema, snapshot)
- **[Seeding Database](./seeding-database.md)** - Database seeding strategies and best practices
- **[Override System](./override-system.md)** - Mock services and dependencies dynamically
- **[Coverage Analysis](./coverage.md)** - Track and enforce endpoint coverage

### Discovery & Generation

- **[Scan Configuration](./scan-configuration.md)** - Endpoint discovery configuration
- **[Decorator Scanning](./decorator-scanning.md)** - Auto-scan NestJS decorators
- **[Config Discovery](./config-discovery.md)** - Route discovery methods

### Framework Integration

- **[NestJS Integration](./nestjs-integration.md)** - Using Integr8 with NestJS
- **[Express Integration](./express-integration.md)** - Using Integr8 with Express

### Advanced Topics

- **[Logging](./logging.md)** - Configure logging and debugging
- **[Roadmap](./roadmap.md)** - Future plans and feature requests

## 🎯 Quick Links

### By Use Case

**I want to...**

- **Get started quickly** → [Quick Start (README)](../README.md#-quick-start)
- **Configure my environment** → [Configuration Guide](./configuration.md)
- **Write my first test** → [Writing Tests](./writing-tests.md)
- **Test a NestJS app** → [NestJS Integration](./nestjs-integration.md)
- **Test an Express app** → [Express Integration](./express-integration.md)
- **Manage database state** → [Database Strategies](./database-strategies.md)
- **Seed test data** → [Seeding Database](./seeding-database.md)
- **Auto-generate tests** → [Decorator Scanning](./decorator-scanning.md)
- **Check test coverage** → [Coverage Analysis](./coverage.md)
- **Mock external services** → [Override System](./override-system.md)
- **Debug my tests** → [Logging](./logging.md)
- **Use in CI/CD** → [CLI Commands](./cli-commands.md#integr8-ci)

### By Topic

**Services & Infrastructure**
- Databases: PostgreSQL, MySQL, MongoDB, Redis
- Messaging: RabbitMQ, Kafka
- Storage: MinIO (S3-compatible)
- Custom services

**Testing Features**
- HTTP endpoint testing
- Database transactions
- Parallel execution
- Coverage reporting
- Test generation

**Developer Experience**
- Interactive CLI
- Colored output
- Watch mode
- TypeScript support
- Auto-discovery

## 🤔 Common Questions

### How is this different from Supertest?

Integr8 provides:
- Real database containers (not mocks)
- Database state management (savepoints, schemas)
- Multi-service orchestration
- Parallel test isolation
- Coverage analysis
- Auto-discovery and generation

### Can I use this with my existing tests?

Yes! Integr8 complements your existing test suite. You can gradually migrate or keep both.

### Does it work with Jest/Vitest?

Yes, Integr8 works with any test framework. Examples use Jest but Vitest is fully supported.

### How fast are the tests?

With savepoint strategy:
- First test: ~2-3s (environment startup)
- Subsequent tests: ~50-200ms each
- Parallel execution: Linear scaling with workers

### What about CI/CD?

Integr8 has built-in CI support:
```bash
npx integr8 ci
```

Works with GitHub Actions, GitLab CI, CircleCI, Jenkins, etc.

## 📖 Learning Path

### Beginner
1. [Quick Start](../README.md#-quick-start)
2. [Writing Tests](./writing-tests.md)
3. [CLI Commands](./cli-commands.md)

### Intermediate
4. [Configuration Guide](./configuration.md)
5. [Database Strategies](./database-strategies.md)
6. [Seeding Database](./seeding-database.md)

### Advanced
7. [Override System](./override-system.md)
8. [Decorator Scanning](./decorator-scanning.md)
9. [Coverage Analysis](./coverage.md)

### Expert
10. [Config Discovery](./config-discovery.md)
11. [Scan Configuration](./scan-configuration.md)
12. Custom adapters and extensions

## 💡 Examples

Check out the [examples/](../examples/) directory for:
- Express integration example
- NestJS integration example
- Different seeding strategies
- Coverage configuration
- Scan vs Create comparison

## 🆘 Need Help?

- 📖 Read the docs (you're here!)
- 🐛 [Report an issue](https://github.com/soapjs/node-integr8/issues)
- 💬 [Start a discussion](https://github.com/soapjs/node-integr8/discussions)
- 🌐 [Visit SoapJS Docs](https://docs.soapjs.com)

## 🤝 Contributing

Want to improve the docs?
- Fix typos or unclear sections
- Add more examples
- Translate to other languages
- Write tutorials

See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Happy Testing!** 🧪

