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
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';
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
        await handleTransferFailed(event.data.object as Stripe.Transfer);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
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
    ? 'ESCROWED'
    : 'COMPLETED';

  payment.status = newStatus;
  payment.stripeCaptureId = paymentIntent.latest_charge as string;
  payment.processedAt = new Date();
  await payment.save();

  // Update pool if applicable
  if (payment.poolId && newStatus === 'COMPLETED') {
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
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!payment) return;

  payment.status = 'FAILED';
  payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
  payment.failureCount = (payment.failureCount || 0) + 1;
  await payment.save();

  const { metadata } = paymentIntent;
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

  payment.status = 'CANCELLED';
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
    type: 'REFUND',
    status: 'COMPLETED',
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
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  const { metadata } = transfer;

  if (!metadata?.paymentId) return;

  const payment = await Payment.findOne({ paymentId: metadata.paymentId });
  if (!payment) return;

  payment.status = 'COMPLETED';
  payment.stripeTransferId = transfer.id;
  payment.processedAt = new Date();
  await payment.save();

  // Update pool if applicable
  if (metadata.poolId) {
    const pool = await Pool.findById(metadata.poolId);
    if (pool) {
      const recipientMember = pool.members.find(
        (m: { oderId: Types.ObjectId }) => m.oderId?.toString() === metadata.recipientId
      );
      if (recipientMember) {
        recipientMember.payoutReceived = true;
        recipientMember.status = 'COMPLETED';
      }
      pool.totalAmount -= transfer.amount / 100;
      await pool.save();
    }
  }

  if (metadata.userId) {
    await logAudit(
      metadata.userId,
      'payout_completed',
      AuditLogType.PAYMENT,
      {
        paymentId: payment.paymentId,
        poolId: metadata.poolId,
        amount: transfer.amount / 100,
        stripeTransferId: transfer.id,
      }
    );
  }
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(transfer: Stripe.Transfer) {
  const { metadata } = transfer;

  if (!metadata?.paymentId) return;

  const payment = await Payment.findOne({ paymentId: metadata.paymentId });
  if (!payment) return;

  payment.status = 'FAILED';
  payment.failureReason = 'Transfer to recipient failed';
  await payment.save();

  if (metadata.userId) {
    await logAudit(
      metadata.userId,
      'payout_failed',
      AuditLogType.PAYMENT,
      {
        paymentId: payment.paymentId,
        stripeTransferId: transfer.id,
      }
    );
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
async function updatePoolContribution(payment: { poolId: Types.ObjectId; userId: Types.ObjectId; amount: number; stripePaymentIntentId: string; round?: number }) {
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

// Allow GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Stripe webhook endpoint active' });
}
