/**
 * Test utilities and helpers for API and integration testing
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock session type
export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
  };
  expires: string;
}

/**
 * Creates a mock NextRequest for API testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

/**
 * Creates a mock authenticated session
 */
export function createMockSession(
  userId: string,
  overrides: Partial<MockSession> = {}
): MockSession {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Mocks getServerSession to return an authenticated session
 */
export function mockAuthenticatedSession(
  userId: string,
  sessionOverrides: Partial<MockSession> = {}
) {
  const session = createMockSession(userId, sessionOverrides);
  (getServerSession as jest.Mock).mockResolvedValue(session);
  return session;
}

/**
 * Mocks getServerSession to return null (unauthenticated)
 */
export function mockUnauthenticatedSession() {
  (getServerSession as jest.Mock).mockResolvedValue(null);
}

/**
 * Parses JSON response from NextResponse
 */
export async function parseResponse<T = any>(response: Response): Promise<{
  data: T;
  status: number;
}> {
  const data = await response.json();
  return {
    data,
    status: response.status,
  };
}

/**
 * Creates a mock params object for route handlers
 */
export function createMockParams(params: Record<string, string>): Promise<Record<string, string>> {
  return Promise.resolve(params);
}

/**
 * Generates a mock MongoDB ObjectId
 */
export function generateMockObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const machineId = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  const processId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
  const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  return timestamp + machineId + processId + counter;
}

/**
 * Generates a mock UUID
 */
export function generateMockUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Wait utility for async tests
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assertion helper for checking API error responses
 */
export function expectErrorResponse(
  response: { data: any; status: number },
  expectedStatus: number,
  expectedErrorContains?: string
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).toHaveProperty('error');
  if (expectedErrorContains) {
    expect(response.data.error.toLowerCase()).toContain(expectedErrorContains.toLowerCase());
  }
}

/**
 * Assertion helper for checking API success responses
 */
export function expectSuccessResponse(
  response: { data: any; status: number },
  expectedStatus: number = 200
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).not.toHaveProperty('error');
}
