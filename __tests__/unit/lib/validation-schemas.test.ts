/**
 * Unit tests for API validation schemas.
 */

import { CreatePoolSchema } from '@/lib/validation/schemas';

const validCreatePoolRequest = {
  name: 'Family Savings Pool',
  description: 'A test pool',
  contributionAmount: 10,
  totalRounds: 4,
  frequency: 'weekly' as const,
  allowedPaymentMethods: ['venmo', 'paypal'] as const,
  invitations: ['friend@example.com'],
};

describe('CreatePoolSchema', () => {
  it('should accept and normalize date-only start dates from browser inputs', () => {
    const result = CreatePoolSchema.parse({
      ...validCreatePoolRequest,
      startDate: '2026-06-04',
    });

    expect(result.startDate).toBe('2026-06-04T12:00:00.000Z');
  });

  it('should accept ISO datetime start dates', () => {
    const result = CreatePoolSchema.parse({
      ...validCreatePoolRequest,
      startDate: '2026-06-04T00:00:00.000Z',
    });

    expect(result.startDate).toBe('2026-06-04T00:00:00.000Z');
  });

  it('should reject malformed start dates', () => {
    const result = CreatePoolSchema.safeParse({
      ...validCreatePoolRequest,
      startDate: '2026-02-30',
    });

    expect(result.success).toBe(false);
  });
});
