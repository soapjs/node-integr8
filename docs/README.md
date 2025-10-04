# Integr8 Documentation

Welcome to the Integr8 documentation! This directory contains detailed guides to help you understand and use Integr8 effectively.

## 📚 Available Guides

### [Database Strategies Explained](./database-strategies.md)
A beginner-friendly guide to understanding database isolation strategies in Integr8. Learn about:
- What database strategies are and why you need them
- Detailed explanation of each strategy (Savepoint, Schema, Database, Snapshot)
- How to choose the right strategy for your use case
- Performance comparisons and decision trees
- Common pitfalls and solutions

### [Logging Control Guide](./logging-control.md)
Complete guide to controlling log output in Integr8. Learn about:
- What logging control is and why it matters
- Understanding different log levels (error, warn, log, info, debug)
- Configuration examples for different scenarios
- Tips and best practices for logging
- Common scenarios and solutions

### [Configuration Examples](./configuration-examples.md)
Real-world configuration examples for different scenarios:
- Basic setup and getting started
- Development, CI/CD, and debugging configurations
- Multi-service and database-specific setups
- Environment-specific configurations
- Tips and best practices

## 🚀 Quick Start

If you're new to Integr8, start here:

1. **Read the main [README](../README.md)** for installation and basic setup
2. **Choose your database strategy** using the [Database Strategies Guide](./database-strategies.md)
3. **Configure logging** using the [Logging Control Guide](./logging-control.md)
4. **Run your first test** with `npx integr8 up && npx integr8 run`

## 🎯 Common Use Cases

### I'm new to testing - where do I start?
1. Read [Database Strategies Explained](./database-strategies.md) to understand the basics
2. Start with the Schema strategy (recommended for beginners)
3. Use default logging settings initially

### My tests are too slow
1. Check [Database Strategies Explained](./database-strategies.md) for performance comparisons
2. Consider switching to Savepoint strategy (if using SQL database)
3. Adjust logging levels to reduce noise

### I'm getting too many log messages
1. Read [Logging Control Guide](./logging-control.md)
2. Set database logging to `"warn"` or `"error"`
3. Use different levels for different services

### I'm using MongoDB
1. Read [Database Strategies Explained](./database-strategies.md)
2. Use Database strategy (MongoDB doesn't support savepoints)
3. Check the MongoDB-specific examples

### I'm debugging a complex issue
1. Set logging to `"debug"` for the service you're investigating
2. Use Database or Snapshot strategy for maximum isolation
3. Check the troubleshooting sections in both guides

## 🛠️ CLI Help

Integr8 includes helpful CLI commands for setup and testing:

```bash
# Interactive setup with strategy recommendations
npx integr8 init --interactive

# Generate tests from routes
npx integr8 generate --command "npx soap list-routes" --scenarios
```

## 📖 Additional Resources

- **Main README:** [../README.md](../README.md) - Installation, setup, and basic usage
- **Examples:** [../examples/](../examples/) - Configuration examples
- **CLI Commands:** Use `npx integr8 --help` for command reference

## 🤝 Getting Help

If you need help:

1. **Check the guides** in this directory first
2. **Use interactive setup** for strategy recommendations
3. **Look at the examples** in the examples directory
4. **Check the main README** for basic setup issues

## 📝 Contributing to Documentation

Found an issue with the documentation? Want to add a new guide?

1. The documentation is written in Markdown
2. Keep explanations beginner-friendly
3. Include practical examples
4. Test any code examples you provide

Happy testing with Integr8! 🎉
