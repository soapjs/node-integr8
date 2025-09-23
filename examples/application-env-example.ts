/**
 * Application Environment Variables Example
 * 
 * This demonstrates how Integr8 adapts to YOUR application's existing
 * environment variable names - no changes needed in your app!
 */

import { 
  createConfig,
  createPostgresService,
  createAppService,
  createEnvironmentMapping
} from '../src/utils/config';

// Example 1: Your existing NestJS app uses these environment variables
// (Your app.ts doesn't change at all!)
const existingNestJSApp = `
// Your existing app.ts - NO CHANGES NEEDED!
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,           // Your app expects this
  port: parseInt(process.env.DB_PORT), // Your app expects this
  username: process.env.DB_USERNAME,   // Your app expects this
  password: process.env.DB_PASSWORD,   // Your app expects this
  database: process.env.DB_NAME,       // Your app expects this
  entities: [User, Order],
  synchronize: process.env.NODE_ENV !== 'production'
})
`;

// Integr8 configuration - YOU adapt to your app's env vars
export const nestjsAppConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser', 
        POSTGRES_PASSWORD: 'mypassword'
      },
      // Map container values to YOUR app's expected env var names
      envMapping: {
        host: 'DB_HOST',        // Your app expects DB_HOST
        port: 'DB_PORT',        // Your app expects DB_PORT
        username: 'DB_USERNAME', // Your app expects DB_USERNAME
        password: 'DB_PASSWORD', // Your app expects DB_PASSWORD
        database: 'DB_NAME'     // Your app expects DB_NAME
      }
    }),
    createAppService('app', {
      image: 'your-nestjs-app:latest',
      ports: [3000],
      dependsOn: ['postgres']
      // Integr8 automatically sets:
      // DB_HOST=localhost (container IP)
      // DB_PORT=5432 (mapped port)
      // DB_USERNAME=myuser
      // DB_PASSWORD=mypassword
      // DB_NAME=myapp
    })
  ]
});

// Example 2: Your existing Express app uses different env var names
const existingExpressApp = `
// Your existing database config - NO CHANGES NEEDED!
const dbConfig = {
  host: process.env.DATABASE_HOST,     // Your app expects this
  port: process.env.DATABASE_PORT,     // Your app expects this
  user: process.env.DATABASE_USER,     // Your app expects this
  pass: process.env.DATABASE_PASS,     // Your app expects this
  name: process.env.DATABASE_NAME      // Your app expects this
};
`;

export const expressAppConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      },
      // Map to YOUR app's env var names
      envMapping: {
        host: 'DATABASE_HOST',    // Your app expects DATABASE_HOST
        port: 'DATABASE_PORT',    // Your app expects DATABASE_PORT
        username: 'DATABASE_USER', // Your app expects DATABASE_USER
        password: 'DATABASE_PASS', // Your app expects DATABASE_PASS
        database: 'DATABASE_NAME'  // Your app expects DATABASE_NAME
      }
    }),
    createAppService('app', {
      image: 'your-express-app:latest',
      ports: [3000],
      dependsOn: ['postgres']
      // Integr8 automatically sets:
      // DATABASE_HOST=localhost
      // DATABASE_PORT=5432
      // DATABASE_USER=myuser
      // DATABASE_PASS=mypassword
      // DATABASE_NAME=myapp
    })
  ]
});

// Example 3: Your app uses a single DATABASE_URL
const existingSingleUrlApp = `
// Your existing config - NO CHANGES NEEDED!
const connectionString = process.env.DATABASE_URL; // Your app expects this
`;

export const singleUrlAppConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      },
      // Map to YOUR app's env var name
      envMapping: {
        url: 'DATABASE_URL' // Your app expects DATABASE_URL
      }
    }),
    createAppService('app', {
      image: 'your-app:latest',
      ports: [3000],
      dependsOn: ['postgres']
      // Integr8 automatically sets:
      // DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/myapp
    })
  ]
});

// Example 4: Your app uses custom env var names
const existingCustomApp = `
// Your existing config - NO CHANGES NEEDED!
const config = {
  host: process.env.MY_APP_DB_HOST,     // Your custom name
  port: process.env.MY_APP_DB_PORT,     // Your custom name
  username: process.env.MY_APP_DB_USER, // Your custom name
  password: process.env.MY_APP_DB_PASS, // Your custom name
  database: process.env.MY_APP_DB_NAME  // Your custom name
};
`;

export const customAppConfig = createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      },
      // Map to YOUR custom env var names
      envMapping: {
        host: 'MY_APP_DB_HOST',     // Your custom name
        port: 'MY_APP_DB_PORT',     // Your custom name
        username: 'MY_APP_DB_USER', // Your custom name
        password: 'MY_APP_DB_PASS', // Your custom name
        database: 'MY_APP_DB_NAME'  // Your custom name
      }
    }),
    createAppService('app', {
      image: 'your-custom-app:latest',
      ports: [3000],
      dependsOn: ['postgres']
      // Integr8 automatically sets:
      // MY_APP_DB_HOST=localhost
      // MY_APP_DB_PORT=5432
      // MY_APP_DB_USER=myuser
      // MY_APP_DB_PASS=mypassword
      // MY_APP_DB_NAME=myapp
    })
  ]
});

/**
 * Key Points:
 * 
 * 1. YOUR APPLICATION DOESN'T CHANGE - Integr8 adapts to your existing env var names
 * 
 * 2. You define envMapping in the Integr8 config to match what your app expects
 * 
 * 3. Integr8 automatically maps real container values to your expected env var names
 * 
 * 4. Your app continues to use process.env.YOUR_EXISTING_VAR_NAMES
 * 
 * 5. No code changes needed in your application - just configuration in Integr8
 * 
 * This is the correct approach - Integr8 adapts to your application,
 * not the other way around!
 */
