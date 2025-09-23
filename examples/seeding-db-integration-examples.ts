import { 
  createConfig, 
  createPostgresService, 
  createMongoService,
  createAppConfig,
  createOnceSeedConfig,
  createPerFileSeedConfig,
  createPerTestSeedConfig,
  createCustomSeedConfig
} from '@soapjs/integr8';

/**
 * PRZYKŁADY INTEGRACJI SEEDOWANIA Z STRATEGIAMI BAZODANOWYMI
 * 
 * Ten plik pokazuje jak różne kombinacje DB strategii i seed strategii
 * wpływają na zachowanie testów.
 */

// ============================================================================
// 1. SAVEPOINT + SEEDING STRATEGIES
// ============================================================================

// SAVEPOINT + ONCE (Najszybsze, najmniejsza izolacja)
export const savepointOnceConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'savepoint',        // Szybkie rollbacki
  seed: createOnceSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. Start → Create Savepoint → Seed → Test1 → Test2 → Test3
  // 2. Testy mogą wpływać na siebie (brak restore)
  // 3. Najszybsze wykonanie
});

// SAVEPOINT + PER-FILE (Szybkie, dobra izolacja między plikami)
export const savepointPerFileConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'savepoint',
  seed: createPerFileSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. File1: Create Savepoint → Seed → Test1 → Rollback
  // 2. File2: Create Savepoint → Seed → Test2 → Rollback
  // 3. Izolacja między plikami, szybkie wykonanie
});

// SAVEPOINT + PER-TEST (Szybkie, maksymalna izolacja)
export const savepointPerTestConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'savepoint',
  seed: createPerTestSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. Test1: Create Savepoint → Seed → Test1 → Rollback
  // 2. Test2: Create Savepoint → Seed → Test2 → Rollback
  // 3. Maksymalna izolacja, szybkie wykonanie
});

// ============================================================================
// 2. SCHEMA + SEEDING STRATEGIES
// ============================================================================

// SCHEMA + ONCE (Szybkie, dobra izolacja)
export const schemaOnceConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'schema',
  seed: createOnceSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. Start → Create Schema → Seed → Test1 → Test2 → Test3
  // 2. Wszystkie testy w tym samym schemacie
  // 3. Szybkie, ale testy mogą wpływać na siebie
});

// SCHEMA + PER-FILE (Zbalansowane, bardzo dobra izolacja)
export const schemaPerFileConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'schema',
  seed: createPerFileSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. File1: Create Schema1 → Seed → Test1 → Drop Schema1
  // 2. File2: Create Schema2 → Seed → Test2 → Drop Schema2
  // 3. Kompletna izolacja między plikami
});

// SCHEMA + PER-TEST (Wolniejsze, maksymalna izolacja)
export const schemaPerTestConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'schema',
  seed: createPerTestSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. Test1: Create Schema1 → Seed → Test1 → Drop Schema1
  // 2. Test2: Create Schema2 → Seed → Test2 → Drop Schema2
  // 3. Maksymalna izolacja, wolniejsze wykonanie
});

// ============================================================================
// 3. DATABASE + SEEDING STRATEGIES
// ============================================================================

// DATABASE + ONCE (Szybkie, kompletna izolacja)
export const databaseOnceConfig = createConfig({
  services: [createMongoService('mongo')],
  app: createAppConfig({ 
    image: 'my-app:latest', 
    port: 3000,
    environment: { MONGODB_URI: 'mongodb://localhost:27017/testdb' }
  }),
  dbStrategy: 'database',
  seed: createOnceSeedConfig('npm run seed:mongo'),
  // PRZEPŁYW:
  // 1. Start → Create Database → Seed → Test1 → Test2 → Test3
  // 2. Wszystkie testy w tej samej bazie
  // 3. Kompletna izolacja, ale testy mogą wpływać na siebie
});

// DATABASE + PER-FILE (Zbalansowane, kompletna izolacja)
export const databasePerFileConfig = createConfig({
  services: [createMongoService('mongo')],
  app: createAppConfig({ 
    image: 'my-app:latest', 
    port: 3000,
    environment: { MONGODB_URI: 'mongodb://localhost:27017/testdb' }
  }),
  dbStrategy: 'database',
  seed: createPerFileSeedConfig('npm run seed:mongo'),
  // PRZEPŁYW:
  // 1. File1: Create DB1 → Seed → Test1 → Drop DB1
  // 2. File2: Create DB2 → Seed → Test2 → Drop DB2
  // 3. Kompletna izolacja między plikami
});

