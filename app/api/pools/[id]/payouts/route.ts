import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { TransactionStatus, TransactionType } from '../../../../../types/payment';
import { PoolMemberStatus, PoolMemberRole, PoolMember } from '../../../../../types/pool';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { createPayout } from '../../../../../lib/paypal';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../../../../../lib/auth';

const Pool = getPoolModel();

/**
 * POST /api/pools/[id]/payouts - Process a payout for the current round
 * Uses PayPal Payouts API to transfer funds to the recipient
 *
 * IMPORTANT: Uses MongoDB transactions to prevent race conditions and double payouts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Start a MongoDB session for transaction support
  const session = await mongoose.startSession();

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

    // Use transaction to prevent race conditions
    let result: {
      pool: any;
      payoutRecipient: PoolMember;
      payoutAmount: number;
      transactionId: number;
      currentRound: number;
      recipientIndex: number;
    } | undefined;
    await session.withTransaction(async () => {
      // Find and lock the pool document for update
      const pool = await Pool.findOne({ id: poolId }).session(session);

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

      // Find the member who should receive the payout (position matches current round)
      const payoutRecipient = pool.members.find(
        (member: any) => member.position === currentRound
      );

      if (!payoutRecipient) {
        throw new Error('NO_RECIPIENT');
      }

      // CRITICAL: Double-check this round has not been paid out
      // This is verified within the transaction to prevent race conditions
      if (payoutRecipient.payoutReceived) {
        throw new Error('ALREADY_PAID');
      }

      // Also check for existing payout transaction for this round
      const existingPayout = pool.transactions.find(
        (t: any) =>
          t.type === TransactionType.PAYOUT &&
          t.round === currentRound &&
          (t.status === TransactionStatus.COMPLETED || t.status === TransactionStatus.PENDING)
      );

      if (existingPayout) {
        throw new Error('ALREADY_PAID');
      }

      // Check if all members have contributed (except the recipient)
      const membersMissingContributions: string[] = [];

      for (const member of pool.members) {
        if (member.position === currentRound) continue; // Skip recipient

        const hasContributed = pool.transactions.some(
          (t: any) =>
            t.member === member.name &&
            t.type === TransactionType.CONTRIBUTION &&
            t.round === currentRound &&
            t.status === TransactionStatus.COMPLETED
        );

        if (!hasContributed) {
          membersMissingContributions.push(member.name);
        }
      }

      if (membersMissingContributions.length > 0) {
        throw new Error(`MISSING_CONTRIBUTIONS:${membersMissingContributions.join(',')}`);
      }

      // Calculate payout amount based on actual contributions received
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

      // Expected payout (for verification)
      const expectedPayoutAmount = pool.contributionAmount * (pool.members.length - 1);

      // Use the lesser of actual vs expected to prevent overpaying
      const payoutAmount = Math.min(actualContributionTotal, expectedPayoutAmount);

      if (payoutAmount <= 0) {
        throw new Error('INVALID_AMOUNT');
      }

      // Verify pool has sufficient balance
      if ((pool.totalAmount || 0) < payoutAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Mark the payout as pending BEFORE calling PayPal (optimistic locking)
      const recipientIndex = pool.members.findIndex(
        (m: any) => m.position === currentRound
      );

      // Create pending payout transaction
      const transactionId =
        Math.max(...pool.transactions.map((t: any) => t.id || 0), 0) + 1;

      const payoutTransaction = {
        id: transactionId,
        type: TransactionType.PAYOUT,
        amount: payoutAmount,
        date: new Date().toISOString(),
        member: payoutRecipient.name,
        status: TransactionStatus.PENDING, // Start as pending
        round: currentRound,
        paypalPayoutBatchId: null // Will be set after PayPal call
      };

      pool.transactions.push(payoutTransaction);

      // Mark recipient as payout pending (not received yet)
      if (recipientIndex !== -1) {
        pool.members[recipientIndex].status = PoolMemberStatus.CURRENT;
      }

      // Save the pending state within the transaction
      await pool.save({ session });

      // Store result for use outside transaction
      result = {
        pool,
        payoutRecipient,
        payoutAmount,
        transactionId,
        currentRound,
        recipientIndex
      };
    });

    // If we get here, the transaction succeeded and we have a lock
    // Now process the PayPal payout outside the transaction
    // (PayPal calls shouldn't be inside DB transactions)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to process payout' },
        { status: 500 }
      );
    }

    const { pool, payoutRecipient, payoutAmount, transactionId, currentRound, recipientIndex } = result;

    // Process PayPal payout to recipient
    const recipientEmail = payoutRecipient.email;
    let paypalPayoutBatchId = `demo_payout_${uuidv4()}`;
    let paypalSuccess = true;

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
          recipientId: String(payoutRecipient.id || payoutRecipient.email),
        }
      );

      if (!payoutResult.success) {
        console.error('PayPal payout failed:', payoutResult.error);
        paypalSuccess = false;

        // Update the transaction to failed status
        await Pool.updateOne(
          { id: pool.id, 'transactions.id': transactionId },
          {
            $set: {
              'transactions.$.status': TransactionStatus.FAILED,
              'transactions.$.paypalPayoutBatchId': null
            }
          }
        );

        return NextResponse.json(
          { error: `PayPal payout failed: ${payoutResult.error}` },
          { status: 400 }
        );
      } else {
        paypalPayoutBatchId = payoutResult.payoutBatchId || paypalPayoutBatchId;
      }
    }

    // Update the transaction with PayPal details and mark as completed
    const updateResult = await Pool.findOneAndUpdate(
      { id: pool.id },
      {
        $set: {
          [`transactions.${pool.transactions.length - 1}.status`]: TransactionStatus.COMPLETED,
          [`transactions.${pool.transactions.length - 1}.paypalPayoutBatchId`]: paypalPayoutBatchId,
          [`members.${recipientIndex}.payoutReceived`]: true,
          [`members.${recipientIndex}.status`]: PoolMemberStatus.COMPLETED,
          totalAmount: Math.max(0, (pool.totalAmount || 0) - payoutAmount)
        }
      },
      { new: true }
    );

    if (!updateResult) {
      console.error('Failed to update pool after payout');
      return NextResponse.json(
        { error: 'Failed to finalize payout' },
        { status: 500 }
      );
    }

    // Advance to the next round if not final
    if (currentRound < pool.totalRounds) {
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

      // Find next recipient index
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
              [`members.${nextRecipientIndex}.status`]: PoolMemberStatus.CURRENT
            })
          }
        }
      );
    } else {
      // Final round - mark pool as completed
      await Pool.updateOne(
        { id: pool.id },
        { $set: { status: 'completed' } }
      );
    }

    // Add system message
    const messageId =
      Math.max(...pool.messages.map((m: any) => m.id || 0), 0) + 1;

    await Pool.updateOne(
      { id: pool.id },
      {
        $push: {
          messages: {
            id: messageId,
            author: 'System',
            content: `Payout of $${payoutAmount} has been processed for ${payoutRecipient.name} (Round ${currentRound}).`,
            date: new Date().toISOString()
          }
        }
      }
    );

    return NextResponse.json({
      success: true,
      transaction: {
        id: transactionId,
        type: TransactionType.PAYOUT,
        amount: payoutAmount,
        date: new Date().toISOString(),
        recipient: payoutRecipient.name
      },
      message: `Payout of $${payoutAmount} processed for round ${currentRound}`,
      nextRound: currentRound < pool.totalRounds ? currentRound + 1 : currentRound,
      isComplete: currentRound >= pool.totalRounds
    });

  } catch (error: any) {
    console.error('Error processing payout:', error);

    // Handle specific error types
    if (error.message === 'POOL_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Only pool administrators can process payouts' },
        { status: 403 }
      );
    }

    if (error.message === 'NO_RECIPIENT') {
      return NextResponse.json(
        { error: 'No eligible recipient found for the current round' },
        { status: 400 }
      );
    }

    if (error.message === 'ALREADY_PAID') {
      return NextResponse.json(
        { error: 'This round has already been paid out' },
        { status: 400 }
      );
    }

    if (error.message?.startsWith('MISSING_CONTRIBUTIONS:')) {
      const members = error.message.replace('MISSING_CONTRIBUTIONS:', '');
      return NextResponse.json(
        { error: `Not all members have contributed for this round. Missing: ${members}` },
        { status: 400 }
      );
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
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  } finally {
    await session.endSession();
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
    const authSession = await getServerSession(authOptions);

    if (!authSession?.user?.id) {
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
