import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '../../../../lib/paypal';

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

// GET handler for PayPal webhook URL validation
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'PayPal webhook endpoint is active' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Get webhook verification headers
    const headers = {
      transmissionId: request.headers.get('paypal-transmission-id') || '',
      transmissionTime: request.headers.get('paypal-transmission-time') || '',
      certUrl: request.headers.get('paypal-cert-url') || '',
      authAlgo: request.headers.get('paypal-auth-algo') || '',
      transmissionSig: request.headers.get('paypal-transmission-sig') || '',
    };

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && PAYPAL_WEBHOOK_ID) {
      const verification = await verifyWebhookSignature(PAYPAL_WEBHOOK_ID, body, headers);
      if (!verification.verified) {
        console.error('PayPal webhook signature verification failed');
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    } else {
      console.warn('PAYPAL_WEBHOOK_ID not set - skipping signature verification (dev mode)');
    }

    const event = JSON.parse(body);
    const eventType = event.event_type;

    console.log(`PayPal webhook received: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      // Order events
      case 'CHECKOUT.ORDER.APPROVED': {
        const order = event.resource;
        console.log(`Order approved: ${order.id}`);
        await handleOrderApproved(order);
        break;
      }

      case 'CHECKOUT.ORDER.COMPLETED': {
        const order = event.resource;
        console.log(`Order completed: ${order.id}`);
        await handleOrderCompleted(order);
        break;
      }

      // Payment events
      case 'PAYMENT.AUTHORIZATION.CREATED': {
        const authorization = event.resource;
        console.log(`Authorization created: ${authorization.id}`);
        await handleAuthorizationCreated(authorization);
        break;
      }

      case 'PAYMENT.AUTHORIZATION.VOIDED': {
        const authorization = event.resource;
        console.log(`Authorization voided: ${authorization.id}`);
        await handleAuthorizationVoided(authorization);
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource;
        console.log(`Capture completed: ${capture.id}`);
        await handleCaptureCompleted(capture);
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const capture = event.resource;
        console.log(`Capture denied: ${capture.id}`);
        await handleCaptureDenied(capture);
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const capture = event.resource;
        console.log(`Capture refunded: ${capture.id}`);
        await handleCaptureRefunded(capture);
        break;
      }

      // Payout events
      case 'PAYMENT.PAYOUTSBATCH.SUCCESS': {
        const payout = event.resource;
        console.log(`Payout batch succeeded: ${payout.batch_header?.payout_batch_id}`);
        await handlePayoutSuccess(payout);
        break;
      }

      case 'PAYMENT.PAYOUTSBATCH.DENIED': {
        const payout = event.resource;
        console.log(`Payout batch denied: ${payout.batch_header?.payout_batch_id}`);
        await handlePayoutDenied(payout);
        break;
      }

      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED': {
        const payoutItem = event.resource;
        console.log(`Payout item succeeded: ${payoutItem.payout_item_id}`);
        await handlePayoutItemSuccess(payoutItem);
        break;
      }

      case 'PAYMENT.PAYOUTS-ITEM.FAILED': {
        const payoutItem = event.resource;
        console.log(`Payout item failed: ${payoutItem.payout_item_id}`);
        await handlePayoutItemFailed(payoutItem);
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Event Handlers

async function handleOrderApproved(order: any) {
  const customId = order.purchase_units?.[0]?.custom_id;
  let metadata: any = {};

  try {
    metadata = customId ? JSON.parse(customId) : {};
  } catch {
    // Custom ID is not JSON, ignore
  }

  const { userId, poolId } = metadata;

  // TODO: Update payment record in database
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalOrderId: order.id },
  //   { status: 'approved' }
  // );

  console.log(`Order ${order.id} approved for user ${userId} in pool ${poolId}`);
}

async function handleOrderCompleted(order: any) {
  const customId = order.purchase_units?.[0]?.custom_id;
  let metadata: any = {};

  try {
    metadata = customId ? JSON.parse(customId) : {};
  } catch {
    // Custom ID is not JSON, ignore
  }

  const { userId, poolId } = metadata;

  // TODO: Update payment record in database
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalOrderId: order.id },
  //   { status: 'completed', processedAt: new Date() }
  // );

  console.log(`Order ${order.id} completed for user ${userId} in pool ${poolId}`);
}

async function handleAuthorizationCreated(authorization: any) {
  // TODO: Store authorization ID in payment record
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalOrderId: authorization.supplementary_data?.related_ids?.order_id },
  //   { paypalAuthorizationId: authorization.id, status: 'authorized' }
  // );

  console.log(`Authorization created: ${authorization.id}`);
}

async function handleAuthorizationVoided(authorization: any) {
  // TODO: Update payment record to cancelled
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalAuthorizationId: authorization.id },
  //   { status: 'cancelled' }
  // );

  console.log(`Authorization voided: ${authorization.id}`);
}

async function handleCaptureCompleted(capture: any) {
  // TODO: Update payment record to completed
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalAuthorizationId: capture.supplementary_data?.related_ids?.authorization_id },
  //   { status: 'completed', paypalCaptureId: capture.id, processedAt: new Date() }
  // );

  console.log(`Capture completed: ${capture.id}, amount: ${capture.amount?.value} ${capture.amount?.currency_code}`);
}

async function handleCaptureDenied(capture: any) {
  // TODO: Update payment record to failed
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalCaptureId: capture.id },
  //   { status: 'failed', failureReason: 'Capture denied' }
  // );

  console.log(`Capture denied: ${capture.id}`);
}

async function handleCaptureRefunded(capture: any) {
  // TODO: Create refund record and update original payment
  // Example:
  // await Payment.findOneAndUpdate(
  //   { paypalCaptureId: capture.id },
  //   { status: 'refunded' }
  // );

  console.log(`Capture refunded: ${capture.id}`);
}

async function handlePayoutSuccess(payout: any) {
  const batchId = payout.batch_header?.payout_batch_id;

  // TODO: Update payout record in database
  // Example:
  // await Payout.findOneAndUpdate(
  //   { paypalPayoutBatchId: batchId },
  //   { status: 'completed', processedAt: new Date() }
  // );

  console.log(`Payout batch succeeded: ${batchId}`);
}

async function handlePayoutDenied(payout: any) {
  const batchId = payout.batch_header?.payout_batch_id;

  // TODO: Update payout record to failed and notify admin
  // Example:
  // await Payout.findOneAndUpdate(
  //   { paypalPayoutBatchId: batchId },
  //   { status: 'failed' }
  // );

  console.log(`Payout batch denied: ${batchId}`);
}

async function handlePayoutItemSuccess(payoutItem: any) {
  // TODO: Update individual payout item record
  // Example:
  // await PayoutItem.findOneAndUpdate(
  //   { paypalPayoutItemId: payoutItem.payout_item_id },
  //   { status: 'completed' }
  // );

  console.log(`Payout item succeeded: ${payoutItem.payout_item_id}`);
}

async function handlePayoutItemFailed(payoutItem: any) {
  // TODO: Update individual payout item to failed and notify
  // Example:
  // await PayoutItem.findOneAndUpdate(
  //   { paypalPayoutItemId: payoutItem.payout_item_id },
  //   { status: 'failed', failureReason: payoutItem.errors }
  // );

  console.log(`Payout item failed: ${payoutItem.payout_item_id}`);
}
