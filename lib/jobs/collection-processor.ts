/**
 * Collection Processor Job
 *
 * Manages scheduled contribution tracking for manual payment collection.
 * This job handles scheduling and status tracking of contributions.
 *
 * Note: This app uses manual payments (Venmo, PayPal, Zelle, etc.)
 * The admin is responsible for collecting payments and marking them as complete.
 */

import connectToDatabase from '../db/connect';
import { getScheduledCollectionModel, CollectionStatus, generateIdempotencyKey } from '../db/models/scheduledCollection';
import { getPaymentSetupModel, PaymentSetupStatus } from '../db/models/paymentSetup';
import { getPoolModel } from '../db/models/pool';
import { getAuditLogModel } from '../db/models/auditLog';
import { AuditLogType } from '@/types/audit';
import { TransactionType, TransactionStatus } from '@/types/payment';

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
 * For manual payment system, this updates collections to pending status
 * when they become due, so the admin can track and confirm payments.
 */
export async function processScheduledCollections(): Promise<ProcessingResult> {
  const startTime = Date.now();
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[CollectionProcessor] Starting run ${runId}`);

  await connectToDatabase();

  const ScheduledCollection = getScheduledCollectionModel();
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
    // Find scheduled collections that are now due (grace period passed)
    const dueCollections = await ScheduledCollection.find({
      status: CollectionStatus.SCHEDULED,
      collectionEligibleAt: { $lte: now },
    }).limit(100);

    console.log(`[CollectionProcessor] Found ${dueCollections.length} collections to mark as pending`);

    for (const collection of dueCollections) {
      result.processed++;

      try {
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
            // Already paid manually - mark as such
            collection.status = CollectionStatus.MANUALLY_PAID;
            collection.completedAt = now;
            await collection.save();
            result.skipped++;
            continue;
          }
        }

        // Mark as pending - waiting for admin to confirm manual payment
        collection.status = CollectionStatus.PENDING;
        collection.processedAt = now;
        await collection.save();

        result.successful++;

        // Audit log
        await AuditLog.create({
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          userId: collection.userId.toString(),
          type: AuditLogType.PAYMENT,
          action: 'collection_marked_pending',
          metadata: {
            collectionId: collection.collectionId,
            poolId: collection.poolId,
            round: collection.round,
            amount: collection.amount,
            memberName: collection.memberName,
          },
          success: true,
        });

      } catch (error) {
        console.error(`[CollectionProcessor] Error processing collection ${collection.collectionId}:`, error);

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
 * Schedule collections for a new round
 *
 * Called when a new round starts to create scheduled collection records for all members
 * With manual payments, all members are scheduled regardless of payment setup.
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

  const pool = await Pool.findOne({ id: poolId });
  if (!pool) {
    throw new Error(`Pool not found: ${poolId}`);
  }

  const collectionEligibleAt = new Date(dueDate.getTime() + gracePeriodHours * 60 * 60 * 1000);

  for (const member of pool.members) {
    if (!member.userId) continue; // Skip members without user accounts

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
