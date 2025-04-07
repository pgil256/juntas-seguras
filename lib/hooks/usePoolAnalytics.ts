import { useState, useEffect } from 'react';
import { Pool, PoolMember, PoolTransaction, TransactionType } from '../../types/pool';
import { usePool } from './usePool';

export interface PoolAnalyticsType {
  // Summary stats
  totalSaved: number;
  completionPercentage: number;
  onTimeRate: number;
  averageContribution: number;
  
  // Chart data
  savingsGrowthData: Array<{
    period: string;
    amount: number;
    projected?: boolean;
  }>;
  
  payoutDistributionData: Array<{
    name: string;
    value: number;
  }>;
  
  onTimeRateData: Array<{
    period: string;
    rate: number;
  }>;
  
  contributionData: Array<{
    period: string;
    onTime: number;
    late: number;
    missed: number;
  }>;
  
  memberContributionData: Array<{
    name: string;
    totalContributed: number;
    totalReceived: number;
    onTimeRate: number;
  }>;
  
  // Projections
  projectedCompletionDate: string;
  projectedTotalValue: number;
  expectedReturn: number;
  
  // Calculated risk level from 0-100
  riskLevel: number;
  
  // Future payout schedule
  payoutSchedule: Array<{
    round: number;
    member: string;
    date: string;
    amount: number;
    status: 'completed' | 'upcoming' | 'scheduled';
  }>;
}

interface UsePoolAnalyticsProps {
  poolId: string;
  userId: string;
  timeframe?: string;
}

