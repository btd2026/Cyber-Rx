// Test setup for CyberRx API tests
const { Pool } = require('pg');

// Test database configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/cyberrx_test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.VAULT_MODE = 'local';

// Mock pool for tests
let pool;

beforeAll(async () => {
  // Setup test database connection
  pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/cyberrx_test'
  });

  // Create test tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_organizations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      state VARCHAR(2) NOT NULL,
      type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      organization_id INTEGER REFERENCES test_organizations(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_findings (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      source VARCHAR(100) NOT NULL,
      organization_id INTEGER REFERENCES test_organizations(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

afterAll(async () => {
  // Clean up and close database connection
  if (pool) {
    await pool.query(`
      DROP TABLE IF EXISTS test_findings;
      DROP TABLE IF EXISTS test_users;
      DROP TABLE IF EXISTS test_organizations;
    `);
    await pool.end();
  }
});

// Export pool for use in tests
global.testPool = pool;

// Helper function to reset database between tests
global.resetTestDatabase = async () => {
  await pool.query('TRUNCATE TABLE test_findings, test_users, test_organizations RESTART IDENTITY CASCADE');
};

// Helper to generate test JWT token
global.generateTestToken = (userId, role = 'cio') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, role, organizationId: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};
