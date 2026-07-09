/**
 * Stripe webhook business logic — DB-facing and framework-free.
 *
 * The HTTP route (app/api/webhooks/stripe/route.ts) is a thin shell that
 * verifies the signature and hands the parsed event to handleStripeWebhookEvent
 * here. Keeping the state transitions in a plain async function makes them
 * unit/integration testable with mongodb-memory-server and without HTTP.
 *
 * Handled events:
 *   • checkout.session.completed    → confirm the contribution, advance escrow
 *   • payment_intent.payment_failed → mark the pending contribution failed
 *
 * All updates are idempotent: Stripe may deliver an event more than once.
 */

import type Stripe from 'stripe';
import connectToDatabase from '../db/connect';
import { getPaymentModel } from '../db/models/payment';
import { getPoolModel } from '../db/models/pool';
import { TransactionStatus, TransactionType } from '../../types/payment';
import { AuditLogType } from '../../types/audit';
import { createNotification, NotificationTemplates } from '../services/notifications';
import { writeServerAuditLog } from '../audit-server';

/** Metadata we stamp on every Stripe object so events reconcile to our records. */
export interface ContributionMetadata {
  poolId?: string;
  memberId?: string;
  round?: string;
  paymentRef?: string;
}

export interface WebhookHandleResult {
  handled: boolean;
  type: string;
  /** Short machine-readable outcome, useful for logging/tests. */
  outcome:
    | 'contribution_confirmed'
    | 'contribution_already_confirmed'
    | 'contribution_failed'
    | 'payment_not_found'
    | 'pool_not_found'
    | 'ignored';
  paymentId?: string;
  poolId?: string;
  escrowReady?: boolean;
}

/** Pull our reconciliation metadata off any Stripe object that carries it. */
export function extractContributionMetadata(
  metadata: Stripe.Metadata | null | undefined
): ContributionMetadata {
  const m = metadata || {};
  return {
    poolId: m.poolId,
    memberId: m.memberId,
    round: m.round,
    paymentRef: m.paymentRef,
  };
}

/** Does every member have a confirmed contribution for the given round? */
function allMembersContributed(pool: any, round: number): boolean {
  if (!pool.members || pool.members.length === 0) return false;
  return pool.members.every((member: any) => {
    const hasTransaction = (pool.transactions || []).some(
      (t: any) =>
        t.member === member.name &&
        t.type === TransactionType.CONTRIBUTION &&
        t.round === round
    );
    const memberEmailLower = member.email?.toLowerCase();
    const roundPayment = (pool.currentRoundPayments || []).find(
      (p: any) => p.memberId === member.id || p.memberEmail?.toLowerCase() === memberEmailLower
    );
    const verified =
      roundPayment?.status === 'admin_verified' || roundPayment?.status === 'excused';
    return hasTransaction || verified;
  });
}

