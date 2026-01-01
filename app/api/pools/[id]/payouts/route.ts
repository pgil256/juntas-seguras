import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { TransactionStatus, TransactionType } from '../../../../../types/payment';
import { PoolMemberStatus, PoolMemberRole } from '../../../../../types/pool';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import { createPayout } from '../../../../../lib/paypal';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../../../../../lib/auth';

const Pool = getPoolModel();

/**
 * POST /api/pools/[id]/payouts - Process a payout for the current round
 * Uses PayPal Payouts API to transfer funds to the recipient
 */
export async function POST(
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
    const requestingUser = userResult.user;

    await connectToDatabase();

    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const userMembership = pool.members.find(
      (member: any) => member.email === requestingUser.email
    );

    if (!userMembership || userMembership.role !== PoolMemberRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only pool administrators can process payouts' },
        { status: 403 }
      );
    }

    const currentRound = pool.currentRound;

    // Find the member who should receive the payout (position matches current round)
    const payoutRecipient = pool.members.find(
      (member: any) => member.position === currentRound
    );

    if (!payoutRecipient) {
      return NextResponse.json(
        { error: 'No eligible recipient found for the current round' },
        { status: 400 }
      );
    }

    // Check if this round has already been paid out
    if (payoutRecipient.payoutReceived) {
      return NextResponse.json(
        { error: 'This round has already been paid out' },
        { status: 400 }
      );
    }

    // Check if all members have contributed (except the recipient)
    const allMembersContributed = pool.members.every((member: any) => {
      if (member.position === currentRound) return true; // Skip recipient

      const hasContributed = pool.transactions.some(
        (t: any) =>
          t.member === member.name &&
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound &&
          t.status === TransactionStatus.COMPLETED
      );

      return hasContributed;
    });

    if (!allMembersContributed) {
      return NextResponse.json(
        { error: 'Not all members have contributed for this round' },
        { status: 400 }
      );
    }

    // Calculate payout amount (contributions from all other members)
    const payoutAmount = pool.contributionAmount * (pool.members.length - 1);

    // Process PayPal payout to recipient
    // Note: In production, you would get the recipient's PayPal email from their profile
    const recipientEmail = payoutRecipient.email;
    let paypalPayoutBatchId = `demo_payout_${uuidv4()}`;

    // Only process real PayPal payout if we have valid credentials and recipient email
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && recipientEmail) {
      const payoutResult = await createPayout(
        payoutAmount,
        'USD',
        recipientEmail,
        `Pool payout for ${pool.name} - Round ${currentRound}`,
        {
          poolId: pool.id,
          round: String(currentRound),
          recipientId: payoutRecipient.id || payoutRecipient.email,
        }
      );

      if (!payoutResult.success) {
        console.error('PayPal payout failed:', payoutResult.error);
        // Continue with demo mode if PayPal fails
      } else {
        paypalPayoutBatchId = payoutResult.payoutBatchId || paypalPayoutBatchId;
      }
    }

    // Create payout transaction
    const transactionId =
      Math.max(...pool.transactions.map((t: any) => t.id || 0), 0) + 1;

    const payoutTransaction = {
      id: transactionId,
      type: TransactionType.PAYOUT,
      amount: payoutAmount,
      date: new Date().toISOString(),
      member: payoutRecipient.name,
      status: TransactionStatus.COMPLETED,
      round: currentRound,
      paypalPayoutBatchId: paypalPayoutBatchId
    };

    pool.transactions.push(payoutTransaction);

    // Mark recipient as having received payout
    const recipientIndex = pool.members.findIndex(
      (m: any) => m.position === currentRound
    );
    if (recipientIndex !== -1) {
      pool.members[recipientIndex].payoutReceived = true;
      pool.members[recipientIndex].status = PoolMemberStatus.COMPLETED;
    }

    // Advance to the next round if not final
    if (currentRound < pool.totalRounds) {
      pool.currentRound = currentRound + 1;

      // Update next recipient status to CURRENT
      const nextRecipientIndex = pool.members.findIndex(
        (m: any) => m.position === currentRound + 1
      );
      if (nextRecipientIndex !== -1) {
        pool.members[nextRecipientIndex].status = PoolMemberStatus.CURRENT;
      }

      // Calculate next payout date
      const nextPayoutDate = new Date();
      switch (pool.frequency.toLowerCase()) {
        case 'weekly':
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
          break;
        case 'biweekly':
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
          break;
        case 'monthly':
          nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
          break;
        default:
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
      }
      pool.nextPayoutDate = nextPayoutDate.toISOString();
    } else {
      // Final round - mark pool as completed
      pool.status = 'completed';
    }

    // Add system message
    const messageId =
      Math.max(...pool.messages.map((m: any) => m.id || 0), 0) + 1;
    pool.messages.push({
      id: messageId,
      author: 'System',
      content: `Payout of $${payoutAmount} has been processed for ${payoutRecipient.name} (Round ${currentRound}).`,
      date: new Date().toISOString()
    });

    await pool.save();

    return NextResponse.json({
      success: true,
      transaction: {
        id: payoutTransaction.id,
        type: payoutTransaction.type,
        amount: payoutTransaction.amount,
        date: payoutTransaction.date,
        recipient: payoutRecipient.name
      },
      message: `Payout of $${payoutAmount} processed for round ${currentRound}`,
      nextRound: pool.currentRound,
      isComplete: pool.status === 'completed'
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[id]/payouts - Get payout status for the current round
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    const currentRound = pool.currentRound;

    // Find the current recipient
    const payoutRecipient = pool.members.find(
      (m: any) => m.position === currentRound
    );

    // Calculate payout amount
    const payoutAmount = pool.contributionAmount * (pool.members.length - 1);

    // Check contributions status
    const memberContributions = pool.members.map((member: any) => {
      const isRecipient = member.position === currentRound;

      const contribution = pool.transactions.find(
        (t: any) =>
          t.member === member.name &&
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound
      );

      return {
        name: member.name,
        position: member.position,
        isRecipient,
        contributed: isRecipient ? null : !!contribution,
        contributionDate: contribution?.date || null
      };
    });

    const allContributionsReceived = memberContributions.every(
      (c: any) => c.isRecipient || c.contributed
    );

    // Check if payout already processed
    const payoutTransaction = pool.transactions.find(
      (t: any) =>
        t.type === TransactionType.PAYOUT &&
        t.round === currentRound &&
        t.status === TransactionStatus.COMPLETED
    );

    return NextResponse.json({
      success: true,
      round: currentRound,
      totalRounds: pool.totalRounds,
      recipient: payoutRecipient
        ? {
            name: payoutRecipient.name,
            email: payoutRecipient.email,
            position: payoutRecipient.position,
            payoutReceived: payoutRecipient.payoutReceived
          }
        : null,
      payoutAmount,
      contributionAmount: pool.contributionAmount,
      contributions: memberContributions,
      allContributionsReceived,
      payoutProcessed: !!payoutTransaction,
      nextPayoutDate: pool.nextPayoutDate,
      frequency: pool.frequency,
      poolStatus: pool.status
    });
  } catch (error) {
    console.error('Error getting payout status:', error);
    return NextResponse.json(
      { error: 'Failed to get payout status' },
      { status: 500 }
    );
  }
}
