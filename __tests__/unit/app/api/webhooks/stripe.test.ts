/**
 * @jest-environment node
 */

/**
 * Stripe webhook route unit tests.
 *
 * The Stripe SDK and the DB-facing handler are mocked; these tests focus on the
 * transport shell: configuration gating, signature verification, event dispatch,
 * and status codes.
 */

const mockConstructEvent = jest.fn();
const mockIsStripeConfigured = jest.fn(() => true);

jest.mock('@/lib/stripe/client', () => ({
  isStripeConfigured: () => mockIsStripeConfigured(),
  getStripeClient: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}));

const mockHandle = jest.fn();
jest.mock('@/lib/payments/webhook', () => ({
  handleStripeWebhookEvent: (event: unknown) => mockHandle(event),
}));

import { POST } from '@/app/api/webhooks/stripe/route';

function makeRequest(signature: string | null, body = '{}') {
  return {
    headers: {
      get: (key: string) => (key === 'stripe-signature' ? signature : null),
    },
    text: async () => body,
  } as any;
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsStripeConfigured.mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  it('returns 503 when Stripe is not configured', async () => {
    mockIsStripeConfigured.mockReturnValue(false);
    const res = await POST(makeRequest('sig'));
    expect(res.status).toBe(503);
  });

  it('returns 503 when the webhook secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest('sig'));
    expect(res.status).toBe(503);
  });

  it('returns 400 when the stripe-signature header is missing', async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });
    const res = await POST(makeRequest('bad_sig', 'raw-body'));
    expect(res.status).toBe(400);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it('verifies the raw body and dispatches a valid event', async () => {
    const event = { type: 'checkout.session.completed', data: { object: {} } };
    mockConstructEvent.mockReturnValue(event);
    mockHandle.mockResolvedValue({
      handled: true,
      type: 'checkout.session.completed',
      outcome: 'contribution_confirmed',
    });

    const res = await POST(makeRequest('good_sig', 'raw-body'));

    expect(mockConstructEvent).toHaveBeenCalledWith('raw-body', 'good_sig', 'whsec_test_secret');
    expect(mockHandle).toHaveBeenCalledWith(event);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.outcome).toBe('contribution_confirmed');
  });

  it('returns 500 when the handler throws (so Stripe retries)', async () => {
    mockConstructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: {} } });
    mockHandle.mockRejectedValue(new Error('database unavailable'));

    const res = await POST(makeRequest('good_sig', 'raw-body'));
    expect(res.status).toBe(500);
  });
});
