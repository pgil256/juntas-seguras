import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '../../../../lib/paypal';
import connectToDatabase from '../../../../lib/db/connect';
import { getPaymentModel } from '../../../../lib/db/models/payment';
import { getPoolModel } from '../../../../lib/db/models/pool';
import { TransactionStatus, TransactionType } from '../../../../types/payment';

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

    // Connect to database for all handlers
    await connectToDatabase();

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
  const Payment = getPaymentModel();
  const customId = order.purchase_units?.[0]?.custom_id;
  let metadata: any = {};

  try {
    metadata = customId ? JSON.parse(customId) : {};
  } catch {
    // Custom ID is not JSON, ignore
  }

  const { userId, poolId } = metadata;

  // Update payment record in database
  const result = await Payment.findOneAndUpdate(
    { paypalOrderId: order.id },
    {
      status: TransactionStatus.PENDING,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (result) {
    console.log(`Order ${order.id} approved - payment ${result.paymentId} updated for user ${userId} in pool ${poolId}`);
  } else {
    console.warn(`Order ${order.id} approved but no matching payment found in database`);
  }
}

async function handleOrderCompleted(order: any) {
  const Payment = getPaymentModel();
  const customId = order.purchase_units?.[0]?.custom_id;
  let metadata: any = {};

  try {
    metadata = customId ? JSON.parse(customId) : {};
  } catch {
    // Custom ID is not JSON, ignore
  }

  const { userId, poolId } = metadata;

  // Update payment record in database
  const result = await Payment.findOneAndUpdate(
    { paypalOrderId: order.id },
    {
      status: TransactionStatus.COMPLETED,
      processedAt: new Date(),
      updatedAt: new Date()
    },
    { new: true }
  );

  if (result) {
    console.log(`Order ${order.id} completed - payment ${result.paymentId} updated for user ${userId} in pool ${poolId}`);
  } else {
    console.warn(`Order ${order.id} completed but no matching payment found in database`);
  }
}

async function handleAuthorizationCreated(authorization: any) {
  const Payment = getPaymentModel();

  // Get the order ID from the authorization
  const orderId = authorization.supplementary_data?.related_ids?.order_id;

  if (!orderId) {
    console.warn('Authorization created but no order ID found in supplementary_data');
    return;
  }

  // Store authorization ID in payment record and update status to ESCROWED
  const result = await Payment.findOneAndUpdate(
    { paypalOrderId: orderId },
    {
      paypalAuthorizationId: authorization.id,
      status: TransactionStatus.ESCROWED,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (result) {
    console.log(`Authorization ${authorization.id} created - payment ${result.paymentId} updated to ESCROWED`);
  } else {
    console.warn(`Authorization ${authorization.id} created but no matching payment found for order ${orderId}`);
  }
}

async function handleAuthorizationVoided(authorization: any) {
  const Payment = getPaymentModel();

  // Update payment record to cancelled
  const result = await Payment.findOneAndUpdate(
    { paypalAuthorizationId: authorization.id },
    {
      status: TransactionStatus.CANCELLED,
      failureReason: 'Authorization voided',
      updatedAt: new Date()
    },
    { new: true }
  );

  if (result) {
    console.log(`Authorization ${authorization.id} voided - payment ${result.paymentId} cancelled`);
  } else {
    console.warn(`Authorization ${authorization.id} voided but no matching payment found`);
  }
}

async function handleCaptureCompleted(capture: any) {
  const Payment = getPaymentModel();
  const Pool = getPoolModel();

  // Get authorization ID to find the payment
  const authorizationId = capture.supplementary_data?.related_ids?.authorization_id;

  // Update payment record to completed/released
  const payment = await Payment.findOneAndUpdate(
    { paypalAuthorizationId: authorizationId },
    {
      status: TransactionStatus.RELEASED,
      paypalCaptureId: capture.id,
      processedAt: new Date(),
      releasedAt: new Date(),
      updatedAt: new Date()
    },
    { new: true }
  );

  if (payment) {
    console.log(`Capture ${capture.id} completed - payment ${payment.paymentId} released, amount: ${capture.amount?.value} ${capture.amount?.currency_code}`);

    // Update pool balance
    const pool = await Pool.findOne({ id: payment.poolId });
    if (pool) {
      pool.totalAmount = (pool.totalAmount || 0) + payment.amount;
      await pool.save();
      console.log(`Pool ${payment.poolId} balance updated to ${pool.totalAmount}`);
    }
  } else {
    console.warn(`Capture ${capture.id} completed but no matching payment found for authorization ${authorizationId}`);
  }
}

async function handleCaptureDenied(capture: any) {
  const Payment = getPaymentModel();

  // Update payment record to failed
  const result = await Payment.findOneAndUpdate(
    { paypalCaptureId: capture.id },
    {
      status: TransactionStatus.FAILED,
      failureReason: 'Capture denied by PayPal',
      failureCount: { $inc: 1 },
      updatedAt: new Date()
    },
    { new: true }
  );

  if (result) {
    console.log(`Capture ${capture.id} denied - payment ${result.paymentId} marked as failed`);
    // TODO: Send notification to admin about failed capture
  } else {
    console.warn(`Capture ${capture.id} denied but no matching payment found`);
  }
}

async function handleCaptureRefunded(capture: any) {
  const Payment = getPaymentModel();

  // Update original payment to refunded status
  const payment = await Payment.findOneAndUpdate(
    { paypalCaptureId: capture.id },
    {
      status: TransactionStatus.CANCELLED,
      failureReason: 'Payment refunded',
      updatedAt: new Date()
    },
    { new: true }
  );

  if (payment) {
    console.log(`Capture ${capture.id} refunded - payment ${payment.paymentId} marked as refunded`);

    // Create a refund transaction record
    const refundPayment = new Payment({
      paymentId: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: payment.userId,
      poolId: payment.poolId,
      amount: -payment.amount, // Negative amount for refund
      currency: payment.currency,
      type: TransactionType.REFUND,
      status: TransactionStatus.COMPLETED,
      description: `Refund for payment ${payment.paymentId}`,
      member: payment.member,
      relatedPaymentId: payment.paymentId,
      processedAt: new Date()
    });

    await refundPayment.save();
    console.log(`Refund transaction ${refundPayment.paymentId} created`);

    // Update pool balance (subtract refunded amount)
    const Pool = getPoolModel();
    const pool = await Pool.findOne({ id: payment.poolId });
    if (pool) {
      pool.totalAmount = Math.max(0, (pool.totalAmount || 0) - payment.amount);
      await pool.save();
      console.log(`Pool ${payment.poolId} balance adjusted for refund`);
    }
  } else {
    console.warn(`Capture ${capture.id} refunded but no matching payment found`);
  }
}

async function handlePayoutSuccess(payout: any) {
  const Pool = getPoolModel();
  const batchId = payout.batch_header?.payout_batch_id;

  // Find pool with this payout batch ID and update transaction status
  const pools = await Pool.find({
    'transactions.paypalPayoutBatchId': batchId
  });

  for (const pool of pools) {
    let updated = false;
    for (const transaction of pool.transactions) {
      if (transaction.paypalPayoutBatchId === batchId) {
        transaction.status = TransactionStatus.COMPLETED;
        updated = true;
      }
    }
    if (updated) {
      await pool.save();
      console.log(`Payout batch ${batchId} succeeded - pool ${pool.id} transactions updated`);
    }
  }

  if (pools.length === 0) {
    console.warn(`Payout batch ${batchId} succeeded but no matching pool transactions found`);
  }
}

async function handlePayoutDenied(payout: any) {
  const Pool = getPoolModel();
  const batchId = payout.batch_header?.payout_batch_id;

  // Find pool with this payout batch ID and update transaction status
  const pools = await Pool.find({
    'transactions.paypalPayoutBatchId': batchId
  });

  for (const pool of pools) {
    let updated = false;
    for (const transaction of pool.transactions) {
      if (transaction.paypalPayoutBatchId === batchId) {
        transaction.status = TransactionStatus.FAILED;
        updated = true;
      }
    }
    if (updated) {
      // Revert payout received status for the recipient
      const failedPayout = pool.transactions.find(
        (t: any) => t.paypalPayoutBatchId === batchId && t.type === TransactionType.PAYOUT
      );
      if (failedPayout) {
        const recipient = pool.members.find((m: any) => m.name === failedPayout.member);
        if (recipient) {
          recipient.payoutReceived = false;
        }
      }

      await pool.save();
      console.log(`Payout batch ${batchId} denied - pool ${pool.id} transactions marked as failed`);
      // TODO: Send notification to admin about failed payout
    }
  }

  if (pools.length === 0) {
    console.warn(`Payout batch ${batchId} denied but no matching pool transactions found`);
  }
}

async function handlePayoutItemSuccess(payoutItem: any) {
  // Individual payout item succeeded
  // The batch success handler typically handles the main update
  // This is for more granular tracking if needed
  console.log(`Payout item ${payoutItem.payout_item_id} succeeded - recipient: ${payoutItem.payout_item?.receiver}, amount: ${payoutItem.payout_item?.amount?.value}`);
}

async function handlePayoutItemFailed(payoutItem: any) {
  const Pool = getPoolModel();

  // Try to parse metadata from sender_item_id
  let metadata: any = {};
  try {
    metadata = payoutItem.payout_item?.sender_item_id
      ? JSON.parse(payoutItem.payout_item.sender_item_id)
      : {};
  } catch {
    // Not JSON, might be a simple batch ID
  }

  const { poolId, round, recipientId } = metadata;
  const errorMessage = payoutItem.errors?.message || 'Unknown error';

  if (poolId) {
    const pool = await Pool.findOne({ id: poolId });
    if (pool) {
      // Find and update the specific payout transaction
      for (const transaction of pool.transactions) {
        if (transaction.type === TransactionType.PAYOUT &&
            transaction.round === parseInt(round)) {
          transaction.status = TransactionStatus.FAILED;
        }
      }

      // Revert recipient's payout status
      const recipient = pool.members.find(
        (m: any) => m.id === recipientId || m.email === recipientId
      );
      if (recipient) {
        recipient.payoutReceived = false;
      }

      await pool.save();
      console.log(`Payout item failed for pool ${poolId} round ${round}: ${errorMessage}`);
      // TODO: Send notification to admin about failed payout item
    }
  } else {
    console.warn(`Payout item ${payoutItem.payout_item_id} failed but could not identify pool: ${errorMessage}`);
  }
}
