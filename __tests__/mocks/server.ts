import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for Node.js testing environment
 * Used by Jest tests to intercept network requests
 */
export const server = setupServer(...handlers);

/**
 * Setup function to call in jest.setup.js or beforeAll
 */
export const setupMswServer = (): void => {
  // Start the server before all tests
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  // Reset handlers after each test
  afterEach(() => {
    server.resetHandlers();
  });

  // Clean up after all tests
  afterAll(() => {
    server.close();
  });
};

/**
 * Add runtime handlers for specific tests
 */
export const addHandler = (...newHandlers: Parameters<typeof server.use>) => {
  server.use(...newHandlers);
};

/**
 * Reset to default handlers
 */
export const resetHandlers = () => {
  server.resetHandlers();
};
