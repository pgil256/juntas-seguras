import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { Pool } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import { PoolMemberRole, TransactionType, PoolMember, RoundPayment } from '../../../../../types/pool';
import { getCurrentUser } from '../../../../../lib/auth';
import { ApiErrors, successResponse, errorResponse } from '../../../../../lib/api';
import { generatePaymentId } from '../../../../../lib/db/models/payment';
import { getPaymentProvider } from '../../../../../lib/payments/providers/stripe';
import { isStripeConfigured } from '../../../../../lib/stripe/client';
import { writeServerAuditLog } from '../../../../../lib/audit-server';
import { AuditLogType } from '../../../../../types/audit';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pools/[id]/round-payout
 * Get the current round's payout status and winner info
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return ApiErrors.notFound('Pool');
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: PoolMember) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return ApiErrors.notMember();
    }

    const currentRound = pool.currentRound || 1;
    const winner = pool.members.find((m: PoolMember) => m.position === currentRound);

    // Check if all payments are verified
    const payments: RoundPayment[] = pool.currentRoundPayments || [];
    const allVerified = payments.length > 0 && payments.every(
      (p: RoundPayment) => p.status === 'admin_verified' || p.status === 'excused'
    );

    const verifiedAmount = payments
      .filter((p: RoundPayment) => p.status === 'admin_verified')
      .reduce((sum: number, p: RoundPayment) => sum + p.amount, 0);

    return successResponse({
      currentRound,
      potAmount: pool.contributionAmount * pool.members.length,
      verifiedAmount,
      payoutStatus: pool.currentRoundPayoutStatus || 'pending_collection',
      payoutCompletedAt: pool.currentRoundPayoutCompletedAt,
      payoutMethod: pool.currentRoundPayoutMethod,
      payoutNotes: pool.currentRoundPayoutNotes,
      allVerified,
      winner: winner ? {
        id: winner.id,
        name: winner.name,
        email: winner.email,
        payoutMethods: winner.payoutMethods,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching payout info:', error);
    return ApiErrors.internalError('Failed to fetch payout info');
  }
}

/**
 * POST /api/pools/[id]/round-payout
 * Confirm that payout has been sent to the winner
 * Only admin can confirm
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id } = await params;
    const body = await request.json();
    const { method, notes } = body;

    if (!method) {
      return ApiErrors.badRequest('Payment method is required');
    }

    const validMethods = ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other', 'stripe'];
    if (!validMethods.includes(method)) {
      return ApiErrors.badRequest('Invalid payment method');
    }

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return ApiErrors.notFound('Pool');
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: PoolMember) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return ApiErrors.notMember();
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return ApiErrors.notAdmin();
    }

    // Check if payout is ready
    const payoutStatus = pool.currentRoundPayoutStatus;
    if (payoutStatus !== 'ready_to_pay') {
      if (payoutStatus === 'paid' || payoutStatus === 'completed') {
        return ApiErrors.badRequest('Payout has already been completed');
      }
      return ApiErrors.badRequest('All payments must be verified before payout');
    }

    const currentRound = pool.currentRound || 1;
    const winner = pool.members.find((m: PoolMember) => m.position === currentRound);

    if (!winner) {
      return ApiErrors.badRequest('Could not find winner for current round');
    }

    const potAmount = pool.contributionAmount * pool.members.length;
    const now = new Date();

    // For card/Stripe payouts, release funds through the payment provider before
    // marking the round paid. In this PoC the transfer is simulated (no Stripe
    // Connect onboarding); the returned id is clearly labeled as simulated.
    let stripeTransferId: string | undefined;
    let payoutSimulated = false;
    if (method === 'stripe') {
      if (!isStripeConfigured()) {
        return ApiErrors.badRequest('Stripe payouts are unavailable: Stripe is not configured.');
      }
      try {
        const provider = getPaymentProvider();
        const payout = await provider.releasePayout({
          poolId: pool.id || id,
          round: currentRound,
          recipientMemberId: winner.id,
          recipientName: winner.name,
          amount: potAmount,
          currency: 'usd',
          reference: generatePaymentId(),
          // destination omitted → simulated transfer (see provider PRODUCTION SEAM)
        });
        stripeTransferId = payout.transferId;
        payoutSimulated = payout.simulated;
      } catch (stripeError) {
        console.error('Stripe payout release failed:', stripeError);
        return ApiErrors.internalError('Failed to release payout via Stripe');
      }
    }

    // Create payout transaction
    const transaction = {
      id: (pool.transactions?.length || 0) + 1,
      type: TransactionType.PAYOUT,
      amount: potAmount,
      date: now.toISOString(),
      member: winner.name,
      status: 'completed',
      round: currentRound,
      actualPayoutDate: now.toISOString(),
      wasEarlyPayout: false,
      ...(stripeTransferId ? { stripeTransferId } : {}),
    };

    // Find winner index for update
    const winnerIndex = pool.members.findIndex((m: PoolMember) => m.id === winner.id);

    // Update pool
    const updatedPool = await Pool.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      {
        $set: {
          currentRoundPayoutStatus: 'paid',
          currentRoundPayoutCompletedAt: now,
          currentRoundPayoutMethod: method,
          currentRoundPayoutNotes: notes,
          currentRoundPayoutConfirmedBy: user._id,
          // Update winner's status
          [`members.${winnerIndex}.payoutReceived`]: true,
          [`members.${winnerIndex}.hasReceivedPayout`]: true,
          [`members.${winnerIndex}.payoutDate`]: now.toISOString(),
        },
        $push: {
          transactions: transaction,
        },
      },
      { new: true }
    );

    // Audit the money-out event (payout release).
    await writeServerAuditLog({
      userId: user._id.toString(),
      userEmail: user.email,
      type: AuditLogType.PAYMENT_PAYOUT,
      action: 'Round payout confirmed',
      metadata: {
        round: currentRound,
        amount: potAmount,
        method,
        recipient: winner.name,
        recipientMemberId: winner.id,
        stripeTransferId,
        simulated: method === 'stripe' ? payoutSimulated : undefined,
      },
      poolId: pool.id || id,
      success: true,
    });

    return successResponse({
      payoutStatus: 'paid',
      payoutCompletedAt: now,
      payoutMethod: method,
      transaction,
      stripeTransferId,
      simulated: method === 'stripe' ? payoutSimulated : undefined,
    });
  } catch (error) {
    console.error('Error confirming payout:', error);
    return ApiErrors.internalError('Failed to confirm payout');
  }
}

/**
 * PUT /api/pools/[id]/round-payout
 * Advance to the next round after payout is complete
 * Only admin can advance
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return ApiErrors.notFound('Pool');
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: PoolMember) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return ApiErrors.notMember();
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return ApiErrors.notAdmin();
    }

    // Check if payout is complete
    if (pool.currentRoundPayoutStatus !== 'paid') {
      return ApiErrors.badRequest('Payout must be completed before advancing');
    }

    const currentRound = pool.currentRound || 1;
    const nextRound = currentRound + 1;
    const totalRounds = pool.totalRounds || pool.members.length;

    // Calculate next payout date based on frequency
    const calculateNextPayoutDate = () => {
      const now = new Date();
      const frequency = pool.frequency?.toLowerCase() || 'weekly';

      switch (frequency) {
        case 'weekly':
          now.setDate(now.getDate() + 7);
          break;
        case 'biweekly':
          now.setDate(now.getDate() + 14);
          break;
        case 'monthly':
          now.setMonth(now.getMonth() + 1);
          break;
        default:
          now.setDate(now.getDate() + 7);
      }

      return now.toISOString();
    };

    // Prepare update
    const updateData: Record<string, unknown> = {
      currentRound: nextRound,
      currentRoundPayoutStatus: 'pending_collection',
      currentRoundPayments: [],
      currentRoundPayoutCompletedAt: null,
      currentRoundPayoutMethod: null,
      currentRoundPayoutNotes: null,
      currentRoundPayoutConfirmedBy: null,
      nextPayoutDate: calculateNextPayoutDate(),
    };

    // Check if pool is complete
    if (nextRound > totalRounds) {
      updateData.status = 'completed';
    }

    const updatedPool = await Pool.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      { $set: updateData },
      { new: true }
    );

    return successResponse({
      currentRound: nextRound,
      isComplete: nextRound > totalRounds,
      nextPayoutDate: updatedPool.nextPayoutDate,
    });
  } catch (error) {
    console.error('Error advancing round:', error);
    return ApiErrors.internalError('Failed to advance round');
  }
}
