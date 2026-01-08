/**
 * Jest setup file for Node.js environment tests
 * Used by integration, security, and performance tests
 */

// MongoMemoryServer configuration - must be set BEFORE importing
// Skip MD5 check to avoid checksum mismatch issues
process.env.MONGOMS_SKIP_MD5_CHECK = '1';
// Use a specific stable MongoDB version
process.env.MONGOMS_VERSION = '7.0.14';
// Set download timeout (in ms)
process.env.MONGOMS_DOWNLOAD_TIMEOUT = '300000';

// Suppress mongoose warning about jsdom
process.env.SUPPRESS_JEST_WARNINGS = 'true';

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'test@example.com';
process.env.MONGODB_URI = 'mongodb://localhost:27017/juntas_test';

// Increase timeout for tests using MongoMemoryServer
jest.setTimeout(60000);

// Suppress console output during tests (optional)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    // Filter out expected warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('[MONGOOSE]') ||
        args[0].includes('MongoMemoryServer') ||
        args[0].includes('punycode'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('[MONGOOSE]') ||
        args[0].includes('MongoMemoryServer'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
