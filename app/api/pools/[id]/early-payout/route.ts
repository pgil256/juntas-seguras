/**
 * Early Payout API Route
 *
 * Allows pool admins to initiate payouts before the scheduled date.
 * The early payout only affects the current cycle - future cycles remain on schedule.
 *
 * GET: Check if early payout is allowed and get verification status
 * POST: Process the early payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { TransactionStatus, TransactionType } from '../../../../../types/payment';
import { PoolMemberStatus, PoolMemberRole, EarlyPayoutVerification } from '../../../../../types/pool';
import { AuditLogType } from '../../../../../types/audit';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { getAuditLogModel } from '../../../../../lib/db/models/auditLog';
import { User } from '../../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../../lib/auth';

const Pool = getPoolModel();
const AuditLog = getAuditLogModel();

// Helper to get payout method label
const getPayoutMethodLabel = (type: string) => {
  const labels: Record<string, string> = {
    venmo: 'Venmo',
    paypal: 'PayPal',
    zelle: 'Zelle',
    cashapp: 'Cash App',
    bank: 'Bank Transfer',
  };
  return labels[type] || type;
};

// Generate payment link based on payout method type
const getPaymentLink = (type: string, handle: string, amount?: number) => {
  const cleanHandle = handle.replace(/^[@$]/, '');
  switch (type) {
    case 'venmo':
      return amount
        ? `https://venmo.com/${cleanHandle}?txn=pay&amount=${amount}`
        : `https://venmo.com/${cleanHandle}`;
    case 'paypal':
      return amount
        ? `https://paypal.me/${cleanHandle}/${amount}`
        : `https://paypal.me/${cleanHandle}`;
    case 'cashapp':
      return `https://cash.app/$${cleanHandle}`;
    case 'zelle':
      return null;
    default:
      return null;
  }
};

export const runtime = 'nodejs';

/**
 * Helper function to verify if early payout can be initiated
 */
async function canInitiateEarlyPayout(
  pool: any,
  currentRound: number
): Promise<EarlyPayoutVerification> {
  // Check if current date is before scheduled payout date
  const scheduledDate = new Date(pool.nextPayoutDate);
  const now = new Date();

  if (now >= scheduledDate) {
    return {
      allowed: false,
      reason: 'Scheduled payout date has already passed. Use regular payout instead.',
      scheduledDate: pool.nextPayoutDate,
      currentRound,
    };
  }

  // Find the recipient for current round
  const payoutRecipient = pool.members.find(
    (member: any) => member.position === currentRound
  );

  if (!payoutRecipient) {
    return {
      allowed: false,
      reason: 'No eligible recipient found for the current round',
      currentRound,
    };
  }

  // Check if payout already made for current cycle
  if (payoutRecipient.payoutReceived) {
    return {
      allowed: false,
      reason: 'Payout has already been processed for this round',
      currentRound,
    };
  }

  // Check for existing payout transaction
  const existingPayout = pool.transactions.find(
    (t: any) =>
      t.type === TransactionType.PAYOUT &&
      t.round === currentRound &&
      (t.status === TransactionStatus.COMPLETED || t.status === TransactionStatus.PENDING)
  );

  if (existingPayout) {
    return {
      allowed: false,
      reason: 'A payout transaction already exists for this round',
      currentRound,
    };
  }

  // Check if at least one contribution exists (cycle has started)
  const contributionsForRound = pool.transactions.filter(
    (t: any) =>
      t.type === TransactionType.CONTRIBUTION &&
      t.round === currentRound
  );

  if (contributionsForRound.length === 0) {
    return {
      allowed: false,
      reason: 'No contributions have been made for this round yet. The cycle must start before early payout can be initiated.',
      currentRound,
    };
  }

  // Check if ALL contributions are collected (status = 'paid'/completed)
  const missingContributions: string[] = [];
  const processingContributions: string[] = [];

  for (const member of pool.members) {
    const contribution = pool.transactions.find(
      (t: any) =>
        t.member === member.name &&
        t.type === TransactionType.CONTRIBUTION &&
        t.round === currentRound
    );

    if (!contribution) {
      missingContributions.push(member.name);
    } else if (contribution.status !== TransactionStatus.COMPLETED) {
      // Auto-collection might still be processing
      processingContributions.push(member.name);
    }
  }

  if (processingContributions.length > 0) {
    return {
      allowed: false,
      reason: 'Some contributions are still being processed. Please wait for auto-collection to complete.',
      missingContributions: processingContributions,
      currentRound,
    };
  }

  if (missingContributions.length > 0) {
    return {
      allowed: false,
      reason: 'Not all contributions have been collected for this round',
      missingContributions,
      currentRound,
    };
  }

  // Look up the recipient's payout method from User model
  const recipientUser = await User.findOne({ email: payoutRecipient.email });

  if (!recipientUser?.payoutMethod?.type || !recipientUser?.payoutMethod?.handle) {
    return {
      allowed: false,
      reason: 'Recipient has not set up their payout method (Venmo, PayPal, Zelle, or Cash App)',
      recipientConnectStatus: 'no_payout_method',
      recipient: {
        name: payoutRecipient.name,
        email: payoutRecipient.email,
      },
      currentRound,
    };
  }

  // Calculate payout amount
  const payoutAmount = pool.contributionAmount * pool.members.length;

  // Generate payment link if available
  const paymentLink = getPaymentLink(
    recipientUser.payoutMethod.type,
    recipientUser.payoutMethod.handle,
    payoutAmount
  );

  return {
    allowed: true,
    recipient: {
      name: payoutRecipient.name,
      email: payoutRecipient.email,
      payoutMethod: {
        type: recipientUser.payoutMethod.type,
        handle: recipientUser.payoutMethod.handle,
        displayName: recipientUser.payoutMethod.displayName,
      },
      paymentLink,
    },
    payoutAmount,
    scheduledDate: pool.nextPayoutDate,
    currentRound,
  };
}

