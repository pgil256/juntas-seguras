import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key', {
  apiVersion: '2023-10-16', // Use the latest API version
});

/**
 * Creates a payment intent for a user's contribution
 * @param amount Amount in cents
 * @param currency Currency code (e.g., 'usd')
 * @param customerId Stripe customer ID
 * @param description Description of the payment
 * @param metadata Additional metadata
 */
export async function createPaymentIntent(
  amount: number, 
  currency: string = 'usd',
  customerId?: string,
  description?: string,
  metadata?: Record<string, string>
) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      description,
      metadata,
      capture_method: 'manual', // This allows us to authorize payment but capture later
    });
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Captures a previously authorized payment
 * @param paymentIntentId The ID of the payment intent to capture
 */
export async function capturePayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Error capturing payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancels a payment intent that hasn't been captured yet
 * @param paymentIntentId The ID of the payment intent to cancel
 */
export async function cancelPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Error canceling payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates or retrieves a Stripe customer for a user
 * @param userId The user ID in your system
 * @param email The user's email
 * @param name The user's name
 */
export async function getOrCreateCustomer(userId: string, email: string, name?: string) {
  try {
    // First, search for an existing customer with this userId in metadata
    const customers = await stripe.customers.list({
      limit: 1,
      expand: ['data.sources'],
      email: email,
    });
    
    if (customers.data.length > 0) {
      return {
        success: true,
        customerId: customers.data[0].id,
        isNew: false,
      };
    }
    
    // If no customer exists, create a new one
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: userId,
      },
    });
    
    return {
      success: true,
      customerId: customer.id,
      isNew: true,
    };
  } catch (error) {
    console.error('Error creating/retrieving customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a transfer to a connected account (for pool payout)
 * @param amount Amount in cents
 * @param currency Currency code
 * @param destinationAccountId The Stripe account ID to transfer to
 * @param description Description of the transfer
 * @param metadata Additional metadata
 */
export async function createTransfer(
  amount: number,
  currency: string = 'usd',
  destinationAccountId: string,
  description?: string,
  metadata?: Record<string, string>
) {
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      destination: destinationAccountId,
      description,
      metadata,
    });
    
    return {
      success: true,
      transferId: transfer.id,
    };
  } catch (error) {
    console.error('Error creating transfer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a Stripe Connect account for a pool member
 * @param email Account holder's email
 * @param country Two-letter country code
 * @param metadata Additional metadata
 */
export async function createConnectedAccount(
  email: string,
  country: string = 'US',
  metadata?: Record<string, string>
) {
  try {
    const account = await stripe.accounts.create({
      type: 'express', // Use Express for simplest integration
      country,
      email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata,
    });
    
    return {
      success: true,
      accountId: account.id,
    };
  } catch (error) {
    console.error('Error creating connected account:', error);
    return {
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates an account link for onboarding a connected account
 * @param accountId The account ID to create a link for
 * @param refreshUrl URL to redirect on refresh
 * @param returnUrl URL to redirect on completion
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return {
      success: true,
      url: accountLink.url,
    };
  } catch (error) {
    console.error('Error creating account link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a Stripe Identity Verification session
 * @param customerId The Stripe customer ID
 * @param returnUrl URL to redirect after verification
 * @param successUrl URL to redirect on successful verification
 * @param failureUrl URL to redirect on failed verification
 */
export async function createIdentityVerification(
  customerId: string,
  returnUrl: string,
  successUrl?: string,
  failureUrl?: string
) {
  try {
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        customer_id: customerId,
      },
      return_url: returnUrl,
      success_url: successUrl,
      failure_url: failureUrl,
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_matching_selfie: true,
        },
      },
    });
    
    return {
      success: true,
      verificationId: verificationSession.id,
      url: verificationSession.url,
    };
  } catch (error) {
    console.error('Error creating identity verification session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves a Stripe Identity Verification session
 * @param verificationId The ID of the verification session to retrieve
 */
export async function getIdentityVerification(verificationId: string) {
  try {
    const verificationSession = await stripe.identity.verificationSessions.retrieve(verificationId);
    
    return {
      success: true,
      verification: verificationSession,
      status: verificationSession.status,
    };
  } catch (error) {
    console.error('Error retrieving identity verification session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default stripe;