# NestJS + TypeORM Example

This is a sample NestJS application with TypeORM integration for testing with SoapJS Integr8.

## Features

- **NestJS Framework**: Modern Node.js framework
- **TypeORM**: TypeScript ORM with PostgreSQL
- **Entity Management**: User entity with CRUD operations
- **Seed Data**: Automated seeding with TypeORM
- **Test Integration**: Ready for integr8 testing

## Project Structure

```
src/
├── users/
│   ├── user.entity.ts      # TypeORM entity
│   ├── users.service.ts    # Business logic
│   ├── users.controller.ts # HTTP endpoints
│   └── users.module.ts     # Module definition
├── app.module.ts           # Main app module
├── main.ts                 # Application entry point
└── seed.ts                 # Database seeding script
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Application

```bash
npm run build
```

### 3. Run Seed Script

```bash
npm run seed
```

### 4. Start Application

```bash
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## Testing with Integr8

### 1. Configure integr8

The `integr8.config.ts` file is already configured for this NestJS app:

```typescript
import { createConfig, createPostgresService, createAppConfig, createTypeORMSeedConfig, createNestAdapter } from '@soapjs/integr8';

export default createConfig({
  services: [
    createPostgresService(),
  ],
  app: createAppConfig({
    image: 'sample-nestjs-app:latest',
    command: 'npm start',
    healthcheck: '/health',
    port: 3000,
  }),
  seed: createTypeORMSeedConfig(),
  dbStrategy: 'savepoint',
  adapters: [
    createNestAdapter({
      typeorm: true,
      testModule: true
    }),
  ],
});
```

### Alternative: Entity-based Seeding

You can also use entities directly in the configuration:

```typescript
import { User } from './src/users/user.entity';

// Entities with custom data
seed: createTypeORMEntitiesSeedConfig(
  [User],
  [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' }
  ],
  {
    clearBeforeSeed: true,
    runMigrations: false
  }
)
```

### 2. Run Tests

```bash
# Start environment
npx integr8 up

# Run tests
npx integr8 run

# Stop environment
npx integr8 down
```

## TypeORM Features

### Entity Definition

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Seeding

The seed script uses TypeORM DataSource to:

1. Initialize database connection
2. Clear existing data
3. Insert sample users
4. Close connection

```typescript
// Example seed data
const sampleUsers = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Bob Johnson', email: 'bob@example.com' }
];
```

## Database Strategy

This example uses the `savepoint` strategy for fast test isolation:

- Each test runs in a transaction
- Changes are rolled back after each test
- No need to reseed data between tests
- Fastest option for PostgreSQL

## Override System

The app supports runtime overrides for testing:

```typescript
// Override service
await ctx.override.service('UsersService').withMock(() => ({
  findAll: () => Promise.resolve([{ id: 1, name: 'Mock User' }])
}));

// Override repository
await ctx.override.repository('UserRepository').withMock(() => ({
  find: () => Promise.resolve([{ id: 1, name: 'Mock User' }])
}));
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (test/development/production)
- `PORT` - Application port (default: 3000)
- `TEST_MODE` - Enable test overrides (1/0)

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t sample-nestjs-app:latest .

# Run container
docker run -p 3000:3000 sample-nestjs-app:latest
```
