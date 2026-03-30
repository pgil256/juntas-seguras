const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      // Raised from 5% → 30% (target: 70%)
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
  ],
  // Increase timeout for integration tests
  testTimeout: 60000,
};

// Use async config to modify transformIgnorePatterns
module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  // Update transformIgnorePatterns to allow transformation of ESM packages
  config.transformIgnorePatterns = [
    '/node_modules/(?!(bson|mongodb|mongodb-memory-server|mongodb-memory-server-core|lucide-react|jose|openid-client)/).*',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return config;
};