// DATABASE + PER-TEST (Wolniejsze, maksymalna izolacja)
export const databasePerTestConfig = createConfig({
  services: [createMongoService('mongo')],
  app: createAppConfig({ 
    image: 'my-app:latest', 
    port: 3000,
    environment: { MONGODB_URI: 'mongodb://localhost:27017/testdb' }
  }),
  dbStrategy: 'database',
  seed: createPerTestSeedConfig('npm run seed:mongo'),
  // PRZEPŁYW:
  // 1. Test1: Create DB1 → Seed → Test1 → Drop DB1
  // 2. Test2: Create DB2 → Seed → Test2 → Drop DB2
  // 3. Maksymalna izolacja, wolniejsze wykonanie
});

// ============================================================================
// 4. HYBRID STRATEGIES + SEEDING
// ============================================================================

// HYBRID SAVEPOINT-SCHEMA + PER-FILE (Szybkość + Izolacja)
export const hybridSavepointSchemaConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'hybrid-savepoint-schema',
  seed: createPerFileSeedConfig('npm run seed'),
  // PRZEPŁYW:
  // 1. File1: Create Savepoint + Schema1 → Seed → Test1 → Rollback + Drop Schema1
  // 2. File2: Create Savepoint + Schema2 → Seed → Test2 → Rollback + Drop Schema2
  // 3. Szybkie rollbacki + izolacja schematów
});

// HYBRID SCHEMA-DATABASE + CUSTOM (Maksymalna elastyczność)
export const hybridSchemaDatabaseConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'hybrid-schema-database',
  seed: createCustomSeedConfig([
    {
      name: 'unit-tests',
      condition: (ctx) => ctx.fileName?.includes('unit'),
      seedData: [{ name: 'Test User', email: 'test@example.com' }],
      restoreAfter: false // Szybkie testy
    },
    {
      name: 'integration-tests',
      condition: (ctx) => ctx.fileName?.includes('integration'),
      seedCommand: 'npm run seed:full',
      restoreAfter: true // Pełna izolacja
    },
    {
      name: 'e2e-tests',
      condition: (ctx) => ctx.fileName?.includes('e2e'),
      seedCommand: 'npm run seed:e2e',
      restoreAfter: true // Maksymalna izolacja
    }
  ])
});

// ============================================================================
// 5. REAL-WORLD SCENARIUSZE
// ============================================================================

// DEVELOPMENT (Szybkość)
export const developmentConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:dev', port: 3000 }),
  dbStrategy: 'savepoint',        // Najszybsze
  seed: createOnceSeedConfig('npm run seed:dev'), // Seed raz
  // Użycie: Szybki feedback loop, testy mogą wpływać na siebie
});

// CI/CD PIPELINE (Zbalansowane)
export const cicdConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'schema',           // Dobra izolacja
  seed: createPerFileSeedConfig('npm run seed'), // Izolacja między plikami
  // Użycie: Równoległe testy, izolacja między plikami
});

// E2E TESTS (Maksymalna izolacja)
export const e2eConfig = createConfig({
  services: [createMongoService('mongo')],
  app: createAppConfig({ 
    image: 'my-app:latest', 
    port: 3000,
    environment: { MONGODB_URI: 'mongodb://localhost:27017/testdb' }
  }),
  dbStrategy: 'database',         // Kompletna izolacja
  seed: createPerTestSeedConfig('npm run seed:e2e'), // Izolacja między testami
  // Użycie: Każdy test ma własną bazę z danymi
});