export function usePoolAnalytics({ poolId, userId, timeframe = '3months' }: UsePoolAnalyticsProps) {
  const [analytics, setAnalytics] = useState<PoolAnalyticsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { pool, isLoading: poolLoading, error: poolError } = usePool({ poolId, userId });
  
  // Process analytics data when pool data is loaded
  useEffect(() => {
    if (poolLoading) {
      return;
    }
    
    if (poolError) {
      setError(poolError);
      setIsLoading(false);
      return;
    }
    
    if (!pool) {
      setError('Pool not found');
      setIsLoading(false);
      return;
    }
    
    try {
      const analyticsData = processPoolAnalytics(pool, timeframe);
      setAnalytics(analyticsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to process analytics data');
      console.error('Error processing pool analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pool, poolLoading, poolError, timeframe]);
  
  return {
    analytics,
    isLoading: isLoading || poolLoading,
    error: error || poolError,
  };
}

// Helper function to process pool data into analytics
function processPoolAnalytics(pool: Pool, timeframe: string): PoolAnalyticsType {
  // Calculate total savings
  const totalSaved = pool.totalAmount;
  
  // Calculate completion percentage
  const completionPercentage = (pool.currentRound / pool.totalRounds) * 100;
  
  // Calculate on-time rate from members
  const totalPayments = pool.members.reduce((acc, member) => acc + member.paymentsOnTime + member.paymentsMissed, 0);
  const onTimePayments = pool.members.reduce((acc, member) => acc + member.paymentsOnTime, 0);
  const onTimeRate = totalPayments ? (onTimePayments / totalPayments) * 100 : 100;
  
  // Calculate average contribution
  const totalContributions = pool.transactions
    .filter(t => t.type === TransactionType.CONTRIBUTION)
    .reduce((acc, t) => acc + t.amount, 0);
  const contributionCount = pool.transactions.filter(t => t.type === TransactionType.CONTRIBUTION).length;
  const averageContribution = contributionCount ? totalContributions / contributionCount : 0;
  
  // Generate savings growth data
  const savingsGrowthData = generateSavingsGrowthData(pool);
  
  // Generate payout distribution data
  const payoutDistributionData = [
    { 
      name: 'Paid Out', 
      value: pool.transactions
        .filter(t => t.type === TransactionType.PAYOUT)
        .reduce((acc, t) => acc + t.amount, 0) 
    },
    { 
      name: 'Remaining', 
      value: (pool.contributionAmount * pool.memberCount * pool.totalRounds) - 
        pool.transactions
          .filter(t => t.type === TransactionType.PAYOUT)
          .reduce((acc, t) => acc + t.amount, 0) 
    }
  ];
  
  // Generate on-time rate data by month
  const onTimeRateData = generateOnTimeRateData(pool);
  
  // Generate contribution data by month
  const contributionData = generateContributionData(pool);
  
  // Generate member contribution data
  const memberContributionData = pool.members.map(member => {
    const totalContributed = member.totalContributed;
    
    const totalReceived = pool.transactions
      .filter(t => 
        t.type === TransactionType.PAYOUT && 
        t.member === member.name
      )
      .reduce((acc, t) => acc + t.amount, 0);
    
    const onTimeRate = (member.paymentsOnTime + member.paymentsMissed) > 0 
      ? (member.paymentsOnTime / (member.paymentsOnTime + member.paymentsMissed)) * 100 
      : 100;
    
    return {
      name: member.name,
      totalContributed,
      totalReceived,
      onTimeRate
    };
  });
  
  // Calculate projected completion date (2 weeks per round)
  const remainingRounds = pool.totalRounds - pool.currentRound;
  const projectedCompletionDate = new Date(new Date(pool.nextPayoutDate).getTime() + (remainingRounds * 14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
  
  // Calculate projected total value
  const projectedTotalValue = pool.contributionAmount * pool.memberCount * pool.totalRounds;
  
  // Calculate expected return (contribution amount * member count) for the user
  const expectedReturn = pool.contributionAmount * pool.memberCount;
  
  // Calculate risk level based on missed payments and pool progression
  const missedPaymentsPercentage = totalPayments ? (1 - (onTimePayments / totalPayments)) * 100 : 0;
  const riskLevel = Math.min(Math.round(missedPaymentsPercentage * 2), 100);
  
  // Generate future payout schedule
  const currentDate = new Date();
  const payoutSchedule = Array.from({ length: pool.totalRounds }, (_, i) => {
    const round = i + 1;
    const member = pool.members.find(m => m.position === round)?.name || 'Unknown';
    
    // Get actual payout date from transactions if completed
    const transaction = pool.transactions.find(
      t => t.type === TransactionType.PAYOUT && 
      t.member === member
    );
    
    // If no transaction, calculate expected date (every 2 weeks from pool start)
    const poolStartDate = new Date(pool.createdAt);
    const expectedDate = new Date(poolStartDate.getTime() + ((round - 1) * 14 * 24 * 60 * 60 * 1000));
    
    // Determine status
    let status: 'completed' | 'upcoming' | 'scheduled';
    if (transaction) {
      status = 'completed';
    } else if (round === pool.currentRound) {
      status = 'upcoming';
    } else {
      status = 'scheduled';
    }
    
    return {
      round,
      member,
      date: transaction ? transaction.date.split('T')[0] : expectedDate.toISOString().split('T')[0],
      amount: pool.contributionAmount * pool.memberCount,
      status
    };
  });
  
  return {
    totalSaved,
    completionPercentage,
    onTimeRate,
    averageContribution,
    savingsGrowthData,
    payoutDistributionData,
    onTimeRateData,
    contributionData,
    memberContributionData,
    projectedCompletionDate,
    projectedTotalValue,
    expectedReturn,
    riskLevel,
    payoutSchedule
  };
}

// Helper to generate savings growth data
function generateSavingsGrowthData(pool: Pool) {
  // Sort transactions by date
  const sortedTransactions = [...pool.transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Group by week
  const weeklyData: Record<string, number> = {};
  let runningTotal = 0;
  
  sortedTransactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const weekNum = Math.floor(date.getDate() / 7) + 1;
    const month = date.toLocaleString('default', { month: 'short' });
    const key = `${month} Week ${weekNum}`;
    
    if (transaction.type === TransactionType.CONTRIBUTION) {
      runningTotal += transaction.amount;
    } else if (transaction.type === TransactionType.PAYOUT) {
      // Don't subtract payouts from the running total for visualization purposes
    }
    
    weeklyData[key] = runningTotal;
  });
  
  // Convert to array format
  return Object.entries(weeklyData).map(([period, amount]) => ({ period, amount }));
}

// Helper to generate on-time rate data
function generateOnTimeRateData(pool: Pool) {
  // Group transactions by month
  const monthlyData: Record<string, { onTime: number, total: number }> = {};
  
  pool.transactions.forEach(transaction => {
    if (transaction.type !== TransactionType.CONTRIBUTION) return;
    
    const date = new Date(transaction.date);
    const month = date.toLocaleString('default', { month: 'short' });
    
    if (!monthlyData[month]) {
      monthlyData[month] = { onTime: 0, total: 0 };
    }
    
    monthlyData[month].total++;
    // Assume "completed" status means on-time
    if (transaction.status === 'completed') {
      monthlyData[month].onTime++;
    }
  });
  
  // Convert to array format with rate calculation
  return Object.entries(monthlyData).map(([period, data]) => ({
    period,
    rate: data.total ? (data.onTime / data.total) * 100 : 100
  }));
}

// Helper to generate contribution data
function generateContributionData(pool: Pool) {
  // Group transactions by month
  const monthlyData: Record<string, { onTime: number, late: number, missed: number }> = {};
  
  pool.transactions.forEach(transaction => {
    if (transaction.type !== TransactionType.CONTRIBUTION) return;
    
    const date = new Date(transaction.date);
    const month = date.toLocaleString('default', { month: 'short' });
    
    if (!monthlyData[month]) {
      monthlyData[month] = { onTime: 0, late: 0, missed: 0 };
    }
    
    // Classify based on status
    if (transaction.status === 'completed') {
      monthlyData[month].onTime++;
    } else if (transaction.status === 'late') {
      monthlyData[month].late++;
    } else {
      monthlyData[month].missed++;
    }
  });
  
  // Convert to array format
  return Object.entries(monthlyData).map(([period, data]) => ({
    period,
    onTime: data.onTime,
    late: data.late,
    missed: data.missed
  }));
}