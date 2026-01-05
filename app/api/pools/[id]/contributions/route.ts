import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { TransactionType, TransactionStatus } from '../../../../../types/payment';
import { getCurrentUser } from '../../../../../lib/auth';
import { createNotification, notifyPoolMembers, NotificationTemplates } from '../../../../../lib/services/notifications';

const Pool = getPoolModel();

/**
 * GET /api/pools/[id]/contributions - Get contribution status for current round
 *
 * UNIVERSAL CONTRIBUTION MODEL:
 * All members contribute every week, INCLUDING the payout recipient.
 * The recipient contributes to the pool they receive from.
 * Payout amount = contribution_amount × total_members (not members - 1)
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

    // Check if user is a member of this pool (case-insensitive email comparison)
    const userEmailLower = user.email?.toLowerCase();
    const userMember = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
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
    // UNIVERSAL CONTRIBUTION MODEL: All members must contribute, including the recipient
    const contributionStatus = pool.members.map((member: any) => {
      const isRecipient = member.position === currentRound;
      const memberEmailLower = member.email?.toLowerCase();

      // Check if this member has contributed for the current round
      // Check both transactions and currentRoundPayments
      const contribution = pool.transactions.find(
        (t: any) =>
          t.member === member.name &&
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound
      );

      // Also check currentRoundPayments for pending/confirmed payments (case-insensitive email)
      const roundPayment = pool.currentRoundPayments?.find(
        (p: any) => p.memberId === member.id || p.memberEmail?.toLowerCase() === memberEmailLower
      );

      const hasConfirmedPayment = roundPayment?.status === 'member_confirmed' ||
                                   roundPayment?.status === 'admin_verified';

      return {
        memberId: member.id,
        name: member.name,
        email: member.email,
        position: member.position,
        isRecipient,
        // Member has contributed if there's a transaction OR admin-verified payment
        hasContributed: !!contribution || roundPayment?.status === 'admin_verified',
        // Payment is pending if member confirmed but admin hasn't verified
        paymentPending: roundPayment?.status === 'member_confirmed',
        contributionDate: contribution?.date || roundPayment?.memberConfirmedAt || null,
        contributionStatus: contribution?.status || roundPayment?.status || null,
        paymentMethod: roundPayment?.memberConfirmedVia || null,
        amount: contribution?.amount || pool.contributionAmount
      };
    });

    // Check if ALL members have contributed (including recipient under universal model)
    const allContributionsReceived = contributionStatus.every(
      (c: any) => c.hasContributed
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
 * POST /api/pools/[id]/contributions - Confirm a manual contribution payment
 *
 * UNIVERSAL CONTRIBUTION MODEL:
 * All members contribute every week, INCLUDING the payout recipient.
 * The recipient's contribution goes into the pool they receive from.
 * This ensures the payout amount = contribution_amount × total_members
 *
 * Actions:
 * - confirm_manual: Member confirms they've sent payment via a manual method (Venmo, Cash App, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const body = await request.json();
    const { action, paymentMethod } = body;

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

    // Check if user is a member of this pool (case-insensitive email comparison)
    const userEmailLower = user.email?.toLowerCase();
    const userMember = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!userMember) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    const currentRound = pool.currentRound;
    const userMemberEmailLower = userMember.email?.toLowerCase();

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

    // Handle confirm_manual action - member confirms they've paid via manual method
    if (action === 'confirm_manual') {
      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Payment method is required' },
          { status: 400 }
        );
      }

      const validMethods = ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other'];
      if (!validMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
      }

      // Check if there's already a pending payment for this member (case-insensitive email)
      const existingPayment = pool.currentRoundPayments?.find(
        (p: any) => (p.memberId === userMember.id || p.memberEmail?.toLowerCase() === userMemberEmailLower)
      );

      if (existingPayment) {
        if (existingPayment.status === 'admin_verified') {
          return NextResponse.json(
            { error: 'Your payment has already been verified' },
            { status: 400 }
          );
        }
        if (existingPayment.status === 'member_confirmed') {
          return NextResponse.json(
            { error: 'You have already confirmed a payment. Please wait for admin verification.' },
            { status: 400 }
          );
        }
      }

      // Initialize currentRoundPayments array if it doesn't exist
      if (!pool.currentRoundPayments) {
        pool.currentRoundPayments = [];
      }

      // Remove any existing pending payment for this member (case-insensitive email)
      pool.currentRoundPayments = pool.currentRoundPayments.filter(
        (p: any) => p.memberId !== userMember.id && p.memberEmail?.toLowerCase() !== userMemberEmailLower
      );

      // Add the new payment - marked as complete immediately (no admin verification needed)
      pool.currentRoundPayments.push({
        memberId: userMember.id,
        memberName: userMember.name,
        memberEmail: userMember.email,
        amount: pool.contributionAmount,
        status: 'admin_verified', // Mark as verified immediately
        memberConfirmedAt: new Date(),
        memberConfirmedVia: paymentMethod,
        adminVerifiedAt: new Date(), // Auto-verified
        dueDate: pool.nextPayoutDate ? new Date(pool.nextPayoutDate) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add a system message
      const messageId = Math.max(
        ...pool.messages.map((m: any) => m.id || 0),
        0
      ) + 1;
      pool.messages.push({
        id: messageId,
        author: 'System',
        content: `${userMember.name} has paid their $${pool.contributionAmount} contribution via ${paymentMethod} for round ${currentRound}.`,
        date: new Date().toISOString()
      });

      await pool.save();

      // Notify pool admin about the payment
      const adminMember = pool.members.find((m: any) => m.role === 'admin');
      if (adminMember?.email) {
        await createNotification({
          userId: adminMember.email,
          message: `${userMember.name} paid their $${pool.contributionAmount} contribution via ${paymentMethod} for ${pool.name}.`,
          type: 'payment',
          isImportant: false,
        });
      }

      return NextResponse.json({
        success: true,
        action: 'confirm_manual',
        payment: {
          amount: pool.contributionAmount,
          method: paymentMethod,
          status: 'admin_verified',
          confirmedAt: new Date().toISOString(),
        },
        message: 'Payment recorded successfully!',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "confirm_manual".' },
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
