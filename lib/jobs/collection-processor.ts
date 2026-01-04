/**
 * Collection Processor Job
 *
 * Processes scheduled automatic contributions by charging saved payment methods.
 * This job should be run on a schedule (e.g., every hour via cron).
 */

import connectToDatabase from '../db/connect';
import { getScheduledCollectionModel, CollectionStatus, generateIdempotencyKey } from '../db/models/scheduledCollection';
import { getPaymentSetupModel, PaymentSetupStatus } from '../db/models/paymentSetup';
import { getPoolModel } from '../db/models/pool';
import User from '../db/models/user';
import { getAuditLogModel } from '../db/models/auditLog';
import { AuditLogType } from '@/types/audit';
import { TransactionType, TransactionStatus } from '@/types/payment';
import {
  createOffSessionPayment,
  getRetryDelayHours,
  isRetryableError,
  getUserFriendlyErrorMessage,
} from '../stripe/off-session-payments';

interface ProcessingResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  retried: number;
  errors: Array<{
    collectionId: string;
    error: string;
  }>;
}

interface CollectionLogEntry {
  timestamp: Date;
  runId: string;
  result: ProcessingResult;
  duration: number;
}

/**
 * Main collection processing function
 *
 * Processes all due collections and retries failed ones.
 */
export async function processScheduledCollections(): Promise<ProcessingResult> {
  const startTime = Date.now();
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[CollectionProcessor] Starting run ${runId}`);

  await connectToDatabase();

  const ScheduledCollection = getScheduledCollectionModel();
  const PaymentSetup = getPaymentSetupModel();
  const Pool = getPoolModel();
  const AuditLog = getAuditLogModel();

  const result: ProcessingResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    errors: [],
  };

  const now = new Date();

  try {
    // Find all collections that are due for processing
    // 1. PENDING collections where collectionEligibleAt <= now
    // 2. FAILED collections that are due for retry (nextRetryAt <= now and attemptCount < maxAttempts)
    const dueCollections = await ScheduledCollection.find({
      $or: [
        {
          status: CollectionStatus.PENDING,
          collectionEligibleAt: { $lte: now },
        },
        {
          status: CollectionStatus.FAILED,
          nextRetryAt: { $lte: now },
          $expr: { $lt: ['$attemptCount', '$maxAttempts'] },
        },
      ],
    }).limit(100); // Process in batches to avoid overload

    console.log(`[CollectionProcessor] Found ${dueCollections.length} collections to process`);

    for (const collection of dueCollections) {
      result.processed++;

      try {
        // Mark as processing
        collection.status = CollectionStatus.PROCESSING;
        collection.processedAt = now;
        await collection.save();

        // Get the payment setup for this user/pool
        const paymentSetup = await PaymentSetup.findOne({
          userId: collection.userId,
          poolId: collection.poolId,
          status: PaymentSetupStatus.ACTIVE,
        });

        if (!paymentSetup) {
          // No active payment setup - skip and mark for admin attention
          collection.status = CollectionStatus.FAILED;
          collection.failureReason = 'No active payment method configured';
          collection.lastErrorCode = 'no_payment_method';
          await collection.save();
          result.skipped++;
          continue;
        }

        // Check if user already contributed manually
        const pool = await Pool.findOne({ id: collection.poolId });
        if (pool) {
          const existingContribution = pool.transactions.find(
            (t: { member: string; type: string; round: number }) =>
              t.member === collection.memberName &&
              t.type === TransactionType.CONTRIBUTION &&
              t.round === collection.round
          );

          if (existingContribution) {
            // Already paid manually
            collection.status = CollectionStatus.MANUALLY_PAID;
            collection.completedAt = now;
            await collection.save();
            result.skipped++;
            continue;
          }
        }

        // Increment attempt count
        const attemptNumber = collection.attemptCount + 1;
        collection.attemptCount = attemptNumber;
        collection.lastAttemptAt = now;

        // Generate idempotency key for this attempt
        const idempotencyKey = generateIdempotencyKey(collection.collectionId, attemptNumber);
        collection.idempotencyKey = idempotencyKey;

        // Process the payment
        const paymentResult = await createOffSessionPayment({
          amount: collection.amount,
          customerId: paymentSetup.stripeCustomerId,
          paymentMethodId: paymentSetup.stripePaymentMethodId,
          poolId: collection.poolId,
          userId: collection.userId.toString(),
          round: collection.round,
          memberName: collection.memberName,
          collectionId: collection.collectionId,
        });

        // Record the attempt
        collection.retryAttempts.push({
          attemptNumber,
          attemptedAt: now,
          success: paymentResult.success,
          stripePaymentIntentId: paymentResult.paymentIntentId,
          errorCode: paymentResult.error?.code,
          errorMessage: paymentResult.error?.message,
          declineCode: paymentResult.error?.declineCode,
        });

        if (paymentResult.success) {
          // Success!
          collection.status = CollectionStatus.COMPLETED;
          collection.completedAt = now;
          collection.stripePaymentIntentId = paymentResult.paymentIntentId;
          collection.stripePaymentMethodId = paymentSetup.stripePaymentMethodId;
          collection.stripeCustomerId = paymentSetup.stripeCustomerId;

          // Update payment setup stats
          paymentSetup.lastUsedAt = now;
          paymentSetup.lastSuccessAt = now;
          paymentSetup.consecutiveFailures = 0;
          paymentSetup.totalSuccessfulCharges++;
          await paymentSetup.save();

          // Record contribution in pool (webhook will also do this, but we do it here for immediate effect)
          await recordContributionInPool(
            collection.poolId,
            collection.userId.toString(),
            collection.memberName,
            collection.amount,
            collection.round,
            paymentResult.paymentIntentId!
          );

          result.successful++;

          // Audit log
          await AuditLog.create({
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            userId: collection.userId.toString(),
            type: AuditLogType.PAYMENT,
            action: 'automatic_collection_success',
            metadata: {
              collectionId: collection.collectionId,
              poolId: collection.poolId,
              round: collection.round,
              amount: collection.amount,
              paymentIntentId: paymentResult.paymentIntentId,
            },
            success: true,
          });
        } else {
          // Payment failed
          const errorCode = paymentResult.error?.code || 'unknown';
          const declineCode = paymentResult.error?.declineCode;

          collection.lastErrorCode = errorCode;
          collection.lastDeclineCode = declineCode;
          collection.failureReason = paymentResult.error?.message || 'Payment failed';

          // Update payment setup failure stats
          paymentSetup.lastUsedAt = now;
          paymentSetup.lastFailedAt = now;
          paymentSetup.consecutiveFailures++;
          paymentSetup.totalFailedCharges++;
          paymentSetup.failureCount++;

          // Add to payment setup's collection attempts
          paymentSetup.collectionAttempts = paymentSetup.collectionAttempts.slice(-9); // Keep last 10
          paymentSetup.collectionAttempts.push({
            attemptNumber,
            attemptedAt: now,
            success: false,
            stripePaymentIntentId: paymentResult.paymentIntentId,
            errorCode,
            errorMessage: paymentResult.error?.message,
            declineCode,
          });
          await paymentSetup.save();

          // Check if we should retry
          if (attemptNumber < collection.maxAttempts && isRetryableError(errorCode, declineCode)) {
            // Schedule retry
            const retryDelayHours = getRetryDelayHours(paymentResult.error?.type || 'other', attemptNumber);
            const nextRetry = new Date(now.getTime() + retryDelayHours * 60 * 60 * 1000);

            collection.status = CollectionStatus.FAILED;
            collection.nextRetryAt = nextRetry;
            collection.retryAttempts[collection.retryAttempts.length - 1].nextRetryAt = nextRetry;

            result.retried++;

            // Send notification about failed collection (but will retry)
            await sendCollectionFailedNotification(collection, paymentResult.error!, true);
          } else {
            // Max attempts reached or non-retryable error
            collection.status = CollectionStatus.FAILED;
            collection.nextRetryAt = undefined;

            // Mark payment setup as requiring update if too many consecutive failures
            if (paymentSetup.consecutiveFailures >= 3) {
              paymentSetup.status = PaymentSetupStatus.REQUIRES_UPDATE;
              paymentSetup.updateRequestedAt = now;
              await paymentSetup.save();
            }

            result.failed++;

            // Send final failure notification
            await sendCollectionFailedNotification(collection, paymentResult.error!, false);
          }

          // Audit log
          await AuditLog.create({
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            userId: collection.userId.toString(),
            type: AuditLogType.PAYMENT,
            action: 'automatic_collection_failed',
            metadata: {
              collectionId: collection.collectionId,
              poolId: collection.poolId,
              round: collection.round,
              amount: collection.amount,
              attemptNumber,
              errorCode,
              declineCode,
              willRetry: attemptNumber < collection.maxAttempts && isRetryableError(errorCode, declineCode),
            },
            success: false,
          });

          result.errors.push({
            collectionId: collection.collectionId,
            error: paymentResult.error?.message || 'Unknown error',
          });
        }

        await collection.save();
      } catch (error) {
        console.error(`[CollectionProcessor] Error processing collection ${collection.collectionId}:`, error);

        // Revert to pending if we had an unexpected error
        collection.status = CollectionStatus.PENDING;
        await collection.save();

        result.errors.push({
          collectionId: collection.collectionId,
          error: error instanceof Error ? error.message : 'Unexpected error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CollectionProcessor] Completed run ${runId} in ${duration}ms`, result);

    return result;
  } catch (error) {
    console.error('[CollectionProcessor] Fatal error:', error);
    throw error;
  }
}