/**
 * Handle a verified `checkout.session.completed` event: confirm the pending
 * contribution Payment, reflect it on the Pool (round payment + transaction),
 * advance the round to escrow-held (`ready_to_pay`) when all contributions are
 * in, and notify + audit.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookHandleResult> {
  await connectToDatabase();
  const Payment = getPaymentModel();
  const Pool = getPoolModel();

  const meta = extractContributionMetadata(session.metadata);
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  // Locate our pending Payment by internal ref (preferred) or session id.
  const payment =
    (meta.paymentRef && (await Payment.findOne({ paymentId: meta.paymentRef }))) ||
    (await Payment.findOne({ stripeSessionId: session.id }));

  if (!payment) {
    return { handled: true, type: session.object, outcome: 'payment_not_found' };
  }

  // Idempotency: if we already completed this contribution, do nothing.
  if (payment.status === TransactionStatus.COMPLETED) {
    return {
      handled: true,
      type: 'checkout.session.completed',
      outcome: 'contribution_already_confirmed',
      paymentId: payment.paymentId,
      poolId: payment.poolId,
    };
  }

  payment.status = TransactionStatus.COMPLETED;
  payment.stripePaymentIntentId = paymentIntentId;
  payment.processedAt = new Date();
  await payment.save();

  const poolId = meta.poolId || payment.poolId;
  const round = meta.round ? parseInt(meta.round, 10) : payment.round ?? 0;
  const pool = await Pool.findOne({ id: poolId });

  if (!pool) {
    await writeServerAuditLog({
      userId: payment.userId?.toString() || 'system',
      type: AuditLogType.PAYMENT_CONTRIBUTION,
      action: 'Stripe contribution confirmed (pool missing)',
      metadata: {
        paymentId: payment.paymentId,
        sessionId: session.id,
        paymentIntentId,
        amount: payment.amount,
        round,
        provider: 'stripe',
        testMode: !session.livemode,
      },
      poolId,
      success: false,
      errorMessage: 'Pool not found while confirming Stripe contribution',
    });
    return {
      handled: true,
      type: 'checkout.session.completed',
      outcome: 'pool_not_found',
      paymentId: payment.paymentId,
      poolId,
    };
  }

  const memberId = meta.memberId ? parseInt(meta.memberId, 10) : undefined;
  const member = pool.members.find(
    (m: any) =>
      (memberId !== undefined && m.id === memberId) ||
      m.name === payment.member ||
      (payment.userId && m.userId?.toString() === payment.userId.toString())
  );
  const memberName = member?.name || payment.member || 'A member';
  const memberEmailLower = member?.email?.toLowerCase();

  // Reflect the contribution on the pool's current-round payment tracking.
  if (!pool.currentRoundPayments) pool.currentRoundPayments = [];
  pool.currentRoundPayments = pool.currentRoundPayments.filter(
    (p: any) =>
      !(
        (member && p.memberId === member.id) ||
        (memberEmailLower && p.memberEmail?.toLowerCase() === memberEmailLower)
      )
  );
  pool.currentRoundPayments.push({
    memberId: member?.id,
    memberName,
    memberEmail: member?.email,
    amount: payment.amount,
    status: 'admin_verified', // Stripe confirmed the funds; no manual verification needed
    memberConfirmedAt: new Date(),
    memberConfirmedVia: 'stripe',
    adminVerifiedAt: new Date(),
    dueDate: pool.nextPayoutDate ? new Date(pool.nextPayoutDate) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Add a transaction row for payment history (dedupe by PaymentIntent id).
  const alreadyRecorded = (pool.transactions || []).some(
    (t: any) => paymentIntentId && t.stripePaymentIntentId === paymentIntentId
  );
  if (!alreadyRecorded) {
    const transactionId =
      Math.max(...pool.transactions.map((t: any) => t.id || 0), 0) + 1;
    pool.transactions.push({
      id: transactionId,
      type: TransactionType.CONTRIBUTION,
      amount: payment.amount,
      date: new Date().toISOString(),
      member: memberName,
      status: TransactionStatus.COMPLETED,
      round,
      stripePaymentIntentId: paymentIntentId,
    });
  }

  // System message in the pool chat.
  const messageId = Math.max(...pool.messages.map((m: any) => m.id || 0), 0) + 1;
  pool.messages.push({
    id: messageId,
    author: 'System',
    content: `${memberName} paid their $${payment.amount} contribution via card (Stripe test) for round ${round}.`,
    date: new Date().toISOString(),
  });

  // Escrow: once every member has contributed, hold funds ready for payout.
  const escrowReady = allMembersContributed(pool, round);
  const status = pool.currentRoundPayoutStatus;
  if (escrowReady && status !== 'paid' && status !== 'completed') {
    pool.currentRoundPayoutStatus = 'ready_to_pay';
  }

  await pool.save();

  await writeServerAuditLog({
    userId: payment.userId?.toString() || 'system',
    userEmail: member?.email,
    type: AuditLogType.PAYMENT_CONTRIBUTION,
    action: 'Stripe contribution confirmed',
    metadata: {
      paymentId: payment.paymentId,
      sessionId: session.id,
      paymentIntentId,
      amount: payment.amount,
      round,
      method: 'stripe',
      escrowReady,
      provider: 'stripe',
      testMode: !session.livemode,
    },
    poolId,
    success: true,
  });

  // Notify the pool admin that a contribution landed.
  const adminMember = pool.members.find((m: any) => m.role === 'admin' || m.role === 'creator');
  if (adminMember?.email) {
    await createNotification({
      userId: adminMember.email,
      message: NotificationTemplates.paymentReceived(pool.name, payment.amount, memberName),
      type: 'payment',
      isImportant: false,
    });
    if (escrowReady) {
      await createNotification({
        userId: adminMember.email,
        message: NotificationTemplates.allContributionsReceived(pool.name),
        type: 'pool',
        isImportant: true,
      });
    }
  }

  return {
    handled: true,
    type: 'checkout.session.completed',
    outcome: 'contribution_confirmed',
    paymentId: payment.paymentId,
    poolId,
    escrowReady,
  };
}

/**
 * Handle a `payment_intent.payment_failed` event: mark the pending Payment
 * failed, audit it, and notify the payer.
 */
