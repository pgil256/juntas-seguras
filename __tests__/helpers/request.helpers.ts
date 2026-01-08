/**
 * Request helpers for testing API routes
 * Provides utilities for creating mock requests with authentication
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock session data type
export interface MockSessionUser {
  id: string;
  email: string;
  name: string;
  mfaSetupComplete?: boolean;
}

export interface MockSession {
  user: MockSessionUser;
  expires: string;
  requiresMfa?: boolean;
  mfaVerified?: boolean;
}

/**
 * Creates a mock session for testing
 */
export const createMockSession = (
  userId: string,
  options: Partial<MockSession> = {}
): MockSession => ({
  user: {
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    mfaSetupComplete: true,
    ...options.user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  requiresMfa: false,
  mfaVerified: true,
  ...options,
});

/**
 * Creates a mock NextRequest object
 */
export const createMockRequest = (options: {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}): NextRequest => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const request = new NextRequest(urlObj, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
};

/**
 * Helper to mock authenticated requests
 * Sets up getServerSession mock with the provided user
 */
export const mockAuthenticatedRequest = (
  userId: string,
  options: {
    session?: Partial<MockSession>;
    request?: Parameters<typeof createMockRequest>[0];
  } = {}
) => {
  const session = createMockSession(userId, options.session);

  // This returns both the session and the request for use in tests
  return {
    session,
    request: createMockRequest(options.request || {}),
    mockGetServerSession: jest.fn().mockResolvedValue(session),
  };
};

/**
 * Helper to mock unauthenticated requests
 */
export const mockUnauthenticatedRequest = (
  options: Parameters<typeof createMockRequest>[0] = {}
) => ({
  session: null,
  request: createMockRequest(options),
  mockGetServerSession: jest.fn().mockResolvedValue(null),
});

/**
 * Helper to mock a request with pending MFA
 */
export const mockPendingMfaRequest = (
  userId: string,
  options: Parameters<typeof createMockRequest>[0] = {}
) => {
  const session = createMockSession(userId, {
    requiresMfa: true,
    mfaVerified: false,
  });

  return {
    session,
    request: createMockRequest(options),
    mockGetServerSession: jest.fn().mockResolvedValue(session),
  };
};

/**
 * Parse JSON response from API route
 */
export const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Assert response status and optionally check body
 */
export const assertResponse = async (
  response: Response,
  expectedStatus: number,
  expectedBody?: Record<string, unknown>
) => {
  expect(response.status).toBe(expectedStatus);

  if (expectedBody) {
    const body = await parseResponse(response);
    expect(body).toMatchObject(expectedBody);
  }
};
