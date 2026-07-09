/**
 * PaymentProvider — the abstraction layer for card/electronic payments.
 *
 * API routes and services depend ONLY on this interface, never on a concrete
 * payment SDK. Today the sole implementation is StripeTestProvider
 * (lib/payments/providers/stripe.ts), running against Stripe's test sandbox,
 * but the seam lets us add live Stripe, Stripe Connect, or an entirely
 * different processor later without touching business logic.
 *
 * NOTE: This is additive. The manual P2P methods (Venmo/Zelle/PayPal/Cash App
 * via deep-links + QR) are unchanged and do not flow through this interface.
 */

/** Identifier for the concrete provider backing an operation. */
export type PaymentProviderId = 'stripe';

/** Normalized lifecycle state for a collected payment. */
export type PaymentState =
  | 'pending' // created, awaiting the payer
  | 'processing' // payer submitted, funds settling
  | 'succeeded' // funds collected
  | 'failed' // payment attempt failed
  | 'canceled' // session/intent canceled or expired
  | 'unknown'; // provider returned a state we don't map

/**
 * Parameters for creating a hosted checkout to collect a single contribution.
 */
export interface CreateCheckoutParams {
  /** Pool string id (Pool.id, not Mongo _id). */
  poolId: string;
  /** Human-readable pool name, shown on the checkout line item. */
  poolName: string;
  /** Numeric pool-member id of the contributor (PoolMember.id). */
  memberId: number;
  /** Round number this contribution is for. */
  round: number;
  /** Amount to collect, in major units (dollars). */
  amount: number;
  /** ISO 4217 currency code. Defaults to 'usd'. */
  currency?: string;
  /**
   * Internal reconciliation reference — the pending Payment.paymentId. Persisted
   * in provider metadata so the webhook can tie the event back to our record.
   */
  paymentRef: string;
  /** Contributor email, prefilled on the checkout page when available. */
  customerEmail?: string;
  /** Optional line-item description override. */
  description?: string;
  /** URL to return to after a successful payment. */
  successUrl: string;
  /** URL to return to if the payer cancels. */
  cancelUrl: string;
  /** Extra metadata merged into the provider object. */
  metadata?: Record<string, string>;
}

/** Result of creating a checkout — enough to redirect the payer. */
export interface CheckoutResult {
  provider: PaymentProviderId;
  /** URL to redirect the contributor to (Stripe hosted Checkout). */
  checkoutUrl: string;
  /** Provider-side reference (Stripe Checkout Session id, cs_test_…). */
  reference: string;
  /** Client secret for embedded/Element flows. Unused for hosted Checkout. */
  clientSecret?: string;
  /** Always true in this PoC; surfaced so the UI can show a TEST MODE badge. */
  testMode: boolean;
}

/** Normalized status for a previously created payment. */
export interface PaymentStatusResult {
  /** The reference that was queried (session or intent id). */
  reference: string;
  state: PaymentState;
  /** Underlying PaymentIntent id (pi_test_…) once known. */
  paymentIntentId?: string;
  /** Amount in major units, when resolvable. */
  amount?: number;
  currency?: string;
  /** Provider-native object, for logging/debugging only. */
  raw?: unknown;
  testMode: boolean;
}

/**
 * Parameters for releasing a round payout to the recipient.
 *
 * In production this maps to a Stripe Connect transfer to the recipient's
 * connected account. In the PoC there is no Connect onboarding, so the
 * implementation records a clearly-labeled simulated transfer instead — see
 * the `destination` seam below.
 */
export interface ReleasePayoutParams {
  poolId: string;
  round: number;
  /** Numeric pool-member id of the payout recipient. */
  recipientMemberId: number;
  recipientName: string;
  /** Payout amount in major units (dollars). */
  amount: number;
  currency?: string;
  /** Internal reference — the payout Payment.paymentId. */
  reference: string;
  /**
   * Stripe Connect destination account id (acct_…). PRODUCTION SEAM: when
   * present, a real test-mode transfer is attempted; when omitted (the PoC
   * default) the provider returns a simulated transfer id.
   */
  destination?: string;
  metadata?: Record<string, string>;
}

/** Result of a payout release. */
export interface PayoutResult {
  provider: PaymentProviderId;
  /** Transfer id to persist as Payment.stripeTransferId. */
  transferId: string;
  /** True when no Connect destination was available and the transfer was simulated. */
  simulated: boolean;
  amount: number;
  currency: string;
  testMode: boolean;
}

/** Parameters for refunding a collected payment. */
export interface RefundParams {
  /** Stripe PaymentIntent id (pi_…) or Checkout Session id to refund. */
  paymentRef: string;
  /** Partial amount in major units; full refund when omitted. */
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

/** Result of a refund. */
export interface RefundResult {
  provider: PaymentProviderId;
  /** Refund id to persist as Payment.stripeRefundId. */
  refundId: string;
  state: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
  testMode: boolean;
}

/**
 * The provider contract. Implementations MUST be side-effect free at
 * construction and should throw descriptive errors on misconfiguration.
 */
export interface PaymentProvider {
  /** Which provider this is. */
  readonly id: PaymentProviderId;
  /** Whether this provider is operating in test/sandbox mode. */
  readonly testMode: boolean;

  /** Create a hosted checkout to collect a contribution. */
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;

  /**
   * Look up the current status of a payment by provider reference
   * (Checkout Session id or PaymentIntent id).
   */
  getPaymentStatus(paymentRef: string): Promise<PaymentStatusResult>;

  /** Release a round payout to the recipient (real or simulated transfer). */
  releasePayout(params: ReleasePayoutParams): Promise<PayoutResult>;

  /** Refund a collected payment. */
  refund(params: RefundParams): Promise<RefundResult>;
}
