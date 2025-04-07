import { NextRequest, NextResponse } from 'next/server';
import { TransactionStatus, TransactionType } from '@/types/payment';
import { PoolMemberStatus, PoolMemberRole } from '@/types/pool';
import connectToDatabase from '@/lib/db/connect';
import { getPoolModel } from '@/lib/db/models/pool';
import getUserModel from '@/lib/db/models/user';
import { createTransfer, capturePayment } from '@/lib/stripe';
import { v4 as uuidv4 } from 'uuid';

// POST /api/pools/[id]/payouts - Process a payout for the current round
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const { userId } = await request.json();
    
    if (!poolId || !userId) {
      return NextResponse.json(
        { error: 'Pool ID and user ID are required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    const PoolModel = getPoolModel();
    const UserModel = getUserModel();
    
    // Get the pool
    const pool = await PoolModel.findOne({ id: poolId });
    
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is an admin of the pool
    const requestingUser = await UserModel.findOne({ id: userId });
    
    if (!requestingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find the user's membership in the pool
    const userMembership = pool.members.find((member: any) => 
      member.email === requestingUser.email
    );
    
    // Check if the user is an admin or is authorized to initiate payouts
    if (!userMembership || userMembership.role !== PoolMemberRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized to process payouts for this pool' },
        { status: 403 }
      );
    }
    
    // Get the current round number
    const currentRound = pool.currentRound;
    
    // Find the member who should receive the payout for the current round
    const payoutRecipient = pool.members.find((member: any) => 
      member.position === currentRound && member.status === PoolMemberStatus.CURRENT
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
    
    // Get the recipient's user account
    const recipientUser = await UserModel.findOne({ email: payoutRecipient.email });
    
    if (!recipientUser) {
      return NextResponse.json(
        { error: 'Recipient user account not found' },
        { status: 404 }
      );
    }
    
    // Check if the recipient has completed identity verification
    if (!recipientUser.identityVerified) {
      return NextResponse.json(
        { error: 'Recipient has not completed identity verification' },
        { status: 400 }
      );
    }
    
    // Check if the recipient has a Stripe Connect account for receiving payments
    if (!recipientUser.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Recipient does not have a payment account set up' },
        { status: 400 }
      );
    }
    
    // Ensure all members have contributed for this round
    // In a real app, this would check the specific round's contributions
    const allMembersContributed = pool.members.every((member: any) => {
      // Skip the recipient for this round (they don't need to contribute)
      if (member.email === payoutRecipient.email) {
        return true;
      }
      
      // Check if this member has a contribution for the current round
      const hasContributed = pool.transactions.some((transaction: any) => 
        transaction.member === member.name && 
        transaction.type === TransactionType.CONTRIBUTION &&
        // In a more sophisticated app, you'd check that the contribution is for this specific round
        transaction.status === 'completed'
      );
      
      return hasContributed;
    });
    
    if (!allMembersContributed) {
      return NextResponse.json(
        { error: 'Not all members have contributed for this round' },
        { status: 400 }
      );
    }
    
    // Calculate the payout amount (total contributions minus fees)
    const contributionAmount = pool.contributionAmount;
    const memberCount = pool.memberCount;
    const totalAmount = contributionAmount * (memberCount - 1); // The recipient doesn't contribute to their own payout
    
    // Set a platform fee (optional)
    const platformFeePercentage = 0.02; // 2%
    const platformFee = totalAmount * platformFeePercentage;
    const payoutAmount = totalAmount - platformFee;
    
    const now = new Date().toISOString();
    
    // In a production app, this would use Stripe Connect to transfer funds to the recipient
    const transferResult = await createTransfer(
      payoutAmount,
      'usd',
      recipientUser.stripeConnectAccountId,
      `Round ${currentRound} payout for pool ${pool.name}`,
      {
        poolId,
        round: currentRound.toString(),
        recipientId: recipientUser.id
      }
    );
    
    if (!transferResult.success) {
      return NextResponse.json(
        { error: transferResult.error || 'Failed to process transfer' },
        { status: 500 }
      );
    }
    
    // Create a transaction record for the payout
    const payoutTransaction = {
      id: uuidv4(),
      type: TransactionType.PAYOUT,
      amount: payoutAmount,
      date: now,
      member: payoutRecipient.name,
      status: TransactionStatus.COMPLETED,
      stripeTransferId: transferResult.transferId
    };
    
    // Record the platform fee as a separate transaction
    const feeTransaction = {
      id: uuidv4(),
      type: TransactionType.FEE,
      amount: platformFee,
      date: now,
      member: 'Platform',
      status: TransactionStatus.COMPLETED
    };
    
    // Update the pool with the new transactions and mark the recipient as paid
    pool.transactions.push(payoutTransaction);
    pool.transactions.push(feeTransaction);
    
    // Mark the recipient as having received their payout
    const recipientIndex = pool.members.findIndex((member: any) => 
      member.email === payoutRecipient.email
    );
    
    if (recipientIndex !== -1) {
      pool.members[recipientIndex].payoutReceived = true;
      pool.members[recipientIndex].status = PoolMemberStatus.COMPLETED;
    }
    
    // Advance to the next round if not the final round
    if (currentRound < pool.totalRounds) {
      pool.currentRound = currentRound + 1;
      
      // Find the next recipient and update their status
      const nextRecipientIndex = pool.members.findIndex((member: any) => 
        member.position === (currentRound + 1)
      );
      
      if (nextRecipientIndex !== -1) {
        pool.members[nextRecipientIndex].status = PoolMemberStatus.CURRENT;
      }
      
      // Update the next payout date (e.g., 1 month from now)
      const nextPayoutDate = new Date();
      if (pool.frequency === 'monthly') {
        nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
      } else if (pool.frequency === 'weekly') {
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
      } else if (pool.frequency === 'biweekly') {
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
      }
      
      pool.nextPayoutDate = nextPayoutDate.toISOString();
    } else {
      // If this was the final round, mark the pool as completed
      pool.status = 'completed';
    }
    
    // Save the changes to the pool
    await pool.save();
    
    // Return success response
    return NextResponse.json({
      success: true,
      transaction: payoutTransaction,
      message: `Payout of ${payoutAmount} processed successfully for round ${currentRound}`,
      nextRound: pool.currentRound,
      isComplete: pool.status === 'completed'
    });
    
  } catch (error: any) {
    console.error('Error processing payout:', error);
    
    return NextResponse.json(
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  }
}

// GET /api/pools/[id]/payouts - Get payout status for the current round
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    
    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    const PoolModel = getPoolModel();
    
    // Get the pool
    const pool = await PoolModel.findOne({ id: poolId });
    
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }
    
    // Get the current round number
    const currentRound = pool.currentRound;
    
    // Find the member who should receive the payout for the current round
    const payoutRecipient = pool.members.find((member: any) => 
      member.position === currentRound && member.status === PoolMemberStatus.CURRENT
    );
    
    if (!payoutRecipient) {
      return NextResponse.json(
        { error: 'No eligible recipient found for the current round' },
        { status: 400 }
      );
    }
    
    // Calculate the payout amount
    const contributionAmount = pool.contributionAmount;
    const memberCount = pool.memberCount;
    const totalAmount = contributionAmount * (memberCount - 1);
    
    // Calculate platform fee
    const platformFeePercentage = 0.02; // 2%
    const platformFee = totalAmount * platformFeePercentage;
    const payoutAmount = totalAmount - platformFee;
    
    // Check contributions status for this round
    const memberContributions = pool.members.map((member: any) => {
      // Skip the recipient for this round (they don't need to contribute)
      if (member.email === payoutRecipient.email) {
        return {
          name: member.name,
          contributed: true,
          isRecipient: true
        };
      }
      
      // Check if this member has a contribution for the current round
      const hasContributed = pool.transactions.some((transaction: any) => 
        transaction.member === member.name && 
        transaction.type === TransactionType.CONTRIBUTION &&
        // In a more sophisticated app, you'd check that the contribution is for this specific round
        transaction.status === 'completed'
      );
      
      return {
        name: member.name,
        contributed: hasContributed,
        isRecipient: false
      };
    });
    
    // Check if all required members have contributed
    const allContributionsReceived = memberContributions.every((contribution) => 
      contribution.contributed || contribution.isRecipient
    );
    
    // Get payout transaction if it exists
    const payoutTransaction = pool.transactions.find((transaction: any) => 
      transaction.type === TransactionType.PAYOUT &&
      transaction.member === payoutRecipient.name &&
      // In a more sophisticated app, you'd check that this is for the current round
      transaction.status === TransactionStatus.COMPLETED
    );
    
    return NextResponse.json({
      success: true,
      round: currentRound,
      totalRounds: pool.totalRounds,
      recipient: {
        name: payoutRecipient.name,
        email: payoutRecipient.email,
        payoutReceived: payoutRecipient.payoutReceived
      },
      payoutAmount,
      platformFee,
      totalAmount,
      contributionStatus: memberContributions,
      allContributionsReceived,
      payoutProcessed: !!payoutTransaction,
      nextPayoutDate: pool.nextPayoutDate,
      frequency: pool.frequency
    });
    
  } catch (error: any) {
    console.error('Error getting payout status:', error);
    
    return NextResponse.json(
      { error: 'Failed to get payout status' },
      { status: 500 }
    );
  }
}