import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { Pool } from '../../../../../lib/db/models/pool';
import { PoolMemberRole } from '../../../../../types/pool';
import { getCurrentUser } from '../../../../../lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pools/[id]/round-payments
 * Get the current round's payment tracking status
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
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    // Find the current round winner
    const currentRound = pool.currentRound || 1;
    const winner = pool.members.find((m: any) => m.position === currentRound);

    return NextResponse.json({
      currentRound,
      payments: pool.currentRoundPayments || [],
      payoutStatus: pool.currentRoundPayoutStatus || 'pending_collection',
      payoutCompletedAt: pool.currentRoundPayoutCompletedAt,
      payoutMethod: pool.currentRoundPayoutMethod,
      payoutNotes: pool.currentRoundPayoutNotes,
      winner: winner ? {
        id: winner.id,
        name: winner.name,
        email: winner.email,
        payoutMethods: winner.payoutMethods,
      } : null,
      adminPaymentMethods: pool.adminPaymentMethods,
      contributionAmount: pool.contributionAmount,
      totalMembers: pool.members.length,
      potAmount: pool.contributionAmount * pool.members.length,
      dueDate: pool.nextPayoutDate,
    });
  } catch (error) {
    console.error('Error fetching round payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch round payments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/round-payments
 * Initialize payment tracking for the current round
 * Only admin can initialize
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
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only pool admin can initialize payments' },
        { status: 403 }
      );
    }

    // Create payment entries for all members
    const dueDate = pool.nextPayoutDate ? new Date(pool.nextPayoutDate) : new Date();
    const payments = pool.members.map((m: any) => ({
      memberId: m.id,
      memberName: m.name,
      memberEmail: m.email,
      amount: pool.contributionAmount,
      status: 'pending',
      reminderCount: 0,
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Update the pool
    const updatedPool = await Pool.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      {
        $set: {
          currentRoundPayments: payments,
          currentRoundPayoutStatus: 'pending_collection',
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      payments: updatedPool.currentRoundPayments,
    });
  } catch (error) {
    console.error('Error initializing round payments:', error);
    return NextResponse.json(
      { error: 'Failed to initialize round payments' },
      { status: 500 }
    );
  }
}
