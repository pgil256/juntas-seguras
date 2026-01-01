import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import { TransactionType, TransactionStatus } from '../../../../../types/payment';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../../../../../lib/auth';

const Pool = getPoolModel();

/**
 * GET /api/pools/[id]/contributions - Get contribution status for current round
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of this pool
    const userMember = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email === user.email
    );

    if (!userMember) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    const currentRound = pool.currentRound;

    // Find the recipient for this round (member whose position matches current round)
    const payoutRecipient = pool.members.find(
      (m: any) => m.position === currentRound
    );

    // Get contribution status for all members for current round
    const contributionStatus = pool.members.map((member: any) => {
      const isRecipient = member.position === currentRound;

      // Check if this member has contributed for the current round
      const contribution = pool.transactions.find(
        (t: any) =>
          t.member === member.name &&
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound
      );

      return {
        memberId: member.id,
        name: member.name,
        email: member.email,
        position: member.position,
        isRecipient,
        hasContributed: isRecipient ? null : !!contribution,
        contributionDate: contribution?.date || null,
        contributionStatus: contribution?.status || null,
        amount: contribution?.amount || pool.contributionAmount
      };
    });

    // Check if all required members have contributed
    const allContributionsReceived = contributionStatus.every(
      (c: any) => c.isRecipient || c.hasContributed
    );

    return NextResponse.json({
      success: true,
      poolId,
      currentRound,
      totalRounds: pool.totalRounds,
      contributionAmount: pool.contributionAmount,
      nextPayoutDate: pool.nextPayoutDate,
      recipient: payoutRecipient
        ? {
            name: payoutRecipient.name,
            email: payoutRecipient.email,
            position: payoutRecipient.position
          }
        : null,
      contributions: contributionStatus,
      allContributionsReceived
    });
  } catch (error) {
    console.error('Error getting contributions:', error);
    return NextResponse.json(
      { error: 'Failed to get contribution status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/contributions - Record a contribution for current round
 * For demo purposes, this creates a "mock" contribution without actual payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const body = await request.json();

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of this pool
    const userMember = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email === user.email
    );

    if (!userMember) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    const currentRound = pool.currentRound;

    // Check if user is the recipient for this round (they don't contribute)
    if (userMember.position === currentRound) {
      return NextResponse.json(
        { error: 'You are the recipient for this round and do not need to contribute' },
        { status: 400 }
      );
    }

    // Check if user has already contributed for this round
    const existingContribution = pool.transactions.find(
      (t: any) =>
        t.member === userMember.name &&
        t.type === TransactionType.CONTRIBUTION &&
        t.round === currentRound
    );

    if (existingContribution) {
      return NextResponse.json(
        { error: 'You have already contributed for this round' },
        { status: 400 }
      );
    }

    // Create the contribution transaction
    const transactionId = Math.max(
      ...pool.transactions.map((t: any) => t.id || 0),
      0
    ) + 1;

    const contribution = {
      id: transactionId,
      type: TransactionType.CONTRIBUTION,
      amount: pool.contributionAmount,
      date: new Date().toISOString(),
      member: userMember.name,
      status: TransactionStatus.COMPLETED,
      round: currentRound,
      stripePaymentIntentId: body.paymentIntentId || `demo_${uuidv4()}` // For demo purposes
    };

    // Add to pool transactions
    pool.transactions.push(contribution);

    // Update member's contribution stats
    const memberIndex = pool.members.findIndex(
      (m: any) => m.email === userMember.email
    );
    if (memberIndex !== -1) {
      pool.members[memberIndex].totalContributed =
        (pool.members[memberIndex].totalContributed || 0) + pool.contributionAmount;
      pool.members[memberIndex].paymentsOnTime =
        (pool.members[memberIndex].paymentsOnTime || 0) + 1;
    }

    // Update pool's total amount
    pool.totalAmount = (pool.totalAmount || 0) + pool.contributionAmount;

    // Add a system message
    const messageId = Math.max(
      ...pool.messages.map((m: any) => m.id || 0),
      0
    ) + 1;
    pool.messages.push({
      id: messageId,
      author: 'System',
      content: `${userMember.name} has contributed $${pool.contributionAmount} for round ${currentRound}.`,
      date: new Date().toISOString()
    });

    await pool.save();

    // Check if all members have now contributed
    const payoutRecipient = pool.members.find(
      (m: any) => m.position === currentRound
    );

    const allMembersContributed = pool.members.every((member: any) => {
      if (member.position === currentRound) return true; // Skip recipient
      return pool.transactions.some(
        (t: any) =>
          t.member === member.name &&
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound
      );
    });

    return NextResponse.json({
      success: true,
      contribution: {
        id: contribution.id,
        amount: contribution.amount,
        date: contribution.date,
        status: contribution.status
      },
      allMembersContributed,
      message: allMembersContributed
        ? `All contributions received! ${payoutRecipient?.name || 'The recipient'} can now receive the payout.`
        : `Contribution recorded. Waiting for other members to contribute.`
    });
  } catch (error) {
    console.error('Error recording contribution:', error);
    return NextResponse.json(
      { error: 'Failed to record contribution' },
      { status: 500 }
    );
  }
}