/**
 * GET /api/pools/[id]/early-payout
 * Check if early payout can be initiated for the current round
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

    // Check if user is admin
    const userMembership = pool.members.find(
      (member: any) => member.email === session.user?.email
    );

    if (!userMembership || userMembership.role !== PoolMemberRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only pool administrators can check early payout status' },
        { status: 403 }
      );
    }

    const verification = await canInitiateEarlyPayout(pool, pool.currentRound);

    return NextResponse.json({
      success: true,
      ...verification,
    });
  } catch (error) {
    console.error('Error checking early payout status:', error);
    return NextResponse.json(
      { error: 'Failed to check early payout status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/early-payout
 * Process an early payout for the current round
 *
 * Body: { reason?: string } - Optional reason for early payout
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Start a MongoDB session for transaction support
  const mongoSession = await mongoose.startSession();

  try {
    const { id: poolId } = await params;
    const body = await request.json().catch(() => ({}));
    const earlyPayoutReason = body.reason || '';

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

    // Use transaction to prevent race conditions
    let result: {
      pool: any;
      payoutRecipient: any;
      payoutAmount: number;
      transactionId: number;
      currentRound: number;
      recipientIndex: number;
      scheduledPayoutDate: string;
    } | undefined;

    await mongoSession.withTransaction(async () => {
      // Find and lock the pool document for update
      const pool = await Pool.findOne({ id: poolId }).session(mongoSession);

      if (!pool) {
        throw new Error('POOL_NOT_FOUND');
      }

      // Check if user is admin
      const userMembership = pool.members.find(
        (member: any) => member.email === requestingUser.email
      );

      if (!userMembership || userMembership.role !== PoolMemberRole.ADMIN) {
        throw new Error('UNAUTHORIZED');
      }

      const currentRound = pool.currentRound;

      // Verify early payout is allowed
      const verification = await canInitiateEarlyPayout(pool, currentRound);

      if (!verification.allowed) {
        throw new Error(`EARLY_PAYOUT_NOT_ALLOWED:${verification.reason}`);
      }

      // Find the payout recipient
      const payoutRecipient = pool.members.find(
        (member: any) => member.position === currentRound
      );

      if (!payoutRecipient) {
        throw new Error('NO_RECIPIENT');
      }

      // Calculate payout amount
      const contributionsForRound = pool.transactions.filter(
        (t: any) =>
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound &&
          t.status === TransactionStatus.COMPLETED
      );

      const actualContributionTotal = contributionsForRound.reduce(
        (sum: number, t: any) => sum + t.amount,
        0
      );

      const expectedPayoutAmount = pool.contributionAmount * pool.members.length;
      const payoutAmount = Math.min(actualContributionTotal, expectedPayoutAmount);

      if (payoutAmount <= 0) {
        throw new Error('INVALID_AMOUNT');
      }

      // Verify pool has sufficient balance
      if ((pool.totalAmount || 0) < payoutAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const recipientIndex = pool.members.findIndex(
        (m: any) => m.position === currentRound
      );

      // Create pending payout transaction with early payout fields
      const transactionId =
        Math.max(...pool.transactions.map((t: any) => t.id || 0), 0) + 1;

      const scheduledPayoutDate = pool.nextPayoutDate;
      const actualPayoutDate = new Date().toISOString();

      const payoutTransaction = {
        id: transactionId,
        type: TransactionType.PAYOUT,
        amount: payoutAmount,
        date: actualPayoutDate,
        member: payoutRecipient.name,
        status: TransactionStatus.PENDING,
        round: currentRound,
        stripeTransferId: null,
        // Early payout specific fields
        scheduledPayoutDate,
        actualPayoutDate,
        wasEarlyPayout: true,
        earlyPayoutInitiatedBy: requestingUser.id,
        earlyPayoutReason: earlyPayoutReason || undefined,
      };

      pool.transactions.push(payoutTransaction);

      // Mark recipient as payout pending
      if (recipientIndex !== -1) {
        pool.members[recipientIndex].status = PoolMemberStatus.CURRENT;
      }

      // Save the pending state within the transaction
      await pool.save({ session: mongoSession });

      result = {
        pool,
        payoutRecipient,
        payoutAmount,
        transactionId,
        currentRound,
        recipientIndex,
        scheduledPayoutDate,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to process early payout' },
        { status: 500 }
      );
    }

    const {
      pool,
      payoutRecipient,
      payoutAmount,
      transactionId,
      currentRound,
      recipientIndex,
      scheduledPayoutDate,
    } = result;

    // Verify Stripe credentials are configured
    if (!process.env.STRIPE_SECRET_KEY) {
      await Pool.updateOne(
        { id: pool.id, 'transactions.id': transactionId },
        {
          $set: {
            'transactions.$.status': TransactionStatus.FAILED,
            'transactions.$.stripeTransferId': null,
          },
        }
      );

      return NextResponse.json(
        { error: 'Stripe credentials are not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const recipientStripeAccountId = payoutRecipient.stripeConnectAccountId;

    if (!recipientStripeAccountId) {
      await Pool.updateOne(
        { id: pool.id, 'transactions.id': transactionId },
        {
          $set: {
            'transactions.$.status': TransactionStatus.FAILED,
            'transactions.$.stripeTransferId': null,
          },
        }
      );

      return NextResponse.json(
        { error: 'Recipient has not set up their Stripe Connect account for payouts.' },
        { status: 400 }
      );
    }

    let stripeTransferId: string | null = null;

    // Process Stripe transfer with idempotency key to prevent duplicates
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(payoutAmount * 100), // Convert to cents
          currency: 'usd',
          destination: recipientStripeAccountId,
          metadata: {
            type: 'cycle_payout',
            poolId: pool.id,
            cycleNumber: String(currentRound),
            recipientUserId: String(payoutRecipient.userId || payoutRecipient.email),
            wasEarlyPayout: 'true',
            initiatedBy: String(requestingUser.id),
            scheduledPayoutDate,
            description: `Early payout for ${pool.name} - Round ${currentRound}`,
          },
        },
        {
          idempotencyKey: `early-payout-${pool.id}-cycle-${currentRound}`,
        }
      );

      stripeTransferId = transfer.id;
    } catch (transferError: any) {
      console.error('Stripe transfer error:', transferError);

      await Pool.updateOne(
        { id: pool.id, 'transactions.id': transactionId },
        {
          $set: {
            'transactions.$.status': TransactionStatus.FAILED,
            'transactions.$.stripeTransferId': null,
          },
        }
      );

      return NextResponse.json(
        { error: `Stripe transfer failed: ${transferError.message}` },
        { status: 400 }
      );
    }

    // Update the transaction with Stripe details and mark as completed
    await Pool.findOneAndUpdate(
      { id: pool.id },
      {
        $set: {
          [`transactions.${pool.transactions.length - 1}.status`]: TransactionStatus.COMPLETED,
          [`transactions.${pool.transactions.length - 1}.stripeTransferId`]: stripeTransferId,
          [`members.${recipientIndex}.payoutReceived`]: true,
          [`members.${recipientIndex}.status`]: PoolMemberStatus.COMPLETED,
          [`members.${recipientIndex}.payoutDate`]: new Date().toISOString(),
          totalAmount: Math.max(0, (pool.totalAmount || 0) - payoutAmount),
        },
      },
      { new: true }
    );

    // IMPORTANT: Do NOT modify nextPayoutDate here.
    // The next payout remains on schedule. Only advance the round.
    if (currentRound < pool.totalRounds) {
      // Calculate next payout date from the CURRENT scheduled date (not from today)
      // This ensures the schedule remains intact
      const nextPayoutDate = new Date(scheduledPayoutDate);
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

      const nextRecipientIndex = pool.members.findIndex(
        (m: any) => m.position === currentRound + 1
      );

      await Pool.updateOne(
        { id: pool.id },
        {
          $set: {
            currentRound: currentRound + 1,
            nextPayoutDate: nextPayoutDate.toISOString(),
            ...(nextRecipientIndex !== -1 && {
              [`members.${nextRecipientIndex}.status`]: PoolMemberStatus.CURRENT,
            }),
          },
        }
      );
    } else {
      // Final round - mark pool as completed
      await Pool.updateOne(
        { id: pool.id },
        { $set: { status: 'completed' } }
      );
    }

    // Add system message about early payout
    const messageId =
      Math.max(...pool.messages.map((m: any) => m.id || 0), 0) + 1;

    await Pool.updateOne(
      { id: pool.id },
      {
        $push: {
          messages: {
            id: messageId,
            author: 'System',
            content: `Early payout of $${payoutAmount} has been processed for ${payoutRecipient.name} (Round ${currentRound}). Originally scheduled for ${new Date(scheduledPayoutDate).toLocaleDateString()}.`,
            date: new Date().toISOString(),
          },
        },
      }
    );

    // Create audit log entry
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: requestingUser.id,
      userEmail: requestingUser.email,
      type: AuditLogType.PAYMENT_EARLY_PAYOUT,
      action: 'early_payout_processed',
      metadata: {
        poolId: pool.id,
        poolName: pool.name,
        round: currentRound,
        recipientId: String(payoutRecipient.userId || payoutRecipient.email),
        recipientName: payoutRecipient.name,
        recipientEmail: payoutRecipient.email,
        amount: payoutAmount,
        scheduledPayoutDate,
        actualPayoutDate: new Date().toISOString(),
        stripeTransferId,
        reason: earlyPayoutReason || 'No reason provided',
      },
      poolId: pool.id,
      success: true,
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transactionId,
        type: TransactionType.PAYOUT,
        amount: payoutAmount,
        date: new Date().toISOString(),
        recipient: payoutRecipient.name,
        wasEarlyPayout: true,
        scheduledPayoutDate,
        stripeTransferId,
      },
      message: `Early payout of $${payoutAmount} processed for round ${currentRound}`,
      nextRound: currentRound < pool.totalRounds ? currentRound + 1 : currentRound,
      isComplete: currentRound >= pool.totalRounds,
    });
  } catch (error: any) {
    console.error('Error processing early payout:', error);

    // Handle specific error types
    if (error.message === 'POOL_NOT_FOUND') {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Only pool administrators can initiate early payouts' },
        { status: 403 }
      );
    }

    if (error.message === 'NO_RECIPIENT') {
      return NextResponse.json(
        { error: 'No eligible recipient found for the current round' },
        { status: 400 }
      );
    }

    if (error.message?.startsWith('EARLY_PAYOUT_NOT_ALLOWED:')) {
      const reason = error.message.replace('EARLY_PAYOUT_NOT_ALLOWED:', '');
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    if (error.message === 'INVALID_AMOUNT') {
      return NextResponse.json(
        { error: 'Invalid payout amount calculated' },
        { status: 400 }
      );
    }

    if (error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { error: 'Insufficient pool balance for payout' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process early payout' },
      { status: 500 }
    );
  } finally {
    await mongoSession.endSession();
  }
}
