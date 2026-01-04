/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events for:
 * - Payment completions
 * - Payment failures
 * - Refunds
 * - Connect account updates
 * - Transfer completions
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import connectToDatabase from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/payment';
import { Pool } from '@/lib/db/models/pool';
import User from '@/lib/db/models/user';
import { getPaymentSetupModel, PaymentSetupStatus } from '@/lib/db/models/paymentSetup';
import { getScheduledCollectionModel, CollectionStatus } from '@/lib/db/models/scheduledCollection';
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';
import { TransactionStatus, TransactionType } from '@/types/payment';
import { Types } from 'mongoose';
import Stripe from 'stripe';

// Disable body parsing - we need raw body for webhook verification
export const runtime = 'nodejs';

// Helper to create audit log
async function logAudit(userId: string, action: string, type: AuditLogType, metadata: Record<string, unknown>) {
  const AuditLog = getAuditLogModel();
  await AuditLog.create({
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId,
    type,
    action,
    metadata,
    success: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Verify and construct the event
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.reversed':
        await handleTransferReversed(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.updated':
        // Handle transfer status updates (can indicate failure)
        await handleTransferUpdated(event.data.object as Stripe.Transfer);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      // Setup Intent events for auto-collection
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;

      // Payment method events
      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;

  // Handle automatic contribution payments
  if (metadata?.type === 'automatic_contribution') {
    await handleAutomaticContributionSuccess(paymentIntent);
    return;
  }

  // Find and update payment record
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!payment) {
    console.log('Payment record not found for:', paymentIntent.id);
    return;
  }

  // Determine new status based on capture method
  const isEscrow = metadata?.isEscrow === 'true';
  const newStatus = isEscrow && paymentIntent.status === 'requires_capture'
    ? TransactionStatus.ESCROWED
    : TransactionStatus.COMPLETED;

  payment.status = newStatus;
  payment.stripeCaptureId = paymentIntent.latest_charge as string;
  payment.processedAt = new Date();
  await payment.save();

  // Update pool if applicable
  if (payment.poolId && newStatus === TransactionStatus.COMPLETED) {
    await updatePoolContribution(payment);
  }

  // Log activity
  if (metadata?.userId) {
    await logAudit(
      metadata.userId,
      isEscrow ? 'payment_escrowed' : 'payment_completed',
      AuditLogType.PAYMENT,
      {
        paymentId: payment.paymentId,
        poolId: metadata.poolId,
        amount: paymentIntent.amount / 100,
        stripePaymentIntentId: paymentIntent.id,
      }
    );
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;

  // Handle automatic contribution failures
  if (metadata?.type === 'automatic_contribution') {
    await handleAutomaticContributionFailure(paymentIntent);
    return;
  }

  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!payment) return;

  payment.status = TransactionStatus.FAILED;
  payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
  payment.failureCount = (payment.failureCount || 0) + 1;
  await payment.save();

  if (metadata?.userId) {
    await logAudit(
      metadata.userId,
      'payment_failed',
      AuditLogType.PAYMENT,
      {
        paymentId: payment.paymentId,
        reason: payment.failureReason,
        stripePaymentIntentId: paymentIntent.id,
      }
    );
  }
}

/**
 * Handle canceled payment (escrow voided)
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!payment) return;

  payment.status = TransactionStatus.CANCELLED;
  await payment.save();

  const { metadata } = paymentIntent;
  if (metadata?.userId) {
    await logAudit(
      metadata.userId,
      'payment_cancelled',
      AuditLogType.PAYMENT,
      {
        paymentId: payment.paymentId,
        stripePaymentIntentId: paymentIntent.id,
      }
    );
  }
}

/**
 * Handle refund
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const payment = await Payment.findOne({
    stripeCaptureId: charge.id,
  });

  if (!payment) return;

  // Create refund record
  const refundPayment = await Payment.create({
    paymentId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: payment.userId,
    poolId: payment.poolId,
    amount: (charge.amount_refunded || 0) / 100,
    currency: payment.currency,
    type: TransactionType.REFUND,
    status: TransactionStatus.COMPLETED,
    description: `Refund for payment ${payment.paymentId}`,
    relatedPaymentId: payment.paymentId,
    stripeRefundId: charge.refunds?.data[0]?.id,
  });

  await logAudit(
    payment.userId.toString(),
    'payment_refunded',
    AuditLogType.PAYMENT,
    {
      originalPaymentId: payment.paymentId,
      refundPaymentId: refundPayment.paymentId,
      amount: refundPayment.amount,
    }
  );
}

/**
 * Handle transfer created (payout to connected account)
 * This handles both regular payouts and early payouts
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  const { metadata } = transfer;

  // Handle payment-based transfers (using Payment model)
  if (metadata?.paymentId) {
    const payment = await Payment.findOne({ paymentId: metadata.paymentId });
    if (payment) {
      payment.status = TransactionStatus.COMPLETED;
      payment.stripeTransferId = transfer.id;
      payment.processedAt = new Date();
      await payment.save();
    }
  }

  // Handle pool-based transfers (using Pool model transactions)
  // This includes both regular and early payouts
  if (metadata?.poolId && metadata?.cycleNumber) {
    const pool = await Pool.findOne({ id: metadata.poolId });
    if (pool) {
      const cycleNumber = parseInt(metadata.cycleNumber, 10);

      // Find and update the payout transaction
      const transactionIndex = pool.transactions.findIndex(
        (t: any) =>
          t.type === TransactionType.PAYOUT &&
          t.round === cycleNumber &&
          t.stripeTransferId === transfer.id
      );

      if (transactionIndex !== -1) {
        pool.transactions[transactionIndex].status = TransactionStatus.COMPLETED;
      }

      // Update recipient status
      const recipientMember = pool.members.find(
        (m: any) => m.position === cycleNumber
      );
      if (recipientMember) {
        recipientMember.payoutReceived = true;
        recipientMember.status = 'completed';
      }

      await pool.save();

      // Log based on whether this was an early payout
      const wasEarlyPayout = metadata.wasEarlyPayout === 'true';
      const action = wasEarlyPayout ? 'early_payout_transfer_completed' : 'payout_transfer_completed';
      const auditType = wasEarlyPayout ? AuditLogType.PAYMENT_EARLY_PAYOUT : AuditLogType.PAYMENT_PAYOUT;

      if (metadata.initiatedBy || metadata.recipientUserId) {
        await logAudit(
          metadata.initiatedBy || metadata.recipientUserId,
          action,
          auditType,
          {
            poolId: metadata.poolId,
            cycleNumber,
            amount: transfer.amount / 100,
            stripeTransferId: transfer.id,
            wasEarlyPayout,
          }
        );
      }
    }
  }

  // Legacy handling for Payment model
  if (metadata?.userId && !metadata?.cycleNumber) {
    await logAudit(
      metadata.userId,
      'payout_completed',
      AuditLogType.PAYMENT,
      {
        paymentId: metadata.paymentId,
        poolId: metadata.poolId,
        amount: transfer.amount / 100,
        stripeTransferId: transfer.id,
      }
    );
  }
}

/**
 * Handle transfer updated
 * This can handle status changes for both regular payouts and early payouts
 * Note: Stripe doesn't have a specific transfer.failed event, but transfers can fail
 * and this will be reflected in the transfer.updated event or transfer.reversed event
 */
async function handleTransferUpdated(transfer: Stripe.Transfer) {
  const { metadata } = transfer;

  // Only handle if transfer is in a failed/cancelled state
  // Transfers are typically successful immediately or reversed later
  // This handler mainly catches edge cases
  if (!transfer.reversed) {
    return; // Transfer is still valid, nothing to do
  }

  // Handle payment-based transfers
  if (metadata?.paymentId) {
    const payment = await Payment.findOne({ paymentId: metadata.paymentId });
    if (payment && payment.status !== TransactionStatus.FAILED) {
      payment.status = TransactionStatus.FAILED;
      payment.failureReason = 'Transfer was reversed or failed';
      await payment.save();
    }
  }

  // Handle pool-based transfers (including early payouts)
  if (metadata?.poolId && metadata?.cycleNumber) {
    const pool = await Pool.findOne({ id: metadata.poolId });
    if (pool) {
      const cycleNumber = parseInt(metadata.cycleNumber, 10);

      // Find and update the payout transaction
      const transactionIndex = pool.transactions.findIndex(
        (t: any) =>
          t.type === TransactionType.PAYOUT &&
          t.round === cycleNumber &&
          t.stripeTransferId === transfer.id
      );

      if (transactionIndex !== -1 && pool.transactions[transactionIndex].status !== TransactionStatus.FAILED) {
        pool.transactions[transactionIndex].status = TransactionStatus.FAILED;
        await pool.save();

        // Log the failure
        const wasEarlyPayout = metadata.wasEarlyPayout === 'true';
        const action = wasEarlyPayout ? 'early_payout_transfer_failed' : 'payout_transfer_failed';

        if (metadata.initiatedBy || metadata.recipientUserId) {
          await logAudit(
            metadata.initiatedBy || metadata.recipientUserId,
            action,
            AuditLogType.PAYMENT,
            {
              poolId: metadata.poolId,
              cycleNumber,
              stripeTransferId: transfer.id,
              wasEarlyPayout,
              reason: 'Transfer was reversed or failed',
            }
          );
        }
      }
    }
  }
}

/**
 * Handle reversed transfer (rare but possible)
 * This handles transfer reversals for both regular and early payouts
 */
async function handleTransferReversed(transfer: Stripe.Transfer) {
  const { metadata } = transfer;

  // Handle pool-based transfers (including early payouts)
  if (metadata?.poolId && metadata?.cycleNumber) {
    const pool = await Pool.findOne({ id: metadata.poolId });
    if (pool) {
      const cycleNumber = parseInt(metadata.cycleNumber, 10);

      // Find the payout transaction
      const transactionIndex = pool.transactions.findIndex(
        (t: any) =>
          t.type === TransactionType.PAYOUT &&
          t.round === cycleNumber &&
          t.stripeTransferId === transfer.id
      );

      if (transactionIndex !== -1) {
        pool.transactions[transactionIndex].status = TransactionStatus.FAILED;
      }

      // Revert recipient status
      const recipientMember = pool.members.find(
        (m: any) => m.position === cycleNumber
      );
      if (recipientMember) {
        recipientMember.payoutReceived = false;
        recipientMember.status = 'current';
      }

      // Restore pool balance
      pool.totalAmount = (pool.totalAmount || 0) + (transfer.amount / 100);

      await pool.save();

      // Add system message
      const messageId = Math.max(...pool.messages.map((m: any) => m.id || 0), 0) + 1;
      await Pool.updateOne(
        { id: metadata.poolId },
        {
          $push: {
            messages: {
              id: messageId,
              author: 'System',
              content: `Payout for Round ${cycleNumber} was reversed. Please contact support for assistance.`,
              date: new Date().toISOString(),
            },
          },
        }
      );

      // Log the reversal
      const wasEarlyPayout = metadata.wasEarlyPayout === 'true';

      if (metadata.initiatedBy || metadata.recipientUserId) {
        await logAudit(
          metadata.initiatedBy || metadata.recipientUserId,
          'payout_transfer_reversed',
          AuditLogType.PAYMENT,
          {
            poolId: metadata.poolId,
            cycleNumber,
            amount: transfer.amount / 100,
            stripeTransferId: transfer.id,
            wasEarlyPayout,
            reason: 'Transfer was reversed',
          }
        );
      }
    }
  }

  // Handle payment-based transfers
  if (metadata?.paymentId) {
    const payment = await Payment.findOne({ paymentId: metadata.paymentId });
    if (payment) {
      payment.status = TransactionStatus.FAILED;
      payment.failureReason = 'Transfer was reversed';
      await payment.save();

      if (metadata.userId) {
        await logAudit(
          metadata.userId,
          'payout_reversed',
          AuditLogType.PAYMENT,
          {
            paymentId: payment.paymentId,
            stripeTransferId: transfer.id,
          }
        );
      }
    }
  }
}

/**
 * Handle Connect account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {
  const user = await User.findOne({ stripeConnectAccountId: account.id });
  if (!user) return;

  // Update payout capability status
  user.stripePayoutsEnabled = account.payouts_enabled || false;
  user.stripeDetailsSubmitted = account.details_submitted || false;
  await user.save();

  await logAudit(
    user._id.toString(),
    'stripe_account_updated',
    AuditLogType.ACCOUNT,
    {
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    }
  );
}

/**
 * Update pool with completed contribution
 */
async function updatePoolContribution(payment: { poolId: string; userId: Types.ObjectId | string; amount: number; stripePaymentIntentId?: string; round?: number }) {
  const pool = await Pool.findById(payment.poolId);
  if (!pool) return;

  // Find member
  const memberIndex = pool.members.findIndex(
    (m: { userId: Types.ObjectId }) => m.userId.toString() === payment.userId.toString()
  );

  if (memberIndex >= 0) {
    pool.members[memberIndex].totalContributed =
      (pool.members[memberIndex].totalContributed || 0) + payment.amount;
    pool.members[memberIndex].paymentsOnTime =
      (pool.members[memberIndex].paymentsOnTime || 0) + 1;
  }

  // Add to transactions
  pool.transactions.push({
    type: 'CONTRIBUTION',
    amount: payment.amount,
    member: pool.members[memberIndex]?.name || 'Unknown',
    round: payment.round || pool.currentRound,
    date: new Date(),
    status: 'COMPLETED',
    stripePaymentIntentId: payment.stripePaymentIntentId,
  });

  // Update total
  pool.totalAmount = (pool.totalAmount || 0) + payment.amount;

  await pool.save();
}

/**
 * Handle successful Setup Intent (payment method saved for recurring)
 */
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  const { metadata } = setupIntent;

  if (!metadata?.userId || !metadata?.poolId) {
    console.log('Setup Intent without required metadata:', setupIntent.id);
    return;
  }

  const PaymentSetup = getPaymentSetupModel();

  // Check if PaymentSetup already exists (created via confirm-setup endpoint)
  const existing = await PaymentSetup.findOne({
    userId: metadata.userId,
    poolId: metadata.poolId,
    setupIntentId: setupIntent.id,
  });

  if (existing) {
    // Already processed
    return;
  }

  // If not created via API, log it for tracking
  await logAudit(
    metadata.userId,
    'setup_intent_succeeded_webhook',
    AuditLogType.PAYMENT,
    {
      setupIntentId: setupIntent.id,
      poolId: metadata.poolId,
      paymentMethodId: setupIntent.payment_method,
    }
  );
}

/**
 * Handle failed Setup Intent
 */
async function handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
  const { metadata } = setupIntent;

  if (!metadata?.userId) {
    return;
  }

  await logAudit(
    metadata.userId,
    'setup_intent_failed',
    AuditLogType.PAYMENT,
    {
      setupIntentId: setupIntent.id,
      poolId: metadata?.poolId,
      error: setupIntent.last_setup_error?.message,
    }
  );
}