/**
 * Record a successful contribution in the pool
 */
async function recordContributionInPool(
  poolId: string,
  userId: string,
  memberName: string,
  amount: number,
  round: number,
  paymentIntentId: string
): Promise<void> {
  const Pool = getPoolModel();
  const pool = await Pool.findOne({ id: poolId });

  if (!pool) {
    console.error(`[CollectionProcessor] Pool not found: ${poolId}`);
    return;
  }

  // Check if already recorded (webhook might have done it)
  const existing = pool.transactions.find(
    (t: { member: string; type: string; round: number; stripePaymentIntentId?: string }) =>
      t.stripePaymentIntentId === paymentIntentId
  );

  if (existing) {
    return; // Already recorded
  }

  // Create transaction record
  const transactionId = Math.max(
    ...pool.transactions.map((t: { id?: number }) => t.id || 0),
    0
  ) + 1;

  pool.transactions.push({
    id: transactionId,
    type: TransactionType.CONTRIBUTION,
    amount,
    date: new Date().toISOString(),
    member: memberName,
    status: TransactionStatus.COMPLETED,
    round,
    stripePaymentIntentId: paymentIntentId,
  });

  // Update member stats
  const memberIndex = pool.members.findIndex(
    (m: { userId?: { toString(): string }; name: string }) =>
      m.userId?.toString() === userId || m.name === memberName
  );

  if (memberIndex >= 0) {
    pool.members[memberIndex].totalContributed =
      (pool.members[memberIndex].totalContributed || 0) + amount;
    pool.members[memberIndex].paymentsOnTime =
      (pool.members[memberIndex].paymentsOnTime || 0) + 1;
  }

  // Update pool total
  pool.totalAmount = (pool.totalAmount || 0) + amount;

  // Add system message
  const messageId = Math.max(...pool.messages.map((m: { id?: number }) => m.id || 0), 0) + 1;
  pool.messages.push({
    id: messageId,
    author: 'System',
    content: `Automatic contribution of $${amount} collected from ${memberName} for round ${round}.`,
    date: new Date().toISOString(),
  });

  await pool.save();
}

