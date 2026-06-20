// Shared transform settings. NOTE: in Jest multi-project mode, root-level
// `transform`/`transformIgnorePatterns` are NOT inherited by each project — they
// must be set per project. uuid (>=9) and a few others ship pure ESM, so they
// must be transformed (babel converts modules → CommonJS) rather than ignored.
const transform = { '^.+\\.js$': 'babel-jest' };
const transformIgnorePatterns = ['/node_modules/(?!(uuid|@aws-sdk|node-jose)/)'];

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/scheduler.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  transform,
  transformIgnorePatterns,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: [], // No database setup for unit tests
      transform,
      transformIgnorePatterns
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      transform,
      transformIgnorePatterns
    }
  ]
};
