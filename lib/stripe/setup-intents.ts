/**
 * Stripe Setup Intent Utilities
 *
 * Handles creating and managing Setup Intents for saving payment methods
 * to be used for automatic off-session contribution collection.
 */

import { stripe } from '../stripe';
import Stripe from 'stripe';

export interface CreateSetupIntentParams {
  customerId: string;
  userId: string;
  poolId: string;
  contributionAmount: number;
  returnUrl?: string;
}

export interface SetupIntentResult {
  setupIntentId: string;
  clientSecret: string;
  status: string;
}

/**
 * Create a Setup Intent for saving a payment method for recurring charges
 *
 * @param params - Setup intent parameters
 * @returns Setup Intent details including client secret for frontend
 */
export async function createRecurringSetupIntent({
  customerId,
  userId,
  poolId,
  contributionAmount,
  returnUrl,
}: CreateSetupIntentParams): Promise<SetupIntentResult> {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session', // Critical: allows charging without user present
    metadata: {
      userId,
      poolId,
      contributionAmount: contributionAmount.toString(),
      type: 'recurring_contribution',
      createdAt: new Date().toISOString(),
    },
    ...(returnUrl && {
      return_url: returnUrl,
    }),
  });

  return {
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret!,
    status: setupIntent.status,
  };
}

/**
 * Retrieve a Setup Intent by ID
 */
export async function getSetupIntent(setupIntentId: string): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.retrieve(setupIntentId);
}

/**
 * Confirm a Setup Intent (server-side, if needed)
 */
export async function confirmSetupIntent(
  setupIntentId: string,
  paymentMethodId: string
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.confirm(setupIntentId, {
    payment_method: paymentMethodId,
  });
}

/**
 * Cancel a Setup Intent
 */
export async function cancelSetupIntent(setupIntentId: string): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.cancel(setupIntentId);
}

/**
 * Get payment method details from a completed Setup Intent
 */
export async function getPaymentMethodFromSetupIntent(
  setupIntentId: string
): Promise<{
  paymentMethodId: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
  };
} | null> {
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
    expand: ['payment_method'],
  });

  if (!setupIntent.payment_method || typeof setupIntent.payment_method === 'string') {
    return null;
  }

  const pm = setupIntent.payment_method as Stripe.PaymentMethod;

  const result: {
    paymentMethodId: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
    bankAccount?: {
      bankName: string;
      last4: string;
    };
  } = {
    paymentMethodId: pm.id,
    type: pm.type,
  };

  if (pm.card) {
    result.card = {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
  }

  if (pm.us_bank_account) {
    result.bankAccount = {
      bankName: pm.us_bank_account.bank_name || 'Bank',
      last4: pm.us_bank_account.last4 || '****',
    };
  }

  return result;
}

/**
 * Validate that a payment method is suitable for off-session use
 */
export async function validatePaymentMethodForRecurring(
  paymentMethodId: string
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  try {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Check if payment method is attached to a customer
    if (!pm.customer) {
      return { valid: false, reason: 'Payment method not attached to customer' };
    }

    // Check card status for cards
    if (pm.type === 'card' && pm.card) {
      // Check if card is expired
      const now = new Date();
      const expiry = new Date(pm.card.exp_year, pm.card.exp_month, 0);
      if (expiry < now) {
        return { valid: false, reason: 'Card is expired' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Unable to validate payment method' };
  }
}

/**
 * Update payment method metadata
 */
export async function updatePaymentMethodMetadata(
  paymentMethodId: string,
  metadata: Record<string, string>
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.update(paymentMethodId, { metadata });
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  email: string,
  name?: string,
  existingCustomerId?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  // If we have an existing customer ID, retrieve and return it
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: {
      ...metadata,
      source: 'juntas_seguras',
    },
  });
}

/**
 * List all payment methods for a customer
 */
export async function listCustomerPaymentMethods(
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
 * Detach a payment method from customer
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
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
