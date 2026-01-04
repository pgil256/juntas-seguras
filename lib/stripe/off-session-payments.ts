/**
 * Stripe Off-Session Payment Utilities
 *
 * Handles creating and processing off-session payments for automatic
 * contribution collection. These payments are charged without the user
 * being present, using their saved payment method.
 */

import { stripe } from '../stripe';
import Stripe from 'stripe';

export interface OffSessionPaymentParams {
  amount: number; // In dollars
  currency?: string;
  customerId: string;
  paymentMethodId: string;
  poolId: string;
  userId: string;
  round: number;
  memberName: string;
  collectionId: string;
  description?: string;
}

export interface OffSessionPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  error?: {
    code: string;
    message: string;
    declineCode?: string;
    type: 'card_error' | 'authentication_required' | 'insufficient_funds' | 'other';
  };
}

/**
 * Create and confirm an off-session payment
 *
 * This attempts to charge the customer's saved payment method without
 * requiring them to be present. Used for automatic contribution collection.
 */
export async function createOffSessionPayment({
  amount,
  currency = 'usd',
  customerId,
  paymentMethodId,
  poolId,
  userId,
  round,
  memberName,
  collectionId,
  description,
}: OffSessionPaymentParams): Promise<OffSessionPaymentResult> {
  const idempotencyKey = `auto-collect-${collectionId}`;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: description || `Automatic contribution for ${memberName} - Round ${round}`,
        metadata: {
          poolId,
          userId,
          round: round.toString(),
          memberName,
          collectionId,
          type: 'automatic_contribution',
          collectedAt: new Date().toISOString(),
        },
        // Return URL for 3D Secure if needed
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pools/${poolId}?collection_complete=true`,
      },
      {
        idempotencyKey,
      }
    );

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    }

    // Handle requires_action (3D Secure)
    if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret || undefined,
        error: {
          code: 'authentication_required',
          message: 'Card requires authentication. Please complete 3D Secure verification.',
          type: 'authentication_required',
        },
      };
    }

    // Handle other non-success statuses
    return {
      success: false,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      error: {
        code: 'payment_incomplete',
        message: `Payment status: ${paymentIntent.status}`,
        type: 'other',
      },
    };
  } catch (error) {
    return handlePaymentError(error);
  }
}

/**
 * Parse and categorize payment errors for proper handling
 */
function handlePaymentError(error: unknown): OffSessionPaymentResult {
  if (error instanceof Stripe.errors.StripeCardError) {
    const cardError = error as Stripe.errors.StripeCardError;
    const errorCode = cardError.code || 'card_error';
    const declineCode = cardError.decline_code;

    // Categorize the error type
    let errorType: 'card_error' | 'authentication_required' | 'insufficient_funds' | 'other' = 'card_error';

    if (errorCode === 'authentication_required' || declineCode === 'authentication_required') {
      errorType = 'authentication_required';
    } else if (declineCode === 'insufficient_funds') {
      errorType = 'insufficient_funds';
    }

    return {
      success: false,
      paymentIntentId: cardError.payment_intent?.id,
      error: {
        code: errorCode,
        message: cardError.message,
        declineCode: declineCode || undefined,
        type: errorType,
      },
    };
  }

  // Handle other Stripe errors
  if (error instanceof Stripe.errors.StripeError) {
    return {
      success: false,
      error: {
        code: error.code || 'stripe_error',
        message: error.message,
        type: 'other',
      },
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: 'unknown_error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      type: 'other',
    },
  };
}

/**
 * Retry a failed payment with the same or different payment method
 */
export async function retryPayment(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<OffSessionPaymentResult> {
  try {
    const params: Stripe.PaymentIntentConfirmParams = {
      off_session: true,
    };

    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, params);

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    }

    if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret || undefined,
        error: {
          code: 'authentication_required',
          message: 'Card requires authentication',
          type: 'authentication_required',
        },
      };
    }

    return {
      success: false,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      error: {
        code: 'payment_incomplete',
        message: `Payment status: ${paymentIntent.status}`,
        type: 'other',
      },
    };
  } catch (error) {
    return handlePaymentError(error);
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPayment(
  paymentIntentId: string,
  reason?: Stripe.PaymentIntentCancelParams.CancellationReason
): Promise<{ success: boolean; error?: string }> {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: reason,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel payment',
    };
  }
}

/**
 * Get payment intent status and details
 */
export async function getPaymentStatus(paymentIntentId: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata: Record<string, string>;
  lastError?: {
    code: string;
    message: string;
    declineCode?: string;
  };
}> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    status: pi.status,
    amount: pi.amount / 100,
    currency: pi.currency,
    paymentMethodId: typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id,
    metadata: pi.metadata as Record<string, string>,
    lastError: pi.last_payment_error
      ? {
          code: pi.last_payment_error.code || 'unknown',
          message: pi.last_payment_error.message || 'Payment failed',
          declineCode: pi.last_payment_error.decline_code || undefined,
        }
      : undefined,
  };
}

/**
 * Determine retry delay based on error type and attempt number
 */
export function getRetryDelayHours(errorType: string, attemptNumber: number): number {
  // Different retry strategies based on error type
  const baseDelays: Record<string, number[]> = {
    insufficient_funds: [24, 48, 72], // Wait longer for funds
    card_declined: [12, 24, 48],
    authentication_required: [1, 4, 12], // Quicker retry for 3DS
    other: [6, 24, 48],
  };

  const delays = baseDelays[errorType] || baseDelays.other;
  const index = Math.min(attemptNumber - 1, delays.length - 1);
  return delays[index];
}

/**
 * Check if a payment error is retryable
 */
export function isRetryableError(errorCode: string, declineCode?: string): boolean {
  // Non-retryable decline codes
  const nonRetryable = [
    'fraudulent',
    'lost_card',
    'stolen_card',
    'pickup_card',
    'restricted_card',
    'security_violation',
    'card_not_supported',
    'invalid_account',
    'new_account_information_available',
  ];

  if (declineCode && nonRetryable.includes(declineCode)) {
    return false;
  }

  // Most other errors are worth retrying
  return true;
}

/**
 * Get user-friendly error message for notifications
 */
export function getUserFriendlyErrorMessage(errorCode: string, declineCode?: string): string {
  const messages: Record<string, string> = {
    insufficient_funds: 'Your card has insufficient funds. Please add funds or use a different payment method.',
    card_declined: 'Your card was declined. Please check your card details or use a different payment method.',
    authentication_required: 'Your card requires additional verification. Please complete the authentication.',
    expired_card: 'Your card has expired. Please update your payment method.',
    incorrect_cvc: 'The security code on your card is incorrect. Please check and try again.',
    processing_error: 'There was a processing error. Please try again later.',
    rate_limit: 'Too many requests. Please wait and try again.',
    fraudulent: 'This transaction was flagged as potentially fraudulent. Please contact your bank.',
    lost_card: 'This card has been reported as lost. Please use a different payment method.',
    stolen_card: 'This card has been reported as stolen. Please use a different payment method.',
  };

  return messages[declineCode || errorCode] || 'Your payment could not be processed. Please update your payment method.';
}
