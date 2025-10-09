export const PROMPTS = {
  welcome: {
    title: "🚀 Welcome to Integr8!",
    description: "Let's set up your integration testing environment step by step."
  },
  testType: {
    question: "What type of tests do you want to set up?",
    choices: [
      {
        name: "Integration API tests",
        value: "api",
        description: "Test API endpoints with real database (single service)"
      },
      // {
      //   available: false,
      //   name: "E2E tests", 
      //   value: "e2e",
      //   description: "End-to-end testing through API Gateway to services"
      // },
      // {
      //   available: false,
      //   name: "Inter-Service tests",
      //   value: "inter",
      //   description: "Integration tests between multiple services"
      // },
      // {
      //   available: false,
      //   name: "Intra-Service tests",
      //   value: "intra",
      //   description: "Integration tests within a single service"
      // },
    ]
  },
  componentSelection: {
    question: "What components do you want to add?",
    choices: [
      {
        name: "Service (HTTP/WebSocket API)",
        value: "service",
        description: "Add a service component (your application)"
      },
      {
        name: "Database",
        value: "database",
        description: "Add a database component"
      },
      {
        name: "Storage (coming soon)",
        value: "storage",
        description: "Add storage component (S3, MinIO, etc.)"
      },
      {
        name: "Messaging (coming soon)",
        value: "messaging",
        description: "Add messaging component (Kafka, RabbitMQ, etc.)"
      },
      {
        name: "WebSocket (coming soon)",
        value: "socket",
        description: "Add WebSocket component"
      }
    ]
  },
  testConfig: {
    testDir: {
      question: "Test directory name:",
      default: "integr8/tests"
    }
    },
  serviceConfig: {
    name: {
      question: "Service name:",
      default: "app"
    },
    mode: {
      question: "How should this service run?",
      choices: [
        {
          name: "Local process",
          value: "local",
          description: "Run as local Node.js process"
        },
        {
          name: "Docker container",
          value: "container",
          description: "Run in Docker container"
        }
      ]
    },
    communicationType: {
      question: "What type of communication does this service use?",
      choices: [
        {
          name: "HTTP/REST API",
          value: "http",
          description: "Standard HTTP REST API"
        },
        {
          name: "WebSocket",
          value: "ws",
          description: "WebSocket connections"
        },
        {
          name: "Custom",
          value: "custom",
          description: "Custom communication protocol"
        }
      ]
    },
    httpConfig: {
      baseUrl: {
        question: "Base URL:",
        default: "http://localhost"
      },
      port: {
        question: "Port:",
        default: 3000
      },
      prefix: {
        question: "API prefix (e.g., /api/v1):",
        default: "/api"
      }
    },
    wsConfig: {
      baseUrl: {
        question: "WebSocket base URL:",
        default: "ws://localhost"
      },
      port: {
        question: "WebSocket port:",
        default: 3001
      },
      prefix: {
        question: "WebSocket prefix:",
        default: "/ws"
      }
    },
    framework: {
      question: "What framework are you using?",
      choices: [
        {
          name: "Express.js",
          value: "express",
          description: "Express.js framework"
        },
        {
          name: "NestJS",
          value: "nestjs",
          description: "NestJS framework"
        },
        {
          name: "Fastify",
          value: "fastify",
          description: "Fastify framework"
        },
        {
          name: "Koa",
          value: "koa",
          description: "Koa framework"
        },
        {
          name: "Other",
          value: "other",
          description: "Other framework or custom setup"
        }
      ]
    },
    readiness: {
      question: "How do you want to configure health checks?",
      choices: [
        {
          name: "Health check endpoint (e.g., /health)",
          value: "endpoint",
          description: "Use HTTP endpoint for readiness check"
        },
        {
          name: "Custom command (e.g., npm run healthcheck)",
          value: "command",
          description: "Run custom command to check readiness"
        },
        {
          name: "Skip health checks",
          value: "skip",
          description: "Don't configure health checks"
        }
      ],
      endpoint: {
        question: "Health check endpoint:",
        default: "/health"
      },
      command: {
        question: "Custom health check command:",
        default: "npm run healthcheck"
      }
    },
    localConfig: {
      command: {
        question: "Start command:",
        default: "npm start"
      },
      workingDirectory: {
        question: "Working directory:",
        default: "."
      }
    },
    containerConfig: {
      image: {
        question: "Docker image:",
        default: "node:18-alpine"
      },
      containerName: {
        question: "Container name:",
        default: "my-app"
      }
    }
  },
  databaseConfig: {
    name: {
      question: "Database name:",
      default: "main-db"
    },
    mode: {
      question: "How should this database run?",
      choices: [
        {
          name: "Local process",
          value: "local",
          description: "Run as local database process"
        },
        {
          name: "Docker container",
          value: "container",
          description: "Run in Docker container"
        }
      ]
    },
    type: {
      question: "What type of database?",
      choices: [
        {
          name: "PostgreSQL",
          value: "postgresql",
          description: "PostgreSQL database"
        },
        {
          name: "MySQL",
          value: "mysql",
          description: "MySQL database"
        },
        {
          name: "MongoDB",
          value: "mongodb",
          description: "MongoDB database"
        },
        {
          name: "SQLite",
          value: "sqlite",
          description: "SQLite database"
        },
        {
          name: "Redis",
          value: "redis",
          description: "Redis key-value store"
        },
        {
          name: "Other",
          value: "other",
          description: "Other database type"
        }
      ]
    },
    isolation: {
      question: "Database isolation strategy:",
      choices: [
        {
          name: "Savepoint (recommended)",
          value: "savepoint",
          description: "Use database savepoints for isolation"
        },
        {
          name: "Schema",
          value: "schema",
          description: "Create separate schemas for tests"
        },
        {
          name: "Database",
          value: "database",
          description: "Create separate databases for tests"
        },
        {
          name: "Snapshot",
          value: "snapshot",
          description: "Use database snapshots"
        }
      ]
    },
    seedingMethod: {
      question: "How do you want to seed the database?",
      choices: [
        {
          name: "Command (e.g., npm run seed)",
          value: "command",
          description: "Run a command to seed the database"
        },
        {
          name: "File (e.g., seeds/data.sql)",
          value: "file",
          description: "Use a seed file"
        },
        {
          name: "Skip seeding",
          value: "skip",
          description: "Don't configure seeding"
        }
      ]
    },
    seeding: {
      question: "Seeding strategy (when to seed):",
      choices: [
        {
          name: "Once - Seed once at startup",
          value: "once",
          description: "Fastest for static test data"
        },
        {
          name: "Per-file - Seed before each test file",
          value: "per-file",
          description: "Good balance between isolation and speed"
        },
        {
          name: "Per-test - Seed before each test",
          value: "per-test",
          description: "Maximum isolation, slower"
        }
      ]
    },
    seedCommand: {
      question: "Seed command:",
      default: "npm run seed"
    },
    seedFile: {
      question: "Seed file path:",
      default: "seeds/data.sql"
    },
    localConfig: {
      host: {
        question: "Database host:",
        default: "localhost"
      },
      port: {
        question: "Database port:",
        default: "5432"
      },
      username: {
        question: "Database username:",
        default: "postgres"
      },
      password: {
        question: "Database password:",
        default: "password"
      }
    },
    containerConfig: {
      image: {
        question: "Docker image:",
        default: "postgres:15-alpine"
      },
      containerName: {
        question: "Container name:",
        default: "test-db"
      }
    },
    envMapping: {
      host: {
        question: "Environment variable for database host (e.g., DB_HOST, SQL_HOST):",
        default: "DB_HOST"
      },
      port: {
        question: "Environment variable for database port (e.g., DB_PORT, SQL_PORT):",
        default: "DB_PORT"
      },
      username: {
        question: "Environment variable for database username (e.g., DB_USERNAME, SQL_USER):",
        default: "DB_USERNAME"
      },
      password: {
        question: "Environment variable for database password (e.g., DB_PASSWORD, SQL_PSSWD):",
        default: "DB_PASSWORD"
      },
      database: {
        question: "Environment variable for database name (e.g., DB_NAME, SQL_NAME):",
        default: "DB_NAME"
      },
      url: {
        question: "Environment variable for database URL (e.g., DATABASE_URL, SQL_URL):",
        default: "DATABASE_URL"
      }
    }
  },
  storageConfig: {
    name: {
      question: "Storage name:",
      default: "main-storage"
    },
    type: {
      question: "Storage type:",
      default: "s3"
    },
    mode: {
      question: "How should this storage run?",
      choices: [
        {
          name: "Local process",
          value: "local",
          description: "Run as local storage process"
        },
        {
          name: "Docker container",
          value: "container",
          description: "Run in Docker container"
        }
      ]
    },
    containerConfig: {
      image: {
        question: "Docker image:",
        default: "minio/minio:latest"
      },
      containerName: {
        question: "Container name:",
        default: "test-storage"
      }
    },
    envMapping: {
      endpoint: {
        question: "Environment variable for storage endpoint (e.g., S3_ENDPOINT, STORAGE_ENDPOINT):",
        default: "S3_ENDPOINT"
      },
      region: {
        question: "Environment variable for storage region (e.g., S3_REGION, STORAGE_REGION):",
        default: "S3_REGION"
      },
      accessKey: {
        question: "Environment variable for access key (e.g., S3_ACCESS_KEY, STORAGE_ACCESS_KEY):",
        default: "S3_ACCESS_KEY"
      },
      secretKey: {
        question: "Environment variable for secret key (e.g., S3_SECRET_KEY, STORAGE_SECRET_KEY):",
        default: "S3_SECRET_KEY"
      }
    }
  },
  messagingConfig: {
    name: {
      question: "Messaging name:",
      default: "main-messaging"
    },
    type: {
      question: "What type of messaging?",
      choices: [
        {
          name: "Kafka",
          value: "kafka",
          description: "Apache Kafka"
        },
        {
          name: "RabbitMQ",
          value: "rabbitmq",
          description: "RabbitMQ message broker"
        },
        {
          name: "Redis Streams",
          value: "redis-streams",
          description: "Redis Streams"
        },
        {
          name: "NATS",
          value: "nats",
          description: "NATS messaging system"
        },
        {
          name: "Other",
          value: "other",
          description: "Other messaging system"
        }
      ]
    },
    brokers: {
      question: "Broker addresses (comma-separated):",
      default: "localhost:9092"
    },
    topics: {
      question: "Topics (comma-separated):",
      default: ""
    },
    queues: {
      question: "Queues (comma-separated):",
      default: ""
    },
    mode: {
      question: "How should this messaging run?",
      choices: [
        {
          name: "Local process",
          value: "local",
          description: "Run as local messaging process"
        },
        {
          name: "Docker container",
          value: "container",
          description: "Run in Docker container"
        }
      ]
    },
    containerConfig: {
      image: {
        question: "Docker image:",
        default: "confluentinc/cp-kafka:latest"
      },
      containerName: {
        question: "Container name:",
        default: "test-messaging"
      }
    },
    envMapping: {
      brokers: {
        question: "Environment variable for broker addresses (e.g., KAFKA_BROKERS, MQ_BROKERS):",
        default: "KAFKA_BROKERS"
      },
      clusterId: {
        question: "Environment variable for cluster ID (e.g., KAFKA_CLUSTER_ID, MQ_CLUSTER_ID):",
        default: "KAFKA_CLUSTER_ID"
      },
      endpoint: {
        question: "Environment variable for endpoint (e.g., MQ_ENDPOINT, MESSAGING_ENDPOINT):",
        default: "MQ_ENDPOINT"
      },
      region: {
        question: "Environment variable for region (e.g., MQ_REGION, MESSAGING_REGION):",
        default: "MQ_REGION"
      }
    }
  },
  addMoreComponents: {
    question: "Do you want to add more components?",
    default: true
  },
  configFile: {
    question: "Configuration file format:",
    choices: [
      {
        name: "JavaScript (.js)",
        value: "js",
        description: "JavaScript configuration file"
      },
      {
        name: "JSON (.json)",
        value: "json",
        description: "JSON configuration file"
      }
    ]
  },
  success: {
    title: "✅ Configuration created successfully!",
    message: "Your Integr8 configuration has been created. You can now run 'integr8 up' to start your test environment."
  },
  errors: {
    invalidAnswer: "❌ Invalid answer. Please try again.",
    fileExists: "❌ File already exists. Please choose a different name or remove the existing file.",
    createError: "❌ Error creating configuration file."
  }
};
