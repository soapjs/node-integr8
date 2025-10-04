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
      {
        name: "E2E tests", 
        value: "e2e",
        description: "End-to-end testing through API Gateway to services"
      },
      {
        name: "Integration tests",
        value: "integration",
        description: "Test communication between multiple services"
      },
      {
        name: "Custom",
        value: "custom",
        description: "Custom testing setup"
      }
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
      enabled: {
        question: "Do you want to configure health checks?",
        default: true
      },
      endpoint: {
        question: "Health check endpoint:",
        default: "/health"
      },
      command: {
        question: "Custom health check command (optional):",
        default: ""
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
      },
      ports: {
        question: "Port mappings (host:container, comma-separated, optional):",
        default: ""
      },
      environment: {
        question: "Environment variables (KEY=VALUE, comma-separated, optional):",
        default: ""
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
    strategy: {
      question: "Database strategy:",
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
    seeding: {
      question: "Seeding strategy:",
      choices: [
        {
          name: "Once per test suite",
          value: "once",
          description: "Seed once at the beginning"
        },
        {
          name: "Per test file",
          value: "per-file",
          description: "Seed before each test file"
        },
        {
          name: "Per test",
          value: "per-test",
          description: "Seed before each test"
        },
        {
          name: "Custom",
          value: "custom",
          description: "Custom seeding logic"
        }
      ]
    },
    seedCommand: {
      question: "Seed command (optional):",
      default: ""
    },
    seedFile: {
      question: "Seed file path (optional):",
      default: ""
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
      },
      ports: {
        question: "Port mappings (host:container, optional):",
        default: "5432:5432"
      },
      environment: {
        question: "Environment variables (KEY=VALUE, comma-separated, optional):",
        default: "POSTGRES_USER=postgres,POSTGRES_PASSWORD=password,POSTGRES_DB=testdb"
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
      },
      ports: {
        question: "Port mappings (host:container, optional):",
        default: "9000:9000,9001:9001"
      },
      environment: {
        question: "Environment variables (KEY=VALUE, comma-separated, optional):",
        default: "MINIO_ROOT_USER=minioadmin,MINIO_ROOT_PASSWORD=minioadmin"
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
      },
      ports: {
        question: "Port mappings (host:container, optional):",
        default: "9092:9092"
      },
      environment: {
        question: "Environment variables (KEY=VALUE, comma-separated, optional):",
        default: "KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181,KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092"
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