/**
 * Send notification about collection failure
 */
async function sendCollectionFailedNotification(
  collection: { collectionId: string; memberName: string; memberEmail: string; amount: number; poolId: string; round: number; failureNotificationSentAt?: Date },
  error: { code: string; message: string; declineCode?: string; type: string },
  willRetry: boolean
): Promise<void> {
  // TODO: Integrate with your notification service
  // This is a placeholder for email/push notifications

  const userMessage = getUserFriendlyErrorMessage(error.code, error.declineCode);

  console.log(`[CollectionProcessor] Notification to ${collection.memberEmail}:`, {
    subject: willRetry
      ? `Payment failed - We'll try again`
      : `Action required: Update your payment method`,
    message: userMessage,
    collectionId: collection.collectionId,
    amount: collection.amount,
    willRetry,
  });

  // Mark notification sent
  collection.failureNotificationSentAt = new Date();

  // In a real implementation, you would:
  // 1. Send email via SendGrid, SES, etc.
  // 2. Send push notification via FCM, APNs, etc.
  // 3. Create in-app notification
}

/**
 * Schedule collections for a new round
 *
 * Called when a new round starts to create scheduled collection records for all members
 */
export async function scheduleCollectionsForRound(
  poolId: string,
  round: number,
  dueDate: Date,
  gracePeriodHours: number = 24
): Promise<void> {
  await connectToDatabase();

  const Pool = getPoolModel();
  const ScheduledCollection = getScheduledCollectionModel();
  const PaymentSetup = getPaymentSetupModel();

  const pool = await Pool.findOne({ id: poolId });
  if (!pool) {
    throw new Error(`Pool not found: ${poolId}`);
  }

  const collectionEligibleAt = new Date(dueDate.getTime() + gracePeriodHours * 60 * 60 * 1000);

  for (const member of pool.members) {
    if (!member.userId) continue; // Skip members without user accounts

    // Check if they have payment setup
    const paymentSetup = await PaymentSetup.findOne({
      userId: member.userId,
      poolId,
      status: PaymentSetupStatus.ACTIVE,
    });

    if (!paymentSetup) {
      console.log(`[CollectionProcessor] No payment setup for member ${member.name} in pool ${poolId}`);
      continue; // They'll need to pay manually
    }

    // Check if collection already scheduled
    const existing = await ScheduledCollection.findOne({
      poolId,
      userId: member.userId,
      round,
    });

    if (existing) {
      continue; // Already scheduled
    }

    // Create scheduled collection
    const collectionId = `col_${poolId}_r${round}_${member.userId.toString().substring(0, 8)}`;

    await ScheduledCollection.create({
      collectionId,
      poolId,
      userId: member.userId,
      memberName: member.name,
      memberEmail: member.email,
      round,
      amount: pool.contributionAmount,
      dueDate,
      gracePeriodHours,
      collectionEligibleAt,
      status: CollectionStatus.SCHEDULED,
    });
  }

  console.log(`[CollectionProcessor] Scheduled collections for pool ${poolId}, round ${round}`);
}

