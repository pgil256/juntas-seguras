/**
 * Pool Collections API Route
 *
 * GET - Get upcoming and recent collections for a pool
 * POST - Admin actions: manual collection, cancel, pause
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectToDatabase from '@/lib/db/connect';
import { getPoolModel } from '@/lib/db/models/pool';
import { getScheduledCollectionModel, CollectionStatus } from '@/lib/db/models/scheduledCollection';
import { getPaymentSetupModel, PaymentSetupStatus } from '@/lib/db/models/paymentSetup';
import { createOffSessionPayment } from '@/lib/stripe/off-session-payments';
import { cancelScheduledCollection, scheduleCollectionsForRound } from '@/lib/jobs/collection-processor';
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';

export const runtime = 'nodejs';

/**
 * GET /api/pools/[id]/collections
 *
 * Get collections for a pool.
 *
 * Query params:
 * - status: filter by status (scheduled, pending, completed, failed)
 * - days: upcoming days to show (default: 7)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    const Pool = getPoolModel();
    const pool = await Pool.findOne({ id: poolId });

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Verify user is a member or admin
    const userMember = pool.members.find(
      (m: { userId?: { toString(): string }; email: string }) =>
        m.userId?.toString() === user._id.toString() || m.email === user.email
    );

    if (!userMember) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    const isAdmin = userMember.role === 'admin';
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const days = parseInt(searchParams.get('days') || '7', 10);

    const ScheduledCollection = getScheduledCollectionModel();
    const PaymentSetup = getPaymentSetupModel();

    // Build query
    const query: Record<string, unknown> = { poolId };

    // Non-admins can only see their own collections
    if (!isAdmin) {
      query.userId = user._id;
    }

    if (statusFilter) {
      query.status = statusFilter;
    }

    // Get collections
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const collections = await ScheduledCollection.find({
      ...query,
      $or: [
        { dueDate: { $lte: futureDate } }, // Upcoming
        { status: { $in: [CollectionStatus.COMPLETED, CollectionStatus.FAILED] } }, // Recent completed/failed
      ],
    })
      .sort({ dueDate: 1 })
      .limit(50);

    // Get payment setup status for each user (admin view)
    const paymentSetups = isAdmin
      ? await PaymentSetup.find({ poolId, status: PaymentSetupStatus.ACTIVE })
      : await PaymentSetup.find({ poolId, userId: user._id, status: PaymentSetupStatus.ACTIVE });

    const paymentSetupMap = new Map(
      paymentSetups.map(ps => [ps.userId.toString(), ps])
    );

    // Format response
    const formattedCollections = collections.map(c => ({
      collectionId: c.collectionId,
      memberName: c.memberName,
      memberEmail: isAdmin ? c.memberEmail : undefined,
      round: c.round,
      amount: c.amount,
      dueDate: c.dueDate,
      gracePeriodHours: c.gracePeriodHours,
      collectionEligibleAt: c.collectionEligibleAt,
      status: c.status,
      attemptCount: c.attemptCount,
      maxAttempts: c.maxAttempts,
      lastAttemptAt: c.lastAttemptAt,
      nextRetryAt: c.nextRetryAt,
      completedAt: c.completedAt,
      failureReason: c.failureReason,
      hasActivePaymentMethod: paymentSetupMap.has(c.userId.toString()),
    }));

    // Group by status for summary
    const summary = {
      scheduled: collections.filter(c => c.status === CollectionStatus.SCHEDULED).length,
      pending: collections.filter(c => c.status === CollectionStatus.PENDING).length,
      processing: collections.filter(c => c.status === CollectionStatus.PROCESSING).length,
      completed: collections.filter(c => c.status === CollectionStatus.COMPLETED).length,
      failed: collections.filter(c => c.status === CollectionStatus.FAILED).length,
      cancelled: collections.filter(c => c.status === CollectionStatus.CANCELLED).length,
    };

    return NextResponse.json({
      success: true,
      poolId,
      currentRound: pool.currentRound,
      isAdmin,
      collections: formattedCollections,
      summary,
    });
  } catch (error) {
    console.error('Error getting collections:', error);
    return NextResponse.json(
      { error: 'Failed to get collections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/collections
 *
 * Admin actions for collections.
 *
 * Body: {
 *   action: 'manual_collect' | 'cancel' | 'pause' | 'schedule_round',
 *   collectionId?: string,
 *   userId?: string,
 *   round?: number,
 *   dueDate?: string,
 *   reason?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const body = await request.json();
    const { action, collectionId, userId, round, dueDate, reason } = body;

    await connectToDatabase();

    const Pool = getPoolModel();
    const pool = await Pool.findOne({ id: poolId });

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Verify user is admin
    const userMember = pool.members.find(
      (m: { userId?: { toString(): string }; email: string }) =>
        m.userId?.toString() === user._id.toString() || m.email === user.email
    );

    if (!userMember || userMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const ScheduledCollection = getScheduledCollectionModel();
    const PaymentSetup = getPaymentSetupModel();
    const AuditLog = getAuditLogModel();

    switch (action) {
      case 'manual_collect': {
        // Manually trigger collection for a specific collection
        if (!collectionId) {
          return NextResponse.json(
            { error: 'Collection ID required' },
            { status: 400 }
          );
        }

        const collection = await ScheduledCollection.findOne({ collectionId, poolId });
        if (!collection) {
          return NextResponse.json(
            { error: 'Collection not found' },
            { status: 404 }
          );
        }

        if (collection.status === CollectionStatus.COMPLETED) {
          return NextResponse.json(
            { error: 'Collection already completed' },
            { status: 400 }
          );
        }

        // Get payment setup
        const paymentSetup = await PaymentSetup.findOne({
          userId: collection.userId,
          poolId,
          status: PaymentSetupStatus.ACTIVE,
        });

        if (!paymentSetup) {
          return NextResponse.json(
            { error: 'No active payment method for this member' },
            { status: 400 }
          );
        }

        // Process payment
        const result = await createOffSessionPayment({
          amount: collection.amount,
          customerId: paymentSetup.stripeCustomerId,
          paymentMethodId: paymentSetup.stripePaymentMethodId,
          poolId,
          userId: collection.userId.toString(),
          round: collection.round,
          memberName: collection.memberName,
          collectionId: `${collection.collectionId}-manual-${Date.now()}`,
        });

        if (result.success) {
          collection.status = CollectionStatus.COMPLETED;
          collection.completedAt = new Date();
          collection.stripePaymentIntentId = result.paymentIntentId;
          await collection.save();
        } else {
          collection.lastErrorCode = result.error?.code;
          collection.failureReason = result.error?.message;
          await collection.save();
        }

        await AuditLog.create({
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
          type: AuditLogType.PAYMENT,
          action: 'manual_collection_triggered',
          metadata: {
            poolId,
            collectionId,
            targetUserId: collection.userId.toString(),
            success: result.success,
            paymentIntentId: result.paymentIntentId,
          },
          success: result.success,
        });

        return NextResponse.json({
          success: result.success,
          message: result.success
            ? 'Manual collection successful'
            : `Collection failed: ${result.error?.message}`,
          paymentIntentId: result.paymentIntentId,
          error: result.error,
        });
      }

      case 'cancel': {
        // Cancel a scheduled collection
        if (!collectionId) {
          return NextResponse.json(
            { error: 'Collection ID required' },
            { status: 400 }
          );
        }

        await cancelScheduledCollection(
          collectionId,
          user._id.toString(),
          reason || 'Cancelled by admin'
        );

        await AuditLog.create({
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
          type: AuditLogType.PAYMENT,
          action: 'collection_cancelled',
          metadata: { poolId, collectionId, reason },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: 'Collection cancelled',
        });
      }

      case 'pause': {
        // Pause auto-collection for a member
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID required' },
            { status: 400 }
          );
        }

        const paymentSetup = await PaymentSetup.findOne({ userId, poolId });
        if (!paymentSetup) {
          return NextResponse.json(
            { error: 'No payment setup found for this member' },
            { status: 404 }
          );
        }

        paymentSetup.status = PaymentSetupStatus.PAUSED;
        paymentSetup.pausedAt = new Date();
        paymentSetup.pausedBy = user._id;
        paymentSetup.pauseReason = reason || 'Paused by admin';
        await paymentSetup.save();

        await AuditLog.create({
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
          type: AuditLogType.PAYMENT,
          action: 'auto_collection_paused',
          metadata: { poolId, targetUserId: userId, reason },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: 'Auto-collection paused for this member',
        });
      }

      case 'schedule_round': {
        // Schedule collections for a new round
        if (!round || !dueDate) {
          return NextResponse.json(
            { error: 'Round and due date required' },
            { status: 400 }
          );
        }

        await scheduleCollectionsForRound(
          poolId,
          round,
          new Date(dueDate),
          pool.gracePeriodHours || 24
        );

        await AuditLog.create({
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
          type: AuditLogType.PAYMENT_SCHEDULED,
          action: 'collections_scheduled',
          metadata: { poolId, round, dueDate },
          success: true,
        });

        return NextResponse.json({
          success: true,
          message: `Collections scheduled for round ${round}`,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing collection action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
