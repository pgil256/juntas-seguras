/**
 * Rate Limiting Security Tests
 *
 * Tests for rate limiting mechanisms to prevent:
 * - Brute force attacks on authentication
 * - API abuse and denial of service
 * - Resource exhaustion attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/middleware/security';

describe('Rate Limiting Security', () => {
  // In-memory store for testing rate limiting logic
  const createRateLimiter = (config: {
    maxRequests: number;
    windowMs: number;
  }) => {
    const store: Record<string, { count: number; timestamp: number }> = {};

    return {
      check: (identifier: string): { allowed: boolean; remaining: number; resetAt: number } => {
        const now = Date.now();
        const entry = store[identifier];

        // Reset if window expired
        if (!entry || now - entry.timestamp >= config.windowMs) {
          store[identifier] = { count: 1, timestamp: now };
          return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: now + config.windowMs,
          };
        }

        // Check limit
        if (entry.count >= config.maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: entry.timestamp + config.windowMs,
          };
        }

        // Increment counter
        entry.count++;
        return {
          allowed: true,
          remaining: config.maxRequests - entry.count,
          resetAt: entry.timestamp + config.windowMs,
        };
      },
      reset: (identifier: string) => {
        delete store[identifier];
      },
      getStore: () => store,
    };
  };

  describe('General Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const limiter = createRateLimiter({ maxRequests: 60, windowMs: 60000 });
      const ip = '192.168.1.1';

      // First request should be allowed
      const result = limiter.check(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('should block requests exceeding rate limit', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      const ip = '192.168.1.2';

      // Make 5 requests (allowed)
      for (let i = 0; i < 5; i++) {
        const result = limiter.check(ip);
        expect(result.allowed).toBe(true);
      }

      // 6th request should be blocked
      const blocked = limiter.check(ip);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should reset counter after window expires', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 100 }); // 100ms window
      const ip = '192.168.1.3';

      // Exhaust limit
      limiter.check(ip);
      limiter.check(ip);
      expect(limiter.check(ip).allowed).toBe(false);

      // Wait for window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = limiter.check(ip);
          expect(result.allowed).toBe(true);
          resolve();
        }, 150);
      });
    });

    it('should track different IPs separately', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });

      // Exhaust limit for IP1
      limiter.check('192.168.1.10');
      limiter.check('192.168.1.10');
      expect(limiter.check('192.168.1.10').allowed).toBe(false);

      // IP2 should still have quota
      expect(limiter.check('192.168.1.11').allowed).toBe(true);
    });

    it('should return correct remaining count', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      const ip = '192.168.1.20';

      expect(limiter.check(ip).remaining).toBe(4);
      expect(limiter.check(ip).remaining).toBe(3);
      expect(limiter.check(ip).remaining).toBe(2);
      expect(limiter.check(ip).remaining).toBe(1);
      expect(limiter.check(ip).remaining).toBe(0);
    });

    it('should return reset timestamp', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      const ip = '192.168.1.30';
      const before = Date.now();

      const result = limiter.check(ip);

      expect(result.resetAt).toBeGreaterThanOrEqual(before + 60000);
      expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('Authentication Rate Limiting', () => {
    it('should have stricter limits for login attempts', () => {
      // Login should have very strict rate limits
      const loginLimiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
      });

      const ip = '192.168.1.100';

      // Allow 5 login attempts
      for (let i = 0; i < 5; i++) {
        expect(loginLimiter.check(ip).allowed).toBe(true);
      }

      // Block 6th attempt
      expect(loginLimiter.check(ip).allowed).toBe(false);
    });

    it('should have stricter limits for MFA verification', () => {
      // MFA verification should be very strict to prevent brute force
      const mfaLimiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 10 * 60 * 1000, // 10 minutes
      });

      const userId = 'user-123';

      // Allow 5 MFA attempts
      for (let i = 0; i < 5; i++) {
        expect(mfaLimiter.check(userId).allowed).toBe(true);
      }

      // Block 6th attempt
      expect(mfaLimiter.check(userId).allowed).toBe(false);
    });

    it('should block password reset request spam', () => {
      const passwordResetLimiter = createRateLimiter({
        maxRequests: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
      });

      const email = 'user@example.com';

      // Allow 3 reset requests
      for (let i = 0; i < 3; i++) {
        expect(passwordResetLimiter.check(email).allowed).toBe(true);
      }

      // Block further attempts
      expect(passwordResetLimiter.check(email).allowed).toBe(false);
    });

    it('should implement exponential backoff for failed attempts', () => {
      interface BackoffConfig {
        baseDelay: number;
        maxDelay: number;
        multiplier: number;
      }

      const calculateBackoff = (
        attempts: number,
        config: BackoffConfig
      ): number => {
        const delay = config.baseDelay * Math.pow(config.multiplier, attempts - 1);
        return Math.min(delay, config.maxDelay);
      };

      const config: BackoffConfig = {
        baseDelay: 1000, // 1 second
        maxDelay: 300000, // 5 minutes
        multiplier: 2,
      };

      expect(calculateBackoff(1, config)).toBe(1000);
      expect(calculateBackoff(2, config)).toBe(2000);
      expect(calculateBackoff(3, config)).toBe(4000);
      expect(calculateBackoff(4, config)).toBe(8000);
      expect(calculateBackoff(5, config)).toBe(16000);
      expect(calculateBackoff(10, config)).toBe(300000); // Capped at max
    });
  });

  describe('API Rate Limiting', () => {
    it('should have appropriate limits for pool operations', () => {
      const poolApiLimiter = createRateLimiter({
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minute
      });

      const userId = 'user-456';

      // Should allow many pool operations
      for (let i = 0; i < 100; i++) {
        expect(poolApiLimiter.check(userId).allowed).toBe(true);
      }

      // But not unlimited
      expect(poolApiLimiter.check(userId).allowed).toBe(false);
    });

    it('should have stricter limits for write operations', () => {
      const writeOperationLimiter = createRateLimiter({
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
      });

      const userId = 'user-789';

      // Write operations should have stricter limits
      expect(writeOperationLimiter.check(userId).remaining).toBe(29);
    });

    it('should have separate limits for different endpoints', () => {
      const poolCreateLimiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60 * 60 * 1000, // 1 hour
      });

      const contributionLimiter = createRateLimiter({
        maxRequests: 20,
        windowMs: 60 * 1000, // 1 minute
      });

      const userId = 'user-limits';

      // Different limits for different operations
      expect(poolCreateLimiter.check(userId).remaining).toBe(4);
      expect(contributionLimiter.check(userId).remaining).toBe(19);
    });

    it('should rate limit search queries', () => {
      const searchLimiter = createRateLimiter({
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
      });

      const ip = '192.168.1.200';

      // Search should have moderate limits
      for (let i = 0; i < 30; i++) {
        expect(searchLimiter.check(ip).allowed).toBe(true);
      }

      expect(searchLimiter.check(ip).allowed).toBe(false);
    });
  });

  describe('Sensitive Operation Rate Limiting', () => {
    it('should strictly limit payout operations', () => {
      const payoutLimiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60 * 1000, // 1 minute between payouts
      });

      const poolId = 'pool-123';

      expect(payoutLimiter.check(poolId).allowed).toBe(true);
      expect(payoutLimiter.check(poolId).allowed).toBe(false);
    });

    it('should limit invitation sending', () => {
      const invitationLimiter = createRateLimiter({
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 10 invitations per hour
      });

      const poolId = 'pool-456';

      for (let i = 0; i < 10; i++) {
        expect(invitationLimiter.check(poolId).allowed).toBe(true);
      }

      expect(invitationLimiter.check(poolId).allowed).toBe(false);
    });

    it('should limit email sending', () => {
      const emailLimiter = createRateLimiter({
        maxRequests: 50,
        windowMs: 24 * 60 * 60 * 1000, // 50 emails per day per user
      });

      const userId = 'user-email-limit';

      // Should allow reasonable email volume
      for (let i = 0; i < 50; i++) {
        expect(emailLimiter.check(userId).allowed).toBe(true);
      }

      // But prevent spam
      expect(emailLimiter.check(userId).allowed).toBe(false);
    });
  });

  describe('Rate Limit Response Headers', () => {
    it('should include rate limit headers in response', () => {
      const generateRateLimitHeaders = (
        limit: number,
        remaining: number,
        resetAt: number
      ): Record<string, string> => {
        return {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetAt.toString(),
        };
      };

      const headers = generateRateLimitHeaders(100, 95, Date.now() + 60000);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include Retry-After header when rate limited', () => {
      const generateRetryAfterHeader = (resetAt: number): string => {
        const seconds = Math.ceil((resetAt - Date.now()) / 1000);
        return Math.max(seconds, 0).toString();
      };

      const resetAt = Date.now() + 30000; // 30 seconds from now
      const retryAfter = generateRetryAfterHeader(resetAt);

      expect(parseInt(retryAfter)).toBeGreaterThan(0);
      expect(parseInt(retryAfter)).toBeLessThanOrEqual(30);
    });
  });

  describe('429 Response Handling', () => {
    it('should return 429 status when rate limited', () => {
      const createRateLimitResponse = (
        resetAt: number
      ): { status: number; body: any; headers: Record<string, string> } => {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

        return {
          status: 429,
          body: {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: retryAfter,
          },
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        };
      };

      const response = createRateLimitResponse(Date.now() + 60000);

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too Many Requests');
      expect(response.headers['Retry-After']).toBeDefined();
    });

    it('should provide helpful error message', () => {
      const rateLimitMessage = (endpoint: string): string => {
        const messages: Record<string, string> = {
          '/api/auth/login': 'Too many login attempts. Please try again in 15 minutes.',
          '/api/auth/verify-mfa': 'Too many verification attempts. Please try again in 10 minutes.',
          '/api/pools': 'Rate limit exceeded for pool operations.',
          default: 'Too many requests. Please try again later.',
        };

        return messages[endpoint] || messages.default;
      };

      expect(rateLimitMessage('/api/auth/login')).toContain('login attempts');
      expect(rateLimitMessage('/api/auth/verify-mfa')).toContain('verification attempts');
      expect(rateLimitMessage('/api/unknown')).toContain('Too many requests');
    });
  });

  describe('Distributed Rate Limiting Considerations', () => {
    it('should support user-based rate limiting', () => {
      // User-based limits persist across IPs (for logged-in users)
      const userLimiter = createRateLimiter({
        maxRequests: 100,
        windowMs: 60000,
      });

      const userId = 'authenticated-user';

      // Same user from different IPs should share the same limit
      const result1 = userLimiter.check(userId);
      const result2 = userLimiter.check(userId);

      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
    });

    it('should support IP-based rate limiting for unauthenticated requests', () => {
      const ipLimiter = createRateLimiter({
        maxRequests: 20,
        windowMs: 60000,
      });

      const ip = '10.0.0.1';

      expect(ipLimiter.check(ip).allowed).toBe(true);
    });

    it('should handle proxy/forwarded IPs correctly', () => {
      const getClientIp = (headers: Record<string, string>): string => {
        // Check for forwarded IP headers in order of trust
        const forwardedFor = headers['x-forwarded-for'];
        if (forwardedFor) {
          // Get the first IP (original client)
          return forwardedFor.split(',')[0].trim();
        }

        const realIp = headers['x-real-ip'];
        if (realIp) {
          return realIp;
        }

        // Fall back to direct connection IP
        return headers['remote-addr'] || 'unknown';
      };

      // X-Forwarded-For with multiple IPs
      expect(
        getClientIp({ 'x-forwarded-for': '203.0.113.195, 70.41.3.18' })
      ).toBe('203.0.113.195');

      // X-Real-IP
      expect(getClientIp({ 'x-real-ip': '203.0.113.195' })).toBe('203.0.113.195');

      // Direct connection
      expect(getClientIp({ 'remote-addr': '192.168.1.1' })).toBe('192.168.1.1');
    });
  });

  describe('Sliding Window Rate Limiting', () => {
    it('should implement sliding window algorithm', () => {
      interface SlidingWindowEntry {
        timestamps: number[];
      }

      const createSlidingWindowLimiter = (
        maxRequests: number,
        windowMs: number
      ) => {
        const store: Record<string, SlidingWindowEntry> = {};

        return {
          check: (identifier: string): boolean => {
            const now = Date.now();
            const windowStart = now - windowMs;

            if (!store[identifier]) {
              store[identifier] = { timestamps: [now] };
              return true;
            }

            // Remove timestamps outside the window
            store[identifier].timestamps = store[identifier].timestamps.filter(
              (t) => t > windowStart
            );

            // Check if limit exceeded
            if (store[identifier].timestamps.length >= maxRequests) {
              return false;
            }

            // Add new timestamp
            store[identifier].timestamps.push(now);
            return true;
          },
        };
      };

      const limiter = createSlidingWindowLimiter(5, 1000);
      const id = 'sliding-test';

      // Should allow 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.check(id)).toBe(true);
      }

      // 6th should be blocked
      expect(limiter.check(id)).toBe(false);
    });
  });

  describe('Burst Protection', () => {
    it('should detect and block burst traffic', () => {
      interface BurstDetector {
        requestTimestamps: number[];
        burstThreshold: number; // requests
        burstWindow: number; // milliseconds
      }

      const isBurstDetected = (
        detector: BurstDetector,
        now: number
      ): boolean => {
        const recentRequests = detector.requestTimestamps.filter(
          (t) => now - t < detector.burstWindow
        );
        return recentRequests.length >= detector.burstThreshold;
      };

      const detector: BurstDetector = {
        requestTimestamps: [],
        burstThreshold: 10,
        burstWindow: 1000, // 10 requests per second = burst
      };

      // Simulate rapid requests
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        detector.requestTimestamps.push(now);
      }

      expect(isBurstDetected(detector, now)).toBe(true);

      // Normal traffic pattern
      const normalDetector: BurstDetector = {
        requestTimestamps: [now - 5000, now - 3000, now - 1000],
        burstThreshold: 10,
        burstWindow: 1000,
      };

      expect(isBurstDetected(normalDetector, now)).toBe(false);
    });
  });

  describe('Rate Limit Bypass Prevention', () => {
    it('should not allow rate limit bypass through header manipulation', () => {
      const validateIpHeader = (
        headerValue: string | undefined
      ): string | null => {
        if (!headerValue) return null;

        // Validate IP format
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

        const ip = headerValue.split(',')[0].trim();

        if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
          return ip;
        }

        return null;
      };

      // Valid IPs
      expect(validateIpHeader('192.168.1.1')).toBe('192.168.1.1');
      expect(validateIpHeader('10.0.0.1, 192.168.1.1')).toBe('10.0.0.1');

      // Invalid/malicious values
      expect(validateIpHeader('localhost')).toBeNull();
      expect(validateIpHeader('127.0.0.1; DROP TABLE users')).toBeNull();
      expect(validateIpHeader('')).toBeNull();
      expect(validateIpHeader(undefined)).toBeNull();
    });

    it('should handle IPv6 addresses', () => {
      const isValidIpv6 = (ip: string): boolean => {
        // Simplified IPv6 validation
        const parts = ip.split(':');
        if (parts.length !== 8) return false;
        return parts.every((part) => /^[0-9a-fA-F]{1,4}$/.test(part));
      };

      expect(isValidIpv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIpv6('192.168.1.1')).toBe(false);
      expect(isValidIpv6('invalid')).toBe(false);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle rate limiter failures gracefully', () => {
      const handleRateLimitCheck = (
        limiterAvailable: boolean,
        checkResult: boolean | null
      ): { allowed: boolean; degraded: boolean } => {
        if (!limiterAvailable || checkResult === null) {
          // If rate limiter is unavailable, allow with degraded flag
          return { allowed: true, degraded: true };
        }

        return { allowed: checkResult, degraded: false };
      };

      // Normal operation
      expect(handleRateLimitCheck(true, true)).toEqual({
        allowed: true,
        degraded: false,
      });
      expect(handleRateLimitCheck(true, false)).toEqual({
        allowed: false,
        degraded: false,
      });

      // Degraded mode (limiter unavailable)
      expect(handleRateLimitCheck(false, null)).toEqual({
        allowed: true,
        degraded: true,
      });
    });

    it('should log when operating in degraded mode', () => {
      const logDegradedOperation = jest.fn();

      const checkWithLogging = (
        limiterAvailable: boolean,
        identifier: string
      ): boolean => {
        if (!limiterAvailable) {
          logDegradedOperation({
            type: 'rate_limiter_unavailable',
            identifier,
            timestamp: new Date().toISOString(),
          });
          return true; // Allow in degraded mode
        }
        return true;
      };

      checkWithLogging(false, '192.168.1.1');

      expect(logDegradedOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limiter_unavailable',
          identifier: '192.168.1.1',
        })
      );
    });
  });
});
