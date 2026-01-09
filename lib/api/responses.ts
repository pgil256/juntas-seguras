/**
 * Standardized API Response Utilities
 *
 * These utilities ensure consistent response formats across all API routes.
 *
 * Success responses: { success: true, data: T, message?: string }
 * Error responses: { success: false, error: string, code?: string }
 */

import { NextResponse } from 'next/server';

// Standard API response types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// HTTP status codes with semantic names
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes for client-side handling
export const ErrorCode = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  NOT_MEMBER: 'NOT_MEMBER',
  NOT_ADMIN: 'NOT_ADMIN',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (options?.message) {
    response.message = options.message;
  }

  return NextResponse.json(response, {
    status: options?.status ?? HttpStatus.OK,
  });
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  options?: {
    status?: number;
    code?: ErrorCodeType;
  }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  };

  if (options?.code) {
    response.code = options.code;
  }

  return NextResponse.json(response, {
    status: options?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
  });
}

// Convenience methods for common error responses
export const ApiErrors = {
  unauthorized: (message = 'Unauthorized') =>
    errorResponse(message, {
      status: HttpStatus.UNAUTHORIZED,
      code: ErrorCode.UNAUTHORIZED,
    }),

  forbidden: (message = 'Forbidden') =>
    errorResponse(message, {
      status: HttpStatus.FORBIDDEN,
      code: ErrorCode.FORBIDDEN,
    }),

  notFound: (resource = 'Resource') =>
    errorResponse(`${resource} not found`, {
      status: HttpStatus.NOT_FOUND,
      code: ErrorCode.NOT_FOUND,
    }),

  notMember: () =>
    errorResponse('Not a member of this pool', {
      status: HttpStatus.FORBIDDEN,
      code: ErrorCode.NOT_MEMBER,
    }),

  notAdmin: () =>
    errorResponse('Admin access required', {
      status: HttpStatus.FORBIDDEN,
      code: ErrorCode.NOT_ADMIN,
    }),

  badRequest: (message = 'Bad request') =>
    errorResponse(message, {
      status: HttpStatus.BAD_REQUEST,
      code: ErrorCode.INVALID_INPUT,
    }),

  validationError: (message: string) =>
    errorResponse(message, {
      status: HttpStatus.BAD_REQUEST,
      code: ErrorCode.VALIDATION_ERROR,
    }),

  rateLimited: (message = 'Too many requests') =>
    errorResponse(message, {
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: ErrorCode.RATE_LIMITED,
    }),

  internalError: (message = 'An error occurred while processing your request') =>
    errorResponse(message, {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
    }),

  methodNotAllowed: (method: string) =>
    errorResponse(`Method ${method} not allowed`, {
      status: HttpStatus.METHOD_NOT_ALLOWED,
    }),
};
