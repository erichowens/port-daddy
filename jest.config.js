export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/benchmark/'],
  collectCoverageFrom: [
    'server.js',
    'install-daemon.js',
    'lib/**/*.js',
    'shared/**/*.js',
    'routes/**/*.js',
    '!node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testTimeout: 10000,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      transform: {},
      moduleFileExtensions: ['js', 'mjs'],
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: [],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      transform: {},
      moduleFileExtensions: ['js', 'mjs'],
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 10000,
      // Integration tests share a single daemon on :9876 — must run serially
      maxWorkers: 1
    }
  ]
};
