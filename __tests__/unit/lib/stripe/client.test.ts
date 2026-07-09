/**
 * @jest-environment node
 */

/**
 * Stripe client — TEST MODE guard unit tests.
 *
 * Verifies the app refuses to construct a Stripe client with anything other
 * than a test-mode secret key (sk_test_…), so no real money can ever move.
 */

import {
  assertStripeTestMode,
  isStripeConfigured,
  getStripeClient,
  __resetStripeClientForTests,
} from '@/lib/stripe/client';

describe('Stripe client — test-mode guard', () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  const testSecretKey = ['sk', 'test', 'abc123'].join('_');
  const liveSecretKey = ['sk', 'live', 'abc123'].join('_');

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalKey;
    }
    __resetStripeClientForTests();
  });

  describe('assertStripeTestMode', () => {
    it('throws when the secret key is missing', () => {
      expect(() => assertStripeTestMode(undefined)).toThrow(/missing/i);
    });

    it('refuses a live-mode key', () => {
      expect(() => assertStripeTestMode(liveSecretKey)).toThrow(/test mode only/i);
    });

    it('accepts a test-mode key', () => {
      expect(() => assertStripeTestMode(testSecretKey)).not.toThrow();
    });
  });

  describe('isStripeConfigured', () => {
    it('is false when no key is set', () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(isStripeConfigured()).toBe(false);
    });

    it('is false for a live-mode key', () => {
      process.env.STRIPE_SECRET_KEY = liveSecretKey;
      expect(isStripeConfigured()).toBe(false);
    });

    it('is true for a test-mode key', () => {
      process.env.STRIPE_SECRET_KEY = testSecretKey;
      expect(isStripeConfigured()).toBe(true);
    });
  });

  describe('getStripeClient', () => {
    it('throws for a live-mode key', () => {
      process.env.STRIPE_SECRET_KEY = liveSecretKey;
      __resetStripeClientForTests();
      expect(() => getStripeClient()).toThrow(/test mode only/i);
    });

    it('constructs and caches a client for a test-mode key', () => {
      process.env.STRIPE_SECRET_KEY = testSecretKey;
      __resetStripeClientForTests();
      const client = getStripeClient();
      expect(client).toBeDefined();
      // Subsequent calls return the same cached instance.
      expect(getStripeClient()).toBe(client);
    });
  });
});