/**
 * Cancel a scheduled collection (e.g., member paid manually or left pool)
 */
export async function cancelScheduledCollection(
  collectionId: string,
  cancelledBy: string,
  reason: string
): Promise<void> {
  await connectToDatabase();

  const ScheduledCollection = getScheduledCollectionModel();
  const collection = await ScheduledCollection.findOne({ collectionId });

  if (!collection) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  if (collection.status === CollectionStatus.COMPLETED) {
    throw new Error('Cannot cancel a completed collection');
  }

  collection.status = CollectionStatus.CANCELLED;
  collection.cancelledAt = new Date();
  collection.cancelledBy = cancelledBy as unknown as typeof collection.cancelledBy;
  collection.cancelReason = reason;

  await collection.save();
}

/**
 * Mark pending collections as ready for processing
 * Called when a pool's due date arrives
 */
export async function markCollectionsAsPending(poolId: string, round: number): Promise<number> {
  await connectToDatabase();

  const ScheduledCollection = getScheduledCollectionModel();

  const result = await ScheduledCollection.updateMany(
    {
      poolId,
      round,
      status: CollectionStatus.SCHEDULED,
    },
    {
      $set: { status: CollectionStatus.PENDING },
    }
  );

  return result.modifiedCount;
}

/**
 * Get collection statistics for a pool
 */
export async function getCollectionStats(poolId: string): Promise<{
  scheduled: number;
  pending: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalCollected: number;
}> {
  await connectToDatabase();

  const ScheduledCollection = getScheduledCollectionModel();

  const stats = await ScheduledCollection.aggregate([
    { $match: { poolId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', CollectionStatus.COMPLETED] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  const result = {
    scheduled: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalCollected: 0,
  };

  for (const stat of stats) {
    const status = stat._id as string;
    if (status === CollectionStatus.SCHEDULED) result.scheduled = stat.count;
    if (status === CollectionStatus.PENDING) result.pending = stat.count;
    if (status === CollectionStatus.COMPLETED) {
      result.completed = stat.count;
      result.totalCollected = stat.totalAmount;
    }
    if (status === CollectionStatus.FAILED) result.failed = stat.count;
    if (status === CollectionStatus.CANCELLED) result.cancelled = stat.count;
  }

  return result;
}