/**
 * Handle detached payment method
 * When a payment method is detached from a customer, mark any associated PaymentSetups as inactive
 */
async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  const PaymentSetup = getPaymentSetupModel();

  // Find all PaymentSetups using this payment method
  const affectedSetups = await PaymentSetup.find({
    stripePaymentMethodId: paymentMethod.id,
    status: PaymentSetupStatus.ACTIVE,
  });

  if (affectedSetups.length === 0) {
    return;
  }

  // Mark them as requiring update
  for (const setup of affectedSetups) {
    setup.status = PaymentSetupStatus.REQUIRES_UPDATE;
    setup.updateRequestedAt = new Date();
    await setup.save();

    await logAudit(
      setup.userId.toString(),
      'payment_method_detached',
      AuditLogType.PAYMENT,
      {
        poolId: setup.poolId,
        paymentMethodId: paymentMethod.id,
      }
    );
  }
}

/**
 * Handle automatic contribution payment success
 * Updates the ScheduledCollection record when an off-session payment succeeds
 */
async function handleAutomaticContributionSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;

  if (metadata?.type !== 'automatic_contribution' || !metadata?.collectionId) {
    return;
  }

  const ScheduledCollection = getScheduledCollectionModel();
  const PaymentSetup = getPaymentSetupModel();

  const collection = await ScheduledCollection.findOne({
    collectionId: metadata.collectionId,
  });

  if (!collection) {
    console.log('Collection not found for automatic payment:', metadata.collectionId);
    return;
  }

  // Update collection status
  collection.status = CollectionStatus.COMPLETED;
  collection.completedAt = new Date();
  collection.stripePaymentIntentId = paymentIntent.id;
  await collection.save();

  // Update PaymentSetup stats
  const paymentSetup = await PaymentSetup.findOne({
    userId: collection.userId,
    poolId: collection.poolId,
    status: PaymentSetupStatus.ACTIVE,
  });

  if (paymentSetup) {
    paymentSetup.lastUsedAt = new Date();
    paymentSetup.lastSuccessAt = new Date();
    paymentSetup.consecutiveFailures = 0;
    paymentSetup.totalSuccessfulCharges++;
    await paymentSetup.save();
  }

  await logAudit(
    collection.userId.toString(),
    'automatic_collection_completed',
    AuditLogType.PAYMENT,
    {
      collectionId: metadata.collectionId,
      poolId: metadata.poolId,
      round: metadata.round,
      amount: paymentIntent.amount / 100,
      paymentIntentId: paymentIntent.id,
    }
  );
}

