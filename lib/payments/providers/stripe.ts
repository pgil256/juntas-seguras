/**
 * StripeTestProvider — PaymentProvider backed by the Stripe Node SDK, TEST MODE.
 *
 * This is the ONLY server module (besides lib/stripe/client.ts) that talks to
 * the Stripe SDK. API routes depend on the PaymentProvider interface via
 * getPaymentProvider(), never on Stripe types directly.
 *
 * Money-in  → Stripe Checkout Sessions (hosted, card only) with test card
 *             4242 4242 4242 4242.
 * Money-out → Stripe Connect transfer when a destination account is supplied;
 *             otherwise a clearly-labeled *simulated* transfer id, because
 *             paying individuals for real requires Connect onboarding that is
 *             out of scope for this proof-of-concept (see releasePayout).
 */

import type Stripe from 'stripe';
import { getStripeClient } from '../../stripe/client';
import type {
  PaymentProvider,
  PaymentState,
  CreateCheckoutParams,
  CheckoutResult,
  PaymentStatusResult,
  ReleasePayoutParams,
  PayoutResult,
  RefundParams,
  RefundResult,
} from '../provider';

const DEFAULT_CURRENCY = 'usd';

/** Prefix that unambiguously marks a *simulated* (non-real) transfer id. */
export const SIMULATED_TRANSFER_PREFIX = 'tr_sim_';

/** Dollars → cents (Stripe's smallest currency unit for USD). */
function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** Cents → dollars. */
function toMajorUnits(minor: number): number {
  return minor / 100;
}

/** Map a Stripe PaymentIntent status onto our normalized PaymentState. */
function mapIntentStatus(status: Stripe.PaymentIntent.Status): PaymentState {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'processing':
      return 'processing';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'requires_capture':
      return 'pending';
    case 'canceled':
      return 'canceled';
    default:
      return 'unknown';
  }
}

/** Map a Stripe Checkout Session status pair onto our normalized PaymentState. */
function mapSessionStatus(
  status: Stripe.Checkout.Session.Status | null,
  paymentStatus: Stripe.Checkout.Session.PaymentStatus | null
): PaymentState {
  if (status === 'complete') {
    return paymentStatus === 'unpaid' ? 'processing' : 'succeeded';
  }
  if (status === 'open') {
    return 'pending';
  }
  if (status === 'expired') {
    return 'canceled';
  }
  return 'unknown';
}

/** Map a Stripe Refund status onto our normalized refund state. */
function mapRefundStatus(
  status: string | null | undefined
): RefundResult['state'] {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'failed':
    case 'canceled':
      return 'failed';
    default:
      return 'pending';
  }
}

/** Build a clearly-labeled simulated transfer id for the PoC payout path. */
function buildSimulatedTransferId(reference: string): string {
  return `${SIMULATED_TRANSFER_PREFIX}${reference}`;
}

