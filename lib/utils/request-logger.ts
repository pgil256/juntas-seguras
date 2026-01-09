/**
 * Request Logging Utility
 *
 * Provides structured logging for API requests with:
 * - Request/response tracking with correlation IDs
 * - Performance timing
 * - Error logging
 * - Configurable log levels
 */

import { NextRequest } from 'next/server';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Determine current log level from environment
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Generate a unique correlation ID for request tracing
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Check if we should log at a given level
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

// Sanitize sensitive data from objects
function sanitize<T extends object>(obj: T): T {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'code', 'mfa'];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Structured log entry
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Format log entry for output
function formatLogEntry(entry: LogEntry): string {
  if (isProduction) {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const { timestamp, level, correlationId, method, path, statusCode, durationMs, message, data, error } = entry;
  const prefix = `[${timestamp}] ${level.toUpperCase()}`;
  const requestInfo = method && path ? ` ${method} ${path}` : '';
  const statusInfo = statusCode ? ` → ${statusCode}` : '';
  const durationInfo = durationMs !== undefined ? ` (${durationMs}ms)` : '';
  const correlationInfo = correlationId ? ` [${correlationId}]` : '';

  let output = `${prefix}${correlationInfo}${requestInfo}${statusInfo}${durationInfo}: ${message}`;

  if (data && Object.keys(data).length > 0) {
    output += `\n  Data: ${JSON.stringify(sanitize(data))}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack && !isProduction) {
      output += `\n  Stack: ${error.stack}`;
    }
  }

  return output;
}

// Core logging function
function log(level: LogLevel, message: string, context?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message'>>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const output = formatLogEntry(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

// Public logging functions
export const logger = {
  debug: (message: string, context?: Partial<LogEntry>) => log('debug', message, context),
  info: (message: string, context?: Partial<LogEntry>) => log('info', message, context),
  warn: (message: string, context?: Partial<LogEntry>) => log('warn', message, context),
  error: (message: string, context?: Partial<LogEntry>) => log('error', message, context),
};

// Request context for tracking throughout a request lifecycle
export interface RequestContext {
  correlationId: string;
  startTime: number;
  method: string;
  path: string;
  userId?: string;
}

// Create request context from NextRequest
export function createRequestContext(request: NextRequest, userId?: string): RequestContext {
  // Check for existing correlation ID in headers (for distributed tracing)
  const existingCorrelationId = request.headers.get('x-correlation-id') || request.headers.get('x-request-id');

  return {
    correlationId: existingCorrelationId || generateCorrelationId(),
    startTime: Date.now(),
    method: request.method,
    path: new URL(request.url).pathname,
    userId,
  };
}

// Log request start
export function logRequestStart(ctx: RequestContext, data?: Record<string, unknown>) {
  logger.info('Request started', {
    correlationId: ctx.correlationId,
    method: ctx.method,
    path: ctx.path,
    userId: ctx.userId,
    data: data ? sanitize(data) : undefined,
  });
}

// Log request completion
export function logRequestComplete(ctx: RequestContext, statusCode: number, data?: Record<string, unknown>) {
  const durationMs = Date.now() - ctx.startTime;
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level]('Request completed', {
    correlationId: ctx.correlationId,
    method: ctx.method,
    path: ctx.path,
    statusCode,
    durationMs,
    userId: ctx.userId,
    data: data ? sanitize(data) : undefined,
  });
}

// Log request error
export function logRequestError(ctx: RequestContext, error: Error, statusCode: number = 500) {
  const durationMs = Date.now() - ctx.startTime;

  logger.error('Request failed', {
    correlationId: ctx.correlationId,
    method: ctx.method,
    path: ctx.path,
    statusCode,
    durationMs,
    userId: ctx.userId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
}

// Higher-order function to wrap API handlers with logging
export function withRequestLogging<T>(
  handler: (request: NextRequest, ctx: RequestContext) => Promise<T>
): (request: NextRequest) => Promise<T> {
  return async (request: NextRequest) => {
    const ctx = createRequestContext(request);
    logRequestStart(ctx);

    try {
      const result = await handler(request, ctx);
      return result;
    } catch (error) {
      logRequestError(ctx, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };
}

// Export utility for database operation logging
export function logDbOperation(operation: string, collection: string, durationMs: number, correlationId?: string) {
  logger.debug(`Database operation: ${operation}`, {
    correlationId,
    durationMs,
    data: { collection, operation },
  });
}

// Export utility for external service call logging
export function logExternalCall(
  service: string,
  operation: string,
  durationMs: number,
  success: boolean,
  correlationId?: string
) {
  const level = success ? 'debug' : 'warn';
  logger[level](`External service call: ${service}.${operation}`, {
    correlationId,
    durationMs,
    data: { service, operation, success },
  });
}
