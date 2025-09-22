export const PROMPTS = {
  welcome: {
    title: "🚀 Welcome to Integr8!",
    description: "Let's set up your integration testing environment step by step."
  },
  testType: {
    question: "What type of tests do you want to set up?",
    choices: [
      {
        name: "API tests",
        value: "api",
        description: "Test your API endpoints with database"
      },
      {
        name: "E2E tests", 
        value: "e2e",
        description: "End-to-end testing with full application"
      },
      {
        name: "Unit tests with database",
        value: "unit-db",
        description: "Unit tests that need database access"
      },
      {
        name: "Custom",
        value: "custom",
        description: "Custom testing setup"
      }
    ]
  },
  appStructure: {
    question: "What is your application structure?",
    choices: [
      {
        name: "Single service (one app)",
        value: "single",
        description: "One application service"
      },
      {
        name: "Monorepo (multiple services)",
        value: "monorepo", 
        description: "Multiple services in one repository"
      }
    ]
  },
  testConfig: {
    testDirectory: {
      question: "Test directory name:",
      default: "tests"
    },
    mainServiceName: {
      question: "Main service name:",
      default: "app"
    },
    readinessEndpoint: {
      question: "Does your app have a readiness endpoint?",
      default: true
    },
    readinessPath: {
      question: "Readiness endpoint path:",
      default: "/health"
    },
    urlPrefix: {
      question: "What is your API URL prefix?",
      default: "",
      description: "e.g., api/v1, api, v1 (leave empty if no prefix)"
    }
  },
  databaseSelection: {
    question: "Which databases do you want to use? (Press <space> to select)",
    choices: [
      {
        name: "PostgreSQL",
        value: "postgres",
        description: "PostgreSQL database"
      },
      {
        name: "MySQL",
        value: "mysql", 
        description: "MySQL database"
      },
      {
        name: "MongoDB",
        value: "mongo",
        description: "MongoDB database"
      },
      {
        name: "Redis",
        value: "redis",
        description: "Redis cache"
      },
      {
        name: "None",
        value: "none",
        description: "No database needed"
      }
    ]
  },
  databaseConfig: {
    strategy: {
      question: "Database strategy:",
      choices: [
        {
          name: "Schema (recommended)",
          value: "schema",
          description: "Create separate schemas for each test"
        },
        {
          name: "Savepoint (fastest)",
          value: "savepoint", 
          description: "Use database savepoints (fastest)"
        },
        {
          name: "Database",
          value: "database",
          description: "Create separate databases for each test"
        },
        {
          name: "Snapshot",
          value: "snapshot",
          description: "Use database snapshots"
        }
      ]
    },
    seeding: {
      question: "How do you want to seed data?",
      choices: [
        {
          name: "Command",
          value: "command",
          description: "Run a command (e.g., npm run seed)"
        },
        {
          name: "File",
          value: "file",
          description: "Use SQL/JSON files"
        },
        {
          name: "None",
          value: "none",
          description: "No seeding"
        }
      ]
    },
    seedCommand: {
      question: "Seed command:",
      default: "npm run seed"
    },
    seedFile: {
      question: "Seed file path:",
      default: "seed/init.sql"
    }
  },
  additionalServices: {
    question: "Do you want to add other services?",
    default: false,
    serviceType: {
      question: "Service type:",
      choices: [
        {
          name: "Redis",
          value: "redis",
          description: "Redis cache service"
        },
        {
          name: "Mailhog",
          value: "mailhog",
          description: "Mail testing service"
        },
        {
          name: "Custom",
          value: "custom",
          description: "Custom service"
        }
      ]
    },
    serviceName: {
      question: "Service name:",
      default: "redis"
    },
    containerName: {
      question: "Container name:",
      default: "my-app-redis"
    },
    image: {
      question: "Docker image:",
      default: "redis:7-alpine"
    }
  },
  configFile: {
    question: "Where should I create the config file?",
    choices: [
      {
        name: "integr8.config.js",
        value: "js",
        description: "JavaScript configuration"
      },
      {
        name: "integr8.config.json",
        value: "json",
        description: "JSON configuration"
      },
      {
        name: "integr8.config.ts",
        value: "ts",
        description: "TypeScript configuration"
      }
    ]
  },
  success: {
    title: "✅ Configuration created successfully!",
    message: "Your integr8 configuration has been generated. You can now run your tests with 'integr8 up'."
  },
  errors: {
    invalidAnswer: "Invalid answer. Please try again.",
    fileExists: "File already exists. Do you want to overwrite it?",
    createError: "Error creating configuration file:"
  }
}
