import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { Pool } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import { PoolMemberRole, TransactionType, PoolMember, RoundPayment } from '../../../../../types/pool';
import { getCurrentUser } from '../../../../../lib/auth';

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
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: PoolMember) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
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

    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Failed to fetch payout info' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;
    const body = await request.json();
    const { method, notes } = body;

    if (!method) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    const validMethods = ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other'];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: PoolMember) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only pool admin can confirm payout' },
        { status: 403 }
      );
    }

    // Check if payout is ready
    const payoutStatus = pool.currentRoundPayoutStatus;
    if (payoutStatus !== 'ready_to_pay') {
      if (payoutStatus === 'paid' || payoutStatus === 'completed') {
        return NextResponse.json(
          { error: 'Payout has already been completed' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'All payments must be verified before payout' },
        { status: 400 }
      );
    }

    const currentRound = pool.currentRound || 1;
    const winner = pool.members.find((m: PoolMember) => m.position === currentRound);

    if (!winner) {
      return NextResponse.json(
        { error: 'Could not find winner for current round' },
        { status: 400 }
      );
    }

    const potAmount = pool.contributionAmount * pool.members.length;
    const now = new Date();

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

    return NextResponse.json({
      success: true,
      payoutStatus: 'paid',
      payoutCompletedAt: now,
      payoutMethod: method,
      transaction,
    });
  } catch (error) {
    console.error('Error confirming payout:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payout' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: PoolMember) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only pool admin can advance round' },
        { status: 403 }
      );
    }

    // Check if payout is complete
    if (pool.currentRoundPayoutStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Payout must be completed before advancing' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      currentRound: nextRound,
      isComplete: nextRound > totalRounds,
      nextPayoutDate: updatedPool.nextPayoutDate,
    });
  } catch (error) {
    console.error('Error advancing round:', error);
    return NextResponse.json(
      { error: 'Failed to advance round' },
      { status: 500 }
    );
  }
}
