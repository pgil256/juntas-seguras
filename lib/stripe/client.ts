/**
 * Stripe client — TEST MODE ONLY.
 *
 * This app is a proof-of-concept that runs exclusively against Stripe's test
 * sandbox. The secret key MUST start with `sk_test_`; we refuse to construct a
 * live-mode client so that no real money can ever move through this codebase.
 *
 * Nothing outside this module should import the `stripe` package directly —
 * all Stripe access flows through the PaymentProvider abstraction
 * (see lib/payments/provider.ts and lib/payments/providers/stripe.ts).
 */

import Stripe from 'stripe';

/** All Stripe secret keys in test mode begin with this prefix. */
export const STRIPE_TEST_SECRET_PREFIX = 'sk_test_';

let cachedClient: Stripe | null = null;

/**
 * Is Stripe wired up for this environment? True only when a test-mode secret
 * key is present. Used to gate the Stripe UI/endpoints without throwing.
 */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!key && key.startsWith(STRIPE_TEST_SECRET_PREFIX);
}

/**
 * Assert that a secret key exists and is a Stripe TEST-mode key.
 * Throws a descriptive error otherwise. Narrows `secretKey` to `string`.
 */
export function assertStripeTestMode(
  secretKey: string | undefined
): asserts secretKey is string {
  if (!secretKey) {
    throw new Error(
      'Stripe is not configured: STRIPE_SECRET_KEY is missing. ' +
        'Set a Stripe TEST-mode secret key (sk_test_…) to enable card payments.'
    );
  }
  if (!secretKey.startsWith(STRIPE_TEST_SECRET_PREFIX)) {
    throw new Error(
      'Refusing to initialize Stripe in non-test mode: STRIPE_SECRET_KEY must ' +
        'start with "sk_test_". This application supports Stripe TEST MODE only.'
    );
  }
}

/**
 * Lazily construct (and cache) the singleton Stripe client.
 * Guarantees the client is test-mode; see {@link assertStripeTestMode}.
 *
 * @throws Error if the secret key is missing or is not a test-mode key.
 */
export function getStripeClient(): Stripe {
  if (cachedClient) {
    return cachedClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  assertStripeTestMode(secretKey);

  // apiVersion is intentionally omitted so the pinned SDK default is used,
  // which keeps us compatible across `stripe` package upgrades.
  cachedClient = new Stripe(secretKey, {
    appInfo: {
      name: 'juntas-seguras (Stripe test-mode PoC)',
      url: 'https://juntas-seguras.vercel.app',
    },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });

  return cachedClient;
}

/** Reset the cached client. Test-only helper. */
export function __resetStripeClientForTests(): void {
  cachedClient = null;
}
