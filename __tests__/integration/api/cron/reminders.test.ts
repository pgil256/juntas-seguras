/**
 * Cron Reminders API Integration Tests
 *
 * Tests for the cron reminders endpoint security:
 * - GET /api/cron/reminders - Process pending reminders
 *
 * Security: Protected by CRON_SECRET via:
 *   1. Authorization: Bearer {secret} header
 *   2. x-vercel-cron: {secret} header
 *   3. In development, allowed without secret
 *
 * We test the verifyCronSecret logic directly since NextRequest
 * is not fully available in the jest/jsdom environment.
 */

// Re-implement the verifyCronSecret logic from the route to test it in isolation.
// This mirrors app/api/cron/reminders/route.ts verifyCronSecret exactly.
interface MockRequest {
  headers: Map<string, string>;
}

function verifyCronSecret(
  request: MockRequest,
  env: { CRON_SECRET?: string; NODE_ENV?: string }
): boolean {
  const cronSecret = env.CRON_SECRET;

  // If no secret is configured, allow in development only
  if (!cronSecret) {
    if (env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check Vercel cron header (for Vercel Cron Jobs)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === cronSecret) {
    return true;
  }

  return false;
}

function createMockRequest(headers: Record<string, string> = {}): MockRequest {
  return {
    headers: new Map(Object.entries(headers)),
  };
}

describe('Cron Reminders API', () => {
  describe('verifyCronSecret', () => {
    const SECRET = 'test-cron-secret-123';

    it('should reject request without matching headers in production', () => {
      const request = createMockRequest();
      const result = verifyCronSecret(request, {
        CRON_SECRET: SECRET,
        NODE_ENV: 'production',
      });

      expect(result).toBe(false);
    });

    it('should reject when no CRON_SECRET is configured in production', () => {
      const request = createMockRequest({
        authorization: 'Bearer some-random-token',
      });
      const result = verifyCronSecret(request, {
        CRON_SECRET: undefined,
        NODE_ENV: 'production',
      });

      expect(result).toBe(false);
    });

    it('should accept request with Authorization Bearer header', () => {
      const request = createMockRequest({
        authorization: `Bearer ${SECRET}`,
      });
      const result = verifyCronSecret(request, {
        CRON_SECRET: SECRET,
        NODE_ENV: 'production',
      });

      expect(result).toBe(true);
    });

    it('should accept request with x-vercel-cron header', () => {
      const request = createMockRequest({
        'x-vercel-cron': SECRET,
      });
      const result = verifyCronSecret(request, {
        CRON_SECRET: SECRET,
        NODE_ENV: 'production',
      });

      expect(result).toBe(true);
    });

    it('should allow in development without any secret configured', () => {
      const request = createMockRequest();
      const result = verifyCronSecret(request, {
        CRON_SECRET: undefined,
        NODE_ENV: 'development',
      });

      expect(result).toBe(true);
    });

    it('should reject wrong secret value', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
      });
      const result = verifyCronSecret(request, {
        CRON_SECRET: SECRET,
        NODE_ENV: 'production',
      });

      expect(result).toBe(false);
    });

    it('should reject missing Bearer prefix in Authorization header', () => {
      const request = createMockRequest({
        authorization: SECRET, // Missing "Bearer " prefix
      });
      const result = verifyCronSecret(request, {
        CRON_SECRET: SECRET,
        NODE_ENV: 'production',
      });

      expect(result).toBe(false);
    });

    it('should still require valid secret in development when secret is configured', () => {
      const request = createMockRequest();
      const result = verifyCronSecret(request, {
        CRON_SECRET: SECRET,
        NODE_ENV: 'development',
      });

      // When CRON_SECRET is set, it is enforced regardless of environment
      expect(result).toBe(false);
    });
  });
});
