/**
 * StripeTestProvider unit tests.
 *
 * The Stripe SDK is fully mocked (via lib/stripe/client) so these tests assert
 * the provider's mapping/behavior without any network calls: cents conversion,
 * metadata, hosted-checkout result shape, status mapping, the simulated-vs-real
 * payout branch, and refunds.
 */

// Mock the Stripe client the provider depends on.
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  paymentIntents: {
    retrieve: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => mockStripe,
  isStripeConfigured: () => true,
}));

import { StripeTestProvider, SIMULATED_TRANSFER_PREFIX } from '@/lib/payments/providers/stripe';

describe('StripeTestProvider', () => {
  let provider: StripeTestProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new StripeTestProvider();
  });

  it('reports its id and test mode', () => {
    expect(provider.id).toBe('stripe');
    expect(provider.testMode).toBe(true);
  });

  describe('createCheckout', () => {
    beforeEach(() => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      });
    });

    it('creates a card Checkout Session with cents, metadata, and URLs', async () => {
      const result = await provider.createCheckout({
        poolId: 'pool-1',
        poolName: 'Test Pool',
        memberId: 2,
        round: 1,
        amount: 10,
        paymentRef: 'pmt_abc',
        customerEmail: 'member@test.com',
        successUrl: 'http://localhost:3000/payments/complete?success=true',
        cancelUrl: 'http://localhost:3000/payments/complete?canceled=true',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
      const arg = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(arg.mode).toBe('payment');
      expect(arg.payment_method_types).toEqual(['card']);
      // $10 → 1000 cents
      expect(arg.line_items[0].price_data.unit_amount).toBe(1000);
      expect(arg.line_items[0].price_data.currency).toBe('usd');
      expect(arg.metadata).toEqual(
        expect.objectContaining({
          poolId: 'pool-1',
          memberId: '2',
          round: '1',
          paymentRef: 'pmt_abc',
        })
      );
      // Metadata also travels on the resulting PaymentIntent.
      expect(arg.payment_intent_data.metadata).toEqual(arg.metadata);
      expect(arg.customer_email).toBe('member@test.com');
      expect(arg.client_reference_id).toBe('pmt_abc');

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
      expect(result.reference).toBe('cs_test_123');
      expect(result.testMode).toBe(true);
      expect(result.provider).toBe('stripe');
    });

    it('throws when Stripe returns no checkout URL', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_test_x', url: null });
      await expect(
        provider.createCheckout({
          poolId: 'p',
          poolName: 'P',
          memberId: 1,
          round: 1,
          amount: 5,
          paymentRef: 'pmt_x',
          successUrl: 's',
          cancelUrl: 'c',
        })
      ).rejects.toThrow(/Checkout URL/i);
    });
  });

  describe('getPaymentStatus', () => {
    it('maps a PaymentIntent id (pi_) to a normalized status', async () => {
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_test_1',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      });

      const status = await provider.getPaymentStatus('pi_test_1');
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_1');
      expect(status.state).toBe('succeeded');
      expect(status.amount).toBe(10);
      expect(status.paymentIntentId).toBe('pi_test_1');
    });

    it('maps a Checkout Session id (cs_) to a normalized status', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_1',
        status: 'complete',
        payment_status: 'paid',
        payment_intent: 'pi_test_9',
        amount_total: 1500,
        currency: 'usd',
      });

      const status = await provider.getPaymentStatus('cs_test_1');
      expect(status.state).toBe('succeeded');
      expect(status.paymentIntentId).toBe('pi_test_9');
      expect(status.amount).toBe(15);
    });

    it('maps an expired session to canceled', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_2',
        status: 'expired',
        payment_status: 'unpaid',
        payment_intent: null,
        amount_total: 1000,
        currency: 'usd',
      });
      const status = await provider.getPaymentStatus('cs_test_2');
      expect(status.state).toBe('canceled');
    });
  });

  describe('releasePayout', () => {
    it('returns a clearly-labeled SIMULATED transfer when no destination is given', async () => {
      const result = await provider.releasePayout({
        poolId: 'pool-1',
        round: 1,
        recipientMemberId: 3,
        recipientName: 'Winner',
        amount: 50,
        reference: 'pmt_payout_1',
      });

      expect(mockStripe.transfers.create).not.toHaveBeenCalled();
      expect(result.simulated).toBe(true);
      expect(result.transferId).toBe(`${SIMULATED_TRANSFER_PREFIX}pmt_payout_1`);
      expect(result.amount).toBe(50);
      expect(result.testMode).toBe(true);
    });

    it('creates a REAL test-mode transfer when a Connect destination is provided', async () => {
      mockStripe.transfers.create.mockResolvedValue({ id: 'tr_test_real_1' });

      const result = await provider.releasePayout({
        poolId: 'pool-1',
        round: 1,
        recipientMemberId: 3,
        recipientName: 'Winner',
        amount: 50,
        reference: 'pmt_payout_2',
        destination: 'acct_test_123',
      });

      expect(mockStripe.transfers.create).toHaveBeenCalledTimes(1);
      const arg = mockStripe.transfers.create.mock.calls[0][0];
      expect(arg.amount).toBe(5000); // $50 → cents
      expect(arg.destination).toBe('acct_test_123');
      expect(result.simulated).toBe(false);
      expect(result.transferId).toBe('tr_test_real_1');
    });
  });

  describe('refund', () => {
    it('refunds by PaymentIntent id with amount in cents', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_1',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      });

      const result = await provider.refund({ paymentRef: 'pi_test_1', amount: 10 });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_test_1', amount: 1000 })
      );
      expect(result.refundId).toBe('re_test_1');
      expect(result.state).toBe('succeeded');
      expect(result.amount).toBe(10);
    });

    it('resolves a Checkout Session id to its PaymentIntent before refunding', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_1',
        payment_intent: 'pi_test_from_session',
      });
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test_2',
        status: 'pending',
        amount: 500,
        currency: 'usd',
      });

      const result = await provider.refund({ paymentRef: 'cs_test_1' });

      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_1');
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_test_from_session' })
      );
      expect(result.state).toBe('pending');
    });
  });
});