export class StripeTestProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  readonly testMode = true;

  /** The underlying Stripe client is lazily resolved and test-mode-guarded. */
  private get stripe(): Stripe {
    return getStripeClient();
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const currency = (params.currency || DEFAULT_CURRENCY).toLowerCase();

    // Metadata travels on both the Session and the resulting PaymentIntent so
    // that either webhook event can reconcile back to our Payment record.
    const metadata: Record<string, string> = {
      poolId: params.poolId,
      memberId: String(params.memberId),
      round: String(params.round),
      paymentRef: params.paymentRef,
      ...(params.metadata || {}),
    };

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toMinorUnits(params.amount),
            product_data: {
              name: `${params.poolName} — Round ${params.round} contribution`,
              description:
                params.description ||
                `Savings-pool contribution (pool ${params.poolId}, round ${params.round})`,
            },
          },
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      client_reference_id: params.paymentRef,
      metadata,
      payment_intent_data: { metadata },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL');
    }

    return {
      provider: this.id,
      checkoutUrl: session.url,
      reference: session.id,
      testMode: this.testMode,
    };
  }

  async getPaymentStatus(paymentRef: string): Promise<PaymentStatusResult> {
    // Accept either a PaymentIntent id (pi_…) or a Checkout Session id (cs_…).
    if (paymentRef.startsWith('pi_')) {
      const intent = await this.stripe.paymentIntents.retrieve(paymentRef);
      return {
        reference: paymentRef,
        state: mapIntentStatus(intent.status),
        paymentIntentId: intent.id,
        amount: toMajorUnits(intent.amount ?? 0),
        currency: intent.currency ?? undefined,
        raw: intent,
        testMode: this.testMode,
      };
    }

    const session = await this.stripe.checkout.sessions.retrieve(paymentRef);
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    return {
      reference: paymentRef,
      state: mapSessionStatus(session.status, session.payment_status),
      paymentIntentId,
      amount: toMajorUnits(session.amount_total ?? 0),
      currency: session.currency ?? undefined,
      raw: session,
      testMode: this.testMode,
    };
  }

  async releasePayout(params: ReleasePayoutParams): Promise<PayoutResult> {
    const currency = (params.currency || DEFAULT_CURRENCY).toLowerCase();
    const metadata: Record<string, string> = {
      poolId: params.poolId,
      round: String(params.round),
      recipientMemberId: String(params.recipientMemberId),
      recipientName: params.recipientName,
      reference: params.reference,
      simulated: params.destination ? 'false' : 'true',
      ...(params.metadata || {}),
    };

    // PRODUCTION SEAM ──────────────────────────────────────────────────────
    // With a Stripe Connect destination account we create a real (test-mode)
    // transfer. Onboarding individual recipients onto Connect is out of scope
    // for this PoC, so callers omit `destination` and we return a simulated
    // transfer id instead. To go live: onboard recipients via Connect, store
    // their acct_… id on the member, and pass it as `destination` here.
    if (params.destination) {
      const transfer = await this.stripe.transfers.create({
        amount: toMinorUnits(params.amount),
        currency,
        destination: params.destination,
        metadata,
      });
      return {
        provider: this.id,
        transferId: transfer.id,
        simulated: false,
        amount: params.amount,
        currency,
        testMode: this.testMode,
      };
    }

    return {
      provider: this.id,
      transferId: buildSimulatedTransferId(params.reference),
      simulated: true,
      amount: params.amount,
      currency,
      testMode: this.testMode,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const refundParams: Stripe.RefundCreateParams = {};

    if (params.paymentRef.startsWith('pi_')) {
      refundParams.payment_intent = params.paymentRef;
    } else if (params.paymentRef.startsWith('ch_')) {
      refundParams.charge = params.paymentRef;
    } else {
      // Assume a Checkout Session id → resolve its PaymentIntent first.
      const session = await this.stripe.checkout.sessions.retrieve(params.paymentRef);
      const intentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!intentId) {
        throw new Error(`No PaymentIntent found for ${params.paymentRef} to refund`);
      }
      refundParams.payment_intent = intentId;
    }

    if (typeof params.amount === 'number') {
      refundParams.amount = toMinorUnits(params.amount);
    }
    if (params.reason) {
      refundParams.reason = params.reason;
    }
    if (params.metadata) {
      refundParams.metadata = params.metadata;
    }

    const refund = await this.stripe.refunds.create(refundParams);

    return {
      provider: this.id,
      refundId: refund.id,
      state: mapRefundStatus(refund.status),
      amount: toMajorUnits(refund.amount ?? 0),
      currency: refund.currency ?? DEFAULT_CURRENCY,
      testMode: this.testMode,
    };
  }
}

/**
 * Resolve the active PaymentProvider. Today this always returns the
 * StripeTestProvider; the indirection is the seam where a live provider or an
 * alternate processor would be selected by configuration.
 */
export function getPaymentProvider(): PaymentProvider {
  return new StripeTestProvider();
}
