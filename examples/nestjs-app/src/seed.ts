import { DataSource } from 'typeorm';
import { User } from './users/user.entity';

async function seed() {
  console.log('Starting TypeORM seeding...');
  
  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test',
    entities: [User],
    synchronize: true, // Only for seeding
  });

  try {
    // Initialize connection
    await dataSource.initialize();
    console.log('Database connection established');

    // Get repository
    const userRepository = dataSource.getRepository(User);

    // Clear existing data
    await userRepository.clear();
    console.log('Cleared existing data');

    // Create sample users
    const sampleUsers = [
      {
        name: 'John Doe',
        email: 'john@example.com'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com'
      }
    ];

    // Insert sample data
    for (const userData of sampleUsers) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    console.log('TypeORM seeding completed successfully!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}

export { seed };