/**
 * Handle automatic contribution payment failure
 */
async function handleAutomaticContributionFailure(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;

  if (metadata?.type !== 'automatic_contribution' || !metadata?.collectionId) {
    return;
  }

  const ScheduledCollection = getScheduledCollectionModel();
  const PaymentSetup = getPaymentSetupModel();

  const collection = await ScheduledCollection.findOne({
    collectionId: metadata.collectionId,
  });

  if (!collection) {
    return;
  }

  const errorCode = paymentIntent.last_payment_error?.code || 'unknown';
  const declineCode = paymentIntent.last_payment_error?.decline_code;

  // Update collection
  collection.lastErrorCode = errorCode;
  collection.lastDeclineCode = declineCode || undefined;
  collection.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
  await collection.save();

  // Update PaymentSetup stats
  const paymentSetup = await PaymentSetup.findOne({
    userId: collection.userId,
    poolId: collection.poolId,
  });

  if (paymentSetup) {
    paymentSetup.lastUsedAt = new Date();
    paymentSetup.lastFailedAt = new Date();
    paymentSetup.consecutiveFailures++;
    paymentSetup.totalFailedCharges++;
    await paymentSetup.save();
  }

  await logAudit(
    collection.userId.toString(),
    'automatic_collection_failed',
    AuditLogType.PAYMENT,
    {
      collectionId: metadata.collectionId,
      poolId: metadata.poolId,
      round: metadata.round,
      errorCode,
      declineCode,
      paymentIntentId: paymentIntent.id,
    }
  );
}

// Allow GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Stripe webhook endpoint active' });
}
