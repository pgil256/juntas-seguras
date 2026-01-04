import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/db/connect';
import { getPoolModel } from '../../../../lib/db/models/pool';
import { getPaymentModel } from '../../../../lib/db/models/payment';
import { PoolStatus, PoolMemberStatus, TransactionType } from '../../../../types/pool';
import { TransactionStatus } from '../../../../types/payment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpcomingPayment {
  id: string;
  poolId: string;
  poolName: string;
  amount: number;
  dueDate: string;
  frequency: string;
  currentRound: number;
  totalRounds: number;
  recipientName: string;
  recipientPosition: number;
  userPosition: number;
  isRecipient: boolean;
  hasContributed: boolean;
  status: 'due' | 'upcoming' | 'overdue' | 'contributed';
  daysUntilDue: number;
}

/**
 * GET /api/payments/upcoming - Calculate and return upcoming payment obligations
 *
 * Returns a list of upcoming payments the user needs to make across all their pools
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    const Pool = getPoolModel();
    const Payment = getPaymentModel();

    // Find all active pools where user is an active member
    const userPools = await Pool.find({
      status: { $in: [PoolStatus.ACTIVE, PoolStatus.PENDING] },
      'members.email': user.email,
      'members.status': PoolMemberStatus.ACTIVE
    }).lean();

    const upcomingPayments: UpcomingPayment[] = [];
    const now = new Date();

    for (const pool of userPools) {
      // Find the user's member record
      const userMember = pool.members.find(
        (m: { email: string; status: string }) =>
          m.email === user.email && m.status === PoolMemberStatus.ACTIVE
      );

      if (!userMember) continue;

      const currentRound = pool.currentRound || 1;
      const totalRounds = pool.totalRounds || pool.members.length;

      // Skip if pool has completed all rounds
      if (currentRound > totalRounds) continue;

      // Find the recipient for the current round
      const recipient = pool.members.find(
        (m: { position: number }) => m.position === currentRound
      );

      // Check if user is the recipient for this round
      const isRecipient = userMember.position === currentRound;

      // If user is the recipient, they don't need to contribute
      if (isRecipient) {
        upcomingPayments.push({
          id: `${pool.id}_round_${currentRound}`,
          poolId: pool.id,
          poolName: pool.name,
          amount: pool.contributionAmount * (pool.members.length - 1),
          dueDate: pool.nextPayoutDate || calculateNextPayoutDate(pool.startDate, pool.frequency, currentRound),
          frequency: pool.frequency,
          currentRound,
          totalRounds,
          recipientName: 'You',
          recipientPosition: currentRound,
          userPosition: userMember.position,
          isRecipient: true,
          hasContributed: false,
          status: 'upcoming',
          daysUntilDue: calculateDaysUntilDue(pool.nextPayoutDate || calculateNextPayoutDate(pool.startDate, pool.frequency, currentRound))
        });
        continue;
      }

      // Check if user has already contributed for this round
      const hasContributedInPool = pool.transactions?.some(
        (t: { member: string; type: string; round: number; status: string }) =>
          t.member === userMember.name &&
          t.type === TransactionType.CONTRIBUTION &&
          t.round === currentRound &&
          (t.status === 'completed' || t.status === TransactionStatus.COMPLETED)
      );

      // Also check Payment collection for pending/processing payments
      const pendingPayment = await Payment.findOne({
        userId: user._id,
        poolId: pool.id,
        round: currentRound,
        status: { $in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING, TransactionStatus.SCHEDULED] }
      });

      const hasContributed = hasContributedInPool || !!pendingPayment;

      // Calculate due date
      const dueDate = pool.nextPayoutDate || calculateNextPayoutDate(pool.startDate, pool.frequency, currentRound);
      const daysUntilDue = calculateDaysUntilDue(dueDate);

      // Determine status
      let status: 'due' | 'upcoming' | 'overdue' | 'contributed';
      if (hasContributed) {
        status = 'contributed';
      } else if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue <= 3) {
        status = 'due';
      } else {
        status = 'upcoming';
      }

      upcomingPayments.push({
        id: `${pool.id}_round_${currentRound}`,
        poolId: pool.id,
        poolName: pool.name,
        amount: pool.contributionAmount,
        dueDate,
        frequency: pool.frequency,
        currentRound,
        totalRounds,
        recipientName: recipient?.name || 'Unknown',
        recipientPosition: currentRound,
        userPosition: userMember.position,
        isRecipient: false,
        hasContributed,
        status,
        daysUntilDue
      });
    }

    // Sort by due date (most urgent first)
    upcomingPayments.sort((a, b) => {
      // Overdue first, then due, then upcoming, contributed last
      const statusOrder = { overdue: 0, due: 1, upcoming: 2, contributed: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Within same status, sort by days until due
      return a.daysUntilDue - b.daysUntilDue;
    });

    // Calculate summary stats
    const totalDue = upcomingPayments
      .filter(p => !p.isRecipient && !p.hasContributed)
      .reduce((sum, p) => sum + p.amount, 0);

    const overdueCount = upcomingPayments.filter(p => p.status === 'overdue').length;
    const dueCount = upcomingPayments.filter(p => p.status === 'due').length;
    const upcomingCount = upcomingPayments.filter(p => p.status === 'upcoming' && !p.isRecipient).length;
    const receivingCount = upcomingPayments.filter(p => p.isRecipient).length;

    return NextResponse.json({
      success: true,
      payments: upcomingPayments,
      summary: {
        totalDue,
        overdueCount,
        dueCount,
        upcomingCount,
        receivingCount,
        totalPools: userPools.length
      }
    });

  } catch (error) {
    console.error('Error fetching upcoming payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming payments' },
      { status: 500 }
    );
  }
}

/**
 * Calculate the next payout date based on pool start date and frequency
 */
function calculateNextPayoutDate(startDate: Date | string | undefined, frequency: string, currentRound: number): string {
  const start = startDate ? new Date(startDate) : new Date();
  const roundsCompleted = currentRound - 1;

  let nextDate = new Date(start);

  switch (frequency.toLowerCase()) {
    case 'weekly':
      nextDate.setDate(start.getDate() + (roundsCompleted * 7));
      break;
    case 'biweekly':
      nextDate.setDate(start.getDate() + (roundsCompleted * 14));
      break;
    case 'monthly':
      nextDate.setMonth(start.getMonth() + roundsCompleted);
      break;
    default:
      nextDate.setMonth(start.getMonth() + roundsCompleted);
  }

  return nextDate.toISOString();
}

/**
 * Calculate days until due date
 */
function calculateDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();

  // Reset time components for accurate day calculation
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
