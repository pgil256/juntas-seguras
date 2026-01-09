/**
 * Simple in-memory rate limiter for API endpoints
 *
 * IMPORTANT: This is suitable for single-instance deployments.
 * For production multi-instance deployments, use Redis or a service like Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  // Maximum number of requests allowed within the window
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Optional prefix to namespace rate limit keys
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterMs: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, user ID, email)
 * @param config - Rate limit configuration
 * @returns Rate limit result indicating if the request is allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, prefix = 'rl' } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime,
      retryAfterMs: 0,
    };
  }

  // Increment counter
  entry.count++;

  // Check if over limit
  if (entry.count > maxRequests) {
    const retryAfterMs = entry.resetTime - now;
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfterMs,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
    retryAfterMs: 0,
  };
}

/**
 * Reset rate limit for a specific identifier
 * Useful after successful authentication
 */
export function resetRateLimit(identifier: string, prefix = 'rl'): void {
  const key = `${prefix}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  // MFA verification: 5 attempts per 5 minutes
  mfaVerification: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 5,
      windowMs: 5 * 60 * 1000, // 5 minutes
      prefix: 'mfa',
    }),

  // MFA resend: 3 requests per 2 minutes
  mfaResend: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 3,
      windowMs: 2 * 60 * 1000, // 2 minutes
      prefix: 'mfa-resend',
    }),

  // Login attempts: 10 attempts per 15 minutes
  login: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      prefix: 'login',
    }),

  // Password reset: 3 requests per hour
  passwordReset: (identifier: string) =>
    checkRateLimit(identifier, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      prefix: 'pwd-reset',
    }),
};

/**
 * Helper to get client IP from Next.js request
 */
export function getClientIp(request: Request): string {
  // Try various headers that might contain the real IP
  const headers = request.headers;

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  // Fallback to a generic identifier
  return 'unknown';
}
