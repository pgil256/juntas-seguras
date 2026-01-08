import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';

/**
 * Authentication test helpers
 * Provides utilities for mocking authentication in tests
 */

/**
 * Mock session data interface
 */
export interface MockSessionUser {
  id: string;
  email: string;
  name: string;
  mfaVerified?: boolean;
  mfaMethod?: 'email' | 'totp';
}

export interface MockSession extends Session {
  user: MockSessionUser;
}

/**
 * Creates a mock session object
 */
export const createMockSession = (
  user: Partial<MockSessionUser> = {}
): MockSession => ({
  user: {
    id: user.id || 'test-user-id',
    email: user.email || 'test@example.com',
    name: user.name || 'Test User',
    mfaVerified: user.mfaVerified ?? true,
    mfaMethod: user.mfaMethod || 'email',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});

/**
 * Creates an authenticated mock session
 */
export const createAuthenticatedSession = (
  userId: string,
  overrides: Partial<MockSessionUser> = {}
): MockSession =>
  createMockSession({
    id: userId,
    mfaVerified: true,
    ...overrides,
  });

/**
 * Creates an unauthenticated (null) session mock
 */
export const createUnauthenticatedSession = (): null => null;

/**
 * Creates a session pending MFA verification
 */
export const createMfaPendingSession = (
  userId: string,
  overrides: Partial<MockSessionUser> = {}
): MockSession =>
  createMockSession({
    id: userId,
    mfaVerified: false,
    ...overrides,
  });

/**
 * Mocks getServerSession for API route testing
 * Call this in your test setup to mock the session
 */
export const mockServerSession = (session: MockSession | null): void => {
  (getServerSession as jest.Mock).mockResolvedValue(session);
};

/**
 * Mocks getServerSession to return an authenticated user
 */
export const mockAuthenticatedUser = (
  userId: string,
  overrides: Partial<MockSessionUser> = {}
): void => {
  const session = createAuthenticatedSession(userId, overrides);
  mockServerSession(session);
};

/**
 * Mocks getServerSession to return null (unauthenticated)
 */
export const mockUnauthenticatedUser = (): void => {
  mockServerSession(null);
};

/**
 * Mocks getServerSession to return a user pending MFA
 */
export const mockMfaPendingUser = (
  userId: string,
  overrides: Partial<MockSessionUser> = {}
): void => {
  const session = createMfaPendingSession(userId, overrides);
  mockServerSession(session);
};

/**
 * Clears all session mocks
 */
export const clearSessionMocks = (): void => {
  (getServerSession as jest.Mock).mockReset();
};

/**
 * Mock useSession hook return value for client-side tests
 */
export const createMockUseSession = (
  session: MockSession | null,
  status: 'loading' | 'authenticated' | 'unauthenticated' = 'authenticated'
) => ({
  data: session,
  status: session ? status : 'unauthenticated',
  update: jest.fn(),
});

/**
 * Creates headers for authenticated API requests
 */
export const createAuthHeaders = (token: string = 'test-token'): Headers => {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  return headers;
};

/**
 * Creates a mock request with session
 */
export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    body?: object;
    session?: MockSession | null;
  } = {}
): Request => {
  const { method = 'GET', body } = options;

  return new Request(url, {
    method,
    headers: createAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * Test user credentials for E2E tests
 */
export const testCredentials = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
};

/**
 * Known test MFA code (for tests where code is predictable)
 */
export const TEST_MFA_CODE = '123456';

/**
 * Known test TOTP secret (for tests where TOTP is predictable)
 */
export const TEST_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';
