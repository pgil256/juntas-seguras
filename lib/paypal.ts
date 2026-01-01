/**
 * PayPal Payment Integration for Juntas App
 * Uses PayPal REST API for payment processing, escrow (authorization/capture), and payouts
 */

// PayPal API configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';
const PAYPAL_API_BASE = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal access token for API calls
 */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Creates an order (payment) with authorization intent for escrow functionality
 * @param amount Amount in dollars
 * @param currency Currency code (e.g., 'USD')
 * @param description Description of the payment
 * @param metadata Additional metadata
 */
export async function createOrder(
  amount: number,
  currency: string = 'USD',
  description?: string,
  metadata?: Record<string, string>
) {
  try {
    const accessToken = await getAccessToken();

    const orderPayload = {
      intent: 'AUTHORIZE', // Authorize first, capture later (escrow)
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount.toFixed(2),
        },
        description: description || 'Pool contribution',
        custom_id: metadata ? JSON.stringify(metadata) : undefined,
      }],
      application_context: {
        brand_name: 'Juntas Seguras',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create PayPal order');
    }

    const order = await response.json();

    // Get approval URL for the user to authorize payment
    const approvalLink = order.links?.find((link: any) => link.rel === 'approve');

    return {
      success: true,
      orderId: order.id,
      approvalUrl: approvalLink?.href,
      status: order.status,
    };
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Authorize a payment after user approval (for escrow)
 * @param orderId The PayPal order ID to authorize
 */
export async function authorizeOrder(orderId: string) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/authorize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to authorize PayPal order');
    }

    const authorization = await response.json();
    const authorizationId = authorization.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;

    return {
      success: true,
      orderId: authorization.id,
      authorizationId,
      status: authorization.status,
    };
  } catch (error) {
    console.error('Error authorizing PayPal order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Capture an authorized payment (release from escrow)
 * @param authorizationId The authorization ID to capture
 */
export async function captureAuthorization(authorizationId: string) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to capture PayPal authorization');
    }

    const capture = await response.json();

    return {
      success: true,
      captureId: capture.id,
      status: capture.status,
    };
  } catch (error) {
    console.error('Error capturing PayPal authorization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Void an authorization (cancel escrow without capturing)
 * @param authorizationId The authorization ID to void
 */
export async function voidAuthorization(authorizationId: string) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/authorizations/${authorizationId}/void`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to void PayPal authorization');
    }

    return {
      success: true,
      status: 'VOIDED',
    };
  } catch (error) {
    console.error('Error voiding PayPal authorization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a payout to a PayPal account
 * @param amount Amount in dollars
 * @param currency Currency code
 * @param recipientEmail PayPal email of the recipient
 * @param note Note to include with the payout
 * @param metadata Additional metadata
 */
export async function createPayout(
  amount: number,
  currency: string = 'USD',
  recipientEmail: string,
  note?: string,
  metadata?: Record<string, string>
) {
  try {
    const accessToken = await getAccessToken();
    const batchId = `payout_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payoutPayload = {
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: 'You have received a payout from Juntas Seguras',
        email_message: note || 'Your pool payout has been processed.',
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency: currency.toUpperCase(),
        },
        receiver: recipientEmail,
        note: note || 'Pool payout',
        sender_item_id: metadata ? JSON.stringify(metadata) : batchId,
      }],
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payoutPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create PayPal payout');
    }

    const payout = await response.json();

    return {
      success: true,
      payoutBatchId: payout.batch_header?.payout_batch_id,
      batchStatus: payout.batch_header?.batch_status,
    };
  } catch (error) {
    console.error('Error creating PayPal payout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get payout status
 * @param payoutBatchId The payout batch ID to check
 */
export async function getPayoutStatus(payoutBatchId: string) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts/${payoutBatchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get PayPal payout status');
    }

    const payout = await response.json();

    return {
      success: true,
      batchStatus: payout.batch_header?.batch_status,
      items: payout.items,
    };
  } catch (error) {
    console.error('Error getting PayPal payout status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get order details
 * @param orderId The PayPal order ID
 */
export async function getOrderDetails(orderId: string) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get PayPal order details');
    }

    const order = await response.json();

    return {
      success: true,
      order,
      status: order.status,
    };
  } catch (error) {
    console.error('Error getting PayPal order details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify webhook signature
 * @param webhookId The webhook ID from PayPal
 * @param eventBody The raw request body
 * @param headers The request headers
 */
export async function verifyWebhookSignature(
  webhookId: string,
  eventBody: string,
  headers: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
  }
) {
  try {
    const accessToken = await getAccessToken();

    const verifyPayload = {
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(eventBody),
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    });

    if (!response.ok) {
      return { verified: false };
    }

    const result = await response.json();
    return {
      verified: result.verification_status === 'SUCCESS',
    };
  } catch (error) {
    console.error('Error verifying PayPal webhook signature:', error);
    return { verified: false };
  }
}

/**
 * Refund a captured payment
 * @param captureId The capture ID to refund
 * @param amount Optional partial refund amount
 * @param currency Currency code
 */
export async function refundCapture(
  captureId: string,
  amount?: number,
  currency: string = 'USD'
) {
  try {
    const accessToken = await getAccessToken();

    const refundPayload = amount ? {
      amount: {
        value: amount.toFixed(2),
        currency_code: currency.toUpperCase(),
      },
    } : {};

    const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to refund PayPal payment');
    }

    const refund = await response.json();

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
    };
  } catch (error) {
    console.error('Error refunding PayPal payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export configuration for client-side use
export const paypalConfig = {
  clientId: PAYPAL_CLIENT_ID,
  mode: PAYPAL_MODE,
};