export async function handlePaymentIntentFailed(
  intent: Stripe.PaymentIntent
): Promise<WebhookHandleResult> {
  await connectToDatabase();
  const Payment = getPaymentModel();
  const Pool = getPoolModel();

  const meta = extractContributionMetadata(intent.metadata);
  const failureMessage =
    intent.last_payment_error?.message || 'Card payment failed';

  const payment =
    (meta.paymentRef && (await Payment.findOne({ paymentId: meta.paymentRef }))) ||
    (await Payment.findOne({ stripePaymentIntentId: intent.id })) ||
    (await Payment.findOne({ stripeSessionId: intent.id }));

  if (!payment) {
    return { handled: true, type: 'payment_intent.payment_failed', outcome: 'payment_not_found' };
  }

  // Don't clobber an already-succeeded payment (out-of-order delivery).
  if (payment.status !== TransactionStatus.COMPLETED) {
    payment.status = TransactionStatus.FAILED;
    payment.failureReason = failureMessage;
    payment.failureCount = (payment.failureCount || 0) + 1;
    payment.stripePaymentIntentId = payment.stripePaymentIntentId || intent.id;
    payment.processedAt = new Date();
    await payment.save();
  }

  const poolId = meta.poolId || payment.poolId;
  await writeServerAuditLog({
    userId: payment.userId?.toString() || 'system',
    type: AuditLogType.PAYMENT_CONTRIBUTION,
    action: 'Stripe contribution failed',
    metadata: {
      paymentId: payment.paymentId,
      paymentIntentId: intent.id,
      amount: payment.amount,
      provider: 'stripe',
      testMode: !intent.livemode,
    },
    poolId,
    success: false,
    errorMessage: failureMessage,
  });

  // Notify the payer their contribution didn't go through.
  const pool = await Pool.findOne({ id: poolId });
  const memberId = meta.memberId ? parseInt(meta.memberId, 10) : undefined;
  const member = pool?.members.find(
    (m: any) => (memberId !== undefined && m.id === memberId) || m.name === payment.member
  );
  if (member?.email) {
    await createNotification({
      userId: member.email,
      message: `Your card payment of $${payment.amount}${
        pool ? ` for ${pool.name}` : ''
      } failed: ${failureMessage}. Please try again.`,
      type: 'alert',
      isImportant: true,
    });
  }

  return {
    handled: true,
    type: 'payment_intent.payment_failed',
    outcome: 'contribution_failed',
    paymentId: payment.paymentId,
    poolId,
  };
}

/**
 * Dispatch a verified Stripe event to the appropriate handler.
 * Unrecognized event types are acknowledged but ignored.
 */
export async function handleStripeWebhookEvent(
  event: Stripe.Event
): Promise<WebhookHandleResult> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    case 'payment_intent.payment_failed':
      return handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
    default:
      return { handled: false, type: event.type, outcome: 'ignored' };
  }
}
