import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { TransactionType, TransactionStatus } from '../../../../../types/payment';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../../../../../lib/auth';
import { createOrder, captureOrder } from '../../../../../lib/paypal';

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
 * POST /api/pools/[id]/contributions - Initiate or complete a contribution
 *
 * Actions:
 * - initiate: Creates a PayPal order and returns approval URL
 * - complete: Captures the PayPal payment and records the contribution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const body = await request.json();
    const { action = 'initiate', orderId } = body;

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

    // Handle initiate action - create PayPal order
    if (action === 'initiate') {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const returnUrl = `${baseUrl}/pools/${poolId}?paypal_return=true&round=${currentRound}`;
      const cancelUrl = `${baseUrl}/pools/${poolId}?paypal_cancelled=true`;

      const paypalResult = await createOrder(
        pool.contributionAmount,
        'USD',
        `Contribution to ${pool.name} - Round ${currentRound}`,
        {
          poolId,
          round: currentRound.toString(),
          userId: user._id.toString(),
          memberName: userMember.name,
        },
        returnUrl,
        cancelUrl
      );

      if (!paypalResult.success) {
        return NextResponse.json(
          { error: paypalResult.error || 'Failed to create PayPal order' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'initiate',
        orderId: paypalResult.orderId,
        approvalUrl: paypalResult.approvalUrl,
        amount: pool.contributionAmount,
        message: 'PayPal order created. Redirect user to approval URL.',
      });
    }

    // Handle complete action - capture PayPal payment and record contribution
    if (action === 'complete') {
      if (!orderId) {
        return NextResponse.json(
          { error: 'Order ID is required to complete payment' },
          { status: 400 }
        );
      }

      // Capture the PayPal payment
      const captureResult = await captureOrder(orderId);

      if (!captureResult.success) {
        return NextResponse.json(
          { error: captureResult.error || 'Failed to capture PayPal payment' },
          { status: 400 }
        );
      }

      if (captureResult.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: `Payment not completed. Status: ${captureResult.status}` },
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
        paypalOrderId: orderId,
        paypalCaptureId: captureResult.captureId,
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
        action: 'complete',
        contribution: {
          id: contribution.id,
          amount: contribution.amount,
          date: contribution.date,
          status: contribution.status,
          paypalOrderId: orderId,
        },
        allMembersContributed,
        message: allMembersContributed
          ? `Payment successful! All contributions received. ${payoutRecipient?.name || 'The recipient'} can now receive the payout.`
          : `Payment successful! Contribution recorded. Waiting for other members to contribute.`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "initiate" or "complete".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing contribution:', error);
    return NextResponse.json(
      { error: 'Failed to process contribution' },
      { status: 500 }
    );
  }
}
