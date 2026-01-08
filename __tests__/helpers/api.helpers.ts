import { NextRequest } from 'next/server';

/**
 * API test helpers
 * Provides utilities for testing Next.js API routes
 */

/**
 * Creates a mock NextRequest object for API route testing
 */
export const createMockNextRequest = (
  url: string,
  options: {
    method?: string;
    body?: object;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest => {
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
};

/**
 * Creates a GET request
 */
export const createGetRequest = (
  url: string,
  options: {
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest =>
  createMockNextRequest(url, { method: 'GET', ...options });

/**
 * Creates a POST request
 */
export const createPostRequest = (
  url: string,
  body: object,
  options: {
    headers?: Record<string, string>;
  } = {}
): NextRequest =>
  createMockNextRequest(url, { method: 'POST', body, ...options });

/**
 * Creates a PUT request
 */
export const createPutRequest = (
  url: string,
  body: object,
  options: {
    headers?: Record<string, string>;
  } = {}
): NextRequest =>
  createMockNextRequest(url, { method: 'PUT', body, ...options });

/**
 * Creates a DELETE request
 */
export const createDeleteRequest = (
  url: string,
  options: {
    headers?: Record<string, string>;
    body?: object;
  } = {}
): NextRequest =>
  createMockNextRequest(url, { method: 'DELETE', ...options });

/**
 * Parses JSON response from API route handler
 */
export const parseJsonResponse = async <T>(
  response: Response
): Promise<{ status: number; data: T }> => {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
};

/**
 * Asserts response status and returns parsed data
 */
export const expectStatus = async <T>(
  response: Response,
  expectedStatus: number
): Promise<T> => {
  const { status, data } = await parseJsonResponse<T>(response);

  if (status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${status}. Response: ${JSON.stringify(data)}`
    );
  }

  return data;
};

/**
 * Expects a successful response (2xx)
 */
export const expectSuccess = async <T>(response: Response): Promise<T> => {
  const { status, data } = await parseJsonResponse<T>(response);

  if (status < 200 || status >= 300) {
    throw new Error(
      `Expected success status, got ${status}. Response: ${JSON.stringify(data)}`
    );
  }

  return data;
};

/**
 * Expects an error response
 */
export const expectError = async (
  response: Response,
  expectedStatus?: number
): Promise<{ error: string; message?: string }> => {
  const { status, data } = await parseJsonResponse<{
    error: string;
    message?: string;
  }>(response);

  if (expectedStatus && status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${status}. Response: ${JSON.stringify(data)}`
    );
  }

  if (status >= 200 && status < 300) {
    throw new Error(
      `Expected error status, got ${status}. Response: ${JSON.stringify(data)}`
    );
  }

  return data;
};

/**
 * Creates route params object for dynamic routes
 */
export const createRouteParams = (
  params: Record<string, string>
): { params: Record<string, string> } => ({
  params,
});

/**
 * Creates pool route params
 */
export const createPoolRouteParams = (
  poolId: string
): { params: { id: string } } =>
  createRouteParams({ id: poolId }) as { params: { id: string } };

/**
 * Creates user route params
 */
export const createUserRouteParams = (
  userId: string
): { params: { userId: string } } =>
  createRouteParams({ userId }) as { params: { userId: string } };

/**
 * Measures API response time
 */
export const measureResponseTime = async (
  handler: () => Promise<Response>
): Promise<{ response: Response; durationMs: number }> => {
  const start = performance.now();
  const response = await handler();
  const durationMs = performance.now() - start;

  return { response, durationMs };
};

/**
 * Asserts response time is under threshold
 */
export const expectResponseTimeUnder = async (
  handler: () => Promise<Response>,
  maxMs: number
): Promise<Response> => {
  const { response, durationMs } = await measureResponseTime(handler);

  if (durationMs > maxMs) {
    throw new Error(
      `Response time ${durationMs.toFixed(2)}ms exceeded threshold ${maxMs}ms`
    );
  }

  return response;
};
