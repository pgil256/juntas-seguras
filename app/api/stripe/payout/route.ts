/**
 * Stripe Payout API
 *
 * Processes pool payouts to members via Stripe Connect transfers
 * Only pool admins can initiate payouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createTransfer, canReceivePayouts } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/db/connection';
import Pool from '@/lib/db/models/pool';
import User from '@/lib/db/models/user';
import Payment from '@/lib/db/models/payment';
import { logActivity } from '@/lib/db/models/activityLog';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

interface PoolMember {
  oderId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  position: number;
  status: string;
  payoutReceived: boolean;
  hasReceivedPayout: boolean;
  totalContributed: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { poolId } = body;

    if (!poolId) {
      return NextResponse.json({ error: 'poolId required' }, { status: 400 });
    }

    await connectToDatabase();

    // Start a MongoDB session for transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Get pool with lock
      const pool = await Pool.findById(poolId).session(dbSession);
      if (!pool) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      }

      // Verify user is admin
      const isAdmin = pool.members.some(
        (m: PoolMember) =>
          m.userId.toString() === session.user.id && m.role === 'ADMIN'
      );
      if (!isAdmin) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: 'Only pool admins can process payouts' },
          { status: 403 }
        );
      }

      // Find current round recipient
      const recipient = pool.members.find(
        (m: PoolMember) => m.position === pool.currentRound
      );
      if (!recipient) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: 'No recipient found for current round' },
          { status: 400 }
        );
      }

      // Check for double payout
      if (recipient.payoutReceived || recipient.hasReceivedPayout) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: 'Recipient has already received payout for this round' },
          { status: 400 }
        );
      }

      // Get recipient's user record
      const recipientUser = await User.findById(recipient.userId).session(dbSession);
      if (!recipientUser) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: 'Recipient user not found' },
          { status: 404 }
        );
      }

      // Check recipient has Stripe Connect account
      if (!recipientUser.stripeConnectAccountId) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          {
            error: 'Recipient has not set up their payout account',
            code: 'NO_CONNECT_ACCOUNT',
          },
          { status: 400 }
        );
      }

      // Verify recipient can receive payouts
      const canPayout = await canReceivePayouts(recipientUser.stripeConnectAccountId);
      if (!canPayout) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          {
            error: 'Recipient payout account is not ready. They need to complete onboarding.',
            code: 'ACCOUNT_NOT_READY',
          },
          { status: 400 }
        );
      }

      // Verify all other members have contributed
      const nonRecipientMembers = pool.members.filter(
        (m: PoolMember) => m.userId.toString() !== recipient.userId.toString()
      );

      // Check contributions for current round
      const roundContributions = pool.transactions.filter(
        (tx: { type: string; round: number; status: string }) =>
          tx.type === 'CONTRIBUTION' &&
          tx.round === pool.currentRound &&
          tx.status === 'COMPLETED'
      );

      const contributorIds = new Set(
        roundContributions.map((tx: { member: string }) => tx.member)
      );

      const missingContributors = nonRecipientMembers.filter(
        (m: PoolMember) => !contributorIds.has(m.name)
      );

      if (missingContributors.length > 0) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          {
            error: `Waiting for contributions from: ${missingContributors.map((m: PoolMember) => m.name).join(', ')}`,
            code: 'MISSING_CONTRIBUTIONS',
            missingMembers: missingContributors.map((m: PoolMember) => m.name),
          },
          { status: 400 }
        );
      }

      // Calculate payout amount
      const payoutAmount = pool.contributionAmount * (pool.members.length - 1);

      // Verify pool has sufficient balance
      if (pool.totalAmount < payoutAmount) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          {
            error: `Insufficient pool balance. Need $${payoutAmount}, have $${pool.totalAmount}`,
            code: 'INSUFFICIENT_BALANCE',
          },
          { status: 400 }
        );
      }

      // Create payment record
      const paymentId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payment = await Payment.create(
        [
          {
            paymentId,
            userId: recipient.userId,
            poolId: new Types.ObjectId(poolId),
            amount: payoutAmount,
            currency: 'USD',
            type: 'PAYOUT',
            status: 'PENDING',
            description: `Pool payout for ${pool.name} (Round ${pool.currentRound})`,
            member: recipient.name,
            round: pool.currentRound,
          },
        ],
        { session: dbSession }
      );

      // Mark recipient as current
      const recipientIndex = pool.members.findIndex(
        (m: PoolMember) => m.userId.toString() === recipient.userId.toString()
      );
      pool.members[recipientIndex].status = 'CURRENT';

      await pool.save({ session: dbSession });

      // Commit the DB transaction before external API call
      await dbSession.commitTransaction();

      // Process Stripe transfer (outside DB transaction)
      let transfer;
      try {
        transfer = await createTransfer(
          payoutAmount,
          recipientUser.stripeConnectAccountId,
          {
            paymentId,
            poolId,
            poolName: pool.name,
            round: pool.currentRound.toString(),
            recipientId: recipient.userId.toString(),
            userId: recipient.userId.toString(),
          }
        );
      } catch (stripeError) {
        // Stripe failed - revert DB changes
        await Payment.findOneAndUpdate(
          { paymentId },
          { status: 'FAILED', failureReason: 'Stripe transfer failed' }
        );

        await Pool.findByIdAndUpdate(poolId, {
          $set: { [`members.${recipientIndex}.status`]: 'ACTIVE' },
        });

        console.error('Stripe transfer failed:', stripeError);
        return NextResponse.json(
          { error: 'Failed to process payout with Stripe' },
          { status: 500 }
        );
      }

      // Update payment with transfer ID
      await Payment.findOneAndUpdate(
        { paymentId },
        {
          status: 'COMPLETED',
          stripeTransferId: transfer.id,
          processedAt: new Date(),
        }
      );

      // Update pool
      await Pool.findByIdAndUpdate(poolId, {
        $set: {
          [`members.${recipientIndex}.payoutReceived`]: true,
          [`members.${recipientIndex}.hasReceivedPayout`]: true,
          [`members.${recipientIndex}.status`]: 'COMPLETED',
        },
        $inc: { totalAmount: -payoutAmount },
        $push: {
          transactions: {
            type: 'PAYOUT',
            amount: payoutAmount,
            member: recipient.name,
            round: pool.currentRound,
            date: new Date(),
            status: 'COMPLETED',
            stripeTransferId: transfer.id,
          },
        },
      });

      // Advance round if not final
      if (pool.currentRound < pool.members.length) {
        const nextRound = pool.currentRound + 1;
        const nextRecipientIndex = pool.members.findIndex(
          (m: PoolMember) => m.position === nextRound
        );

        await Pool.findByIdAndUpdate(poolId, {
          $set: {
            currentRound: nextRound,
            [`members.${nextRecipientIndex}.status`]: 'CURRENT',
          },
        });
      } else {
        // Final round - mark pool complete
        await Pool.findByIdAndUpdate(poolId, {
          $set: { status: 'COMPLETED' },
        });
      }

      // Log activity
      await logActivity({
        userId: new Types.ObjectId(session.user.id),
        action: 'payout_processed',
        category: 'payment',
        details: {
          poolId,
          poolName: pool.name,
          round: pool.currentRound,
          recipientId: recipient.userId.toString(),
          recipientName: recipient.name,
          amount: payoutAmount,
          stripeTransferId: transfer.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        paymentId,
        transferId: transfer.id,
        amount: payoutAmount,
        recipient: recipient.name,
        round: pool.currentRound,
      });
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  }
}