// COMPLEX APPLICATION (Elastyczność)
export const complexConfig = createConfig({
  services: [createPostgresService('postgres')],
  app: createAppConfig({ image: 'my-app:latest', port: 3000 }),
  dbStrategy: 'hybrid-savepoint-schema', // Elastyczność
  seed: createCustomSeedConfig([
    {
      name: 'auth-tests',
      condition: (ctx) => ctx.fileName?.includes('auth'),
      seedData: [
        { name: 'Admin', email: 'admin@example.com', role: 'admin' },
        { name: 'User', email: 'user@example.com', role: 'user' }
      ],
      restoreAfter: true
    },
    {
      name: 'api-tests',
      condition: (ctx) => ctx.fileName?.includes('api'),
      seedCommand: 'npm run seed:api',
      restoreAfter: true
    },
    {
      name: 'performance-tests',
      condition: (ctx) => ctx.fileName?.includes('performance'),
      seedCommand: 'npm run seed:performance',
      restoreAfter: false // Szybkie testy
    }
  ])
});

// ============================================================================
// 6. MONITORING I DEBUGGING
// ============================================================================

export async function demonstrateIntegration() {
  console.log('🔍 Demonstrating Seeding + DB Strategy Integration');
  
  // Przykład: Savepoint + Per-File
  console.log('\n📊 Savepoint + Per-File Strategy:');
  console.log('1. Create Savepoint (sp_1)');
  console.log('2. Run Seed Command');
  console.log('3. Execute Test File 1');
  console.log('4. Rollback to Savepoint (sp_1) ← Przywraca stan sprzed seedowania');
  console.log('5. Create Savepoint (sp_2)');
  console.log('6. Run Seed Command');
  console.log('7. Execute Test File 2');
  console.log('8. Rollback to Savepoint (sp_2)');
  
  // Przykład: Schema + Per-File
  console.log('\n📊 Schema + Per-File Strategy:');
  console.log('1. Create Schema (test_file1_worker1)');
  console.log('2. Run Seed Command (w nowym schemacie)');
  console.log('3. Execute Test File 1 (używa nowego schematu)');
  console.log('4. Drop Schema (test_file1_worker1) ← Usuwa cały schemat z danymi');
  console.log('5. Create Schema (test_file2_worker1)');
  console.log('6. Run Seed Command (w nowym schemacie)');
  console.log('7. Execute Test File 2 (używa nowego schematu)');
  console.log('8. Drop Schema (test_file2_worker1)');
  
  // Przykład: Database + Per-Test
  console.log('\n📊 Database + Per-Test Strategy:');
  console.log('1. Create Database (test_test1_worker1)');
  console.log('2. Run Seed Command (w nowej bazie)');
  console.log('3. Execute Test 1 (używa nowej bazy)');
  console.log('4. Drop Database (test_test1_worker1) ← Usuwa całą bazę');
  console.log('5. Create Database (test_test2_worker1)');
  console.log('6. Run Seed Command (w nowej bazie)');
  console.log('7. Execute Test 2 (używa nowej bazy)');
  console.log('8. Drop Database (test_test2_worker1)');
}

// ============================================================================
// 7. WYBÓR STRATEGII - PRZEWODNIK
// ============================================================================

export const strategySelectionGuide = {
  // Najszybsze (ale najmniejsza izolacja)
  fastest: {
    dbStrategy: 'savepoint',
    seedStrategy: 'once',
    useCase: 'Development, Unit Tests',
    performance: '⚡⚡⚡⚡⚡',
    isolation: '⭐⭐'
  },
  
  // Zbalansowane
  balanced: {
    dbStrategy: 'schema',
    seedStrategy: 'per-file',
    useCase: 'Integration Tests, CI/CD',
    performance: '⚡⚡⚡⚡',
    isolation: '⭐⭐⭐⭐'
  },
  
  // Maksymalna izolacja
  maximumIsolation: {
    dbStrategy: 'database',
    seedStrategy: 'per-test',
    useCase: 'E2E Tests, Complex Scenarios',
    performance: '⚡⚡⚡',
    isolation: '⭐⭐⭐⭐⭐'
  },
  
  // Elastyczność
  flexible: {
    dbStrategy: 'hybrid-savepoint-schema',
    seedStrategy: 'custom',
    useCase: 'Complex Applications, Special Requirements',
    performance: '⚡⚡⚡⚡',
    isolation: '⭐⭐⭐⭐'
  }
};

// USAGE EXAMPLES:
//
// For development (fastest feedback):
// export default developmentConfig;
//
// For CI/CD (balanced):
// export default cicdConfig;
//
// For E2E tests (maximum isolation):
// export default e2eConfig;
//
// For complex scenarios:
// export default complexConfig;

