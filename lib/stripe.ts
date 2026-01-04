/**
 * Stripe Integration Library
 *
 * Handles all Stripe payment operations including:
 * - Payment intents (one-time payments)
 * - Payment holds/captures (escrow-like functionality)
 * - Stripe Connect for payouts to members
 * - Customer and payment method management
 */

import Stripe from 'stripe';

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export { stripe };

// ============================================
// PAYMENT INTENTS (Contributions)
// ============================================

interface CreatePaymentIntentParams {
  amount: number; // in dollars
  currency?: string;
  customerId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual'; // manual = escrow/hold
  description?: string;
}

/**
 * Create a payment intent for contributions
 * Use captureMethod: 'manual' for escrow-like holds
 */
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  customerId,
  paymentMethodId,
  metadata = {},
  captureMethod = 'automatic',
  description,
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    capture_method: captureMethod,
    metadata,
    description,
    automatic_payment_methods: {
      enabled: true,
    },
  };

  if (customerId) {
    params.customer = customerId;
  }

  if (paymentMethodId) {
    params.payment_method = paymentMethodId;
    params.confirm = true;
    params.return_url = `${process.env.NEXT_PUBLIC_APP_URL}/payments/complete`;
  }

  return stripe.paymentIntents.create(params);
}

/**
 * Confirm a payment intent (when user completes payment on frontend)
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentConfirmParams = {};

  if (paymentMethodId) {
    params.payment_method = paymentMethodId;
  }

  return stripe.paymentIntents.confirm(paymentIntentId, params);
}

/**
 * Capture a held payment (release escrow)
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amountToCapture?: number // Optional: capture less than authorized
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentCaptureParams = {};

  if (amountToCapture !== undefined) {
    params.amount_to_capture = Math.round(amountToCapture * 100);
  }

  return stripe.paymentIntents.capture(paymentIntentId, params);
}

/**
 * Cancel a payment intent (void escrow)
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  reason?: Stripe.PaymentIntentCancelParams.CancellationReason
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.cancel(paymentIntentId, {
    cancellation_reason: reason,
  });
}

/**
 * Retrieve payment intent status
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number, // Optional: partial refund
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> {
  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount !== undefined) {
    params.amount = Math.round(amount * 100);
  }

  if (reason) {
    params.reason = reason;
  }

  return stripe.refunds.create(params);
}

// ============================================
// CUSTOMERS
// ============================================

interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe customer (link to your user)
 */
export async function createCustomer({
  email,
  name,
  metadata = {},
}: CreateCustomerParams): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email,
    name,
    metadata,
  });
}

/**
 * Retrieve a customer
 */
export async function getCustomer(
  customerId: string
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return stripe.customers.retrieve(customerId);
}

/**
 * Update customer details
 */
export async function updateCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, updates);
}

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * Detach a payment method from a customer
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * List customer's payment methods
 */
export async function listPaymentMethods(
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = 'card'
): Promise<Stripe.PaymentMethod[]> {
  const result = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  });
  return result.data;
}

/**
 * Set default payment method for customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// ============================================
// STRIPE CONNECT (For Payouts to Members)
// ============================================

/**
 * Create a Connect account for a member to receive payouts
 * This is required for each member who will receive pool payouts
 */
export async function createConnectAccount(
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: 'express', // Simplest for marketplace payouts
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata,
  });
}

/**
 * Create an account link for Connect onboarding
 * Redirect user to this URL to complete their payout account setup
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

/**
 * Check if a Connect account is ready to receive payouts
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

/**
 * Check if account can receive payouts
 */
export async function canReceivePayouts(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId);
  return account.payouts_enabled === true;
}

/**
 * Create a payout to a connected account (member receives pool payout)
 */
export async function createTransfer(
  amount: number,
  destinationAccountId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    destination: destinationAccountId,
    metadata,
  });
}

/**
 * Get transfer status
 */
export async function getTransfer(transferId: string): Promise<Stripe.Transfer> {
  return stripe.transfers.retrieve(transferId);
}

/**
 * Create a login link for connected account dashboard
 */
export async function createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
  return stripe.accounts.createLoginLink(accountId);
}

// ============================================
// SETUP INTENTS (Save cards for future use)
// ============================================

/**
 * Create a setup intent to save a payment method for future use
 */
export async function createSetupIntent(
  customerId: string,
  metadata?: Record<string, string>
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata,
  });
}

/**
 * Retrieve a setup intent
 */
export async function getSetupIntent(
  setupIntentId: string
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.retrieve(setupIntentId);
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * Construct and verify a webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// ============================================
// BALANCE & TRANSACTIONS
// ============================================

/**
 * Get platform balance
 */
export async function getBalance(): Promise<Stripe.Balance> {
  return stripe.balance.retrieve();
}

/**
 * List balance transactions
 */
export async function listBalanceTransactions(
  limit = 10
): Promise<Stripe.BalanceTransaction[]> {
  const result = await stripe.balanceTransactions.list({ limit });
  return result.data;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format amount for display
 */
export function formatAmount(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
