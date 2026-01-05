import { useState, useCallback } from 'react';

interface UsePoolPayoutsProps {
  poolId: string;
  userId: string;
}

interface ContributionStatus {
  name: string;
  contributed: boolean;
  isRecipient: boolean;
}

interface PayoutStatus {
  round: number;
  totalRounds: number;
  recipient: {
    name: string;
    email: string;
    payoutReceived: boolean;
  };
  payoutAmount: number;
  platformFee: number;
  totalAmount: number;
  contributionStatus: ContributionStatus[];
  allContributionsReceived: boolean;
  payoutProcessed: boolean;
  nextPayoutDate: string;
  frequency: string;
}

interface UsePoolPayoutsReturn {
  isLoading: boolean;
  error: string | null;
  payoutStatus: PayoutStatus | null;
  checkPayoutStatus: () => Promise<void>;
  processPayout: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

export function usePoolPayouts({ poolId, userId }: UsePoolPayoutsProps): UsePoolPayoutsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);

  // Check the payout status for the current round
  const checkPayoutStatus = useCallback(async () => {
    if (!poolId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/payouts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payout status');
      }

      // Map API response to expected format
      // API returns 'contributions' but component expects 'contributionStatus'
      setPayoutStatus({
        round: data.round,
        totalRounds: data.totalRounds,
        recipient: data.recipient || { name: 'Unknown', email: '', payoutReceived: false },
        payoutAmount: data.payoutAmount,
        platformFee: data.platformFee || 0,
        totalAmount: data.payoutAmount,
        contributionStatus: data.contributions || [],
        allContributionsReceived: data.allContributionsReceived,
        payoutProcessed: data.payoutProcessed,
        nextPayoutDate: data.nextPayoutDate,
        frequency: data.frequency,
      });
    } catch (err: any) {
      console.error('Error checking payout status:', err);
      setError(err.message || 'Failed to check payout status');
      setPayoutStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [poolId]);

  // Process the payout for the current round
  const processPayout = async () => {
    if (!poolId || !userId) {
      return {
        success: false,
        error: 'Pool ID and user ID are required',
      };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/pools/${poolId}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payout');
      }
      
      // Update the local state with the new status
      await checkPayoutStatus();
      
      return {
        success: true,
        message: data.message || 'Payout processed successfully',
      };
    } catch (err: any) {
      console.error('Error processing payout:', err);
      setError(err.message || 'Failed to process payout');
      return {
        success: false,
        error: err.message || 'Failed to process payout',
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    payoutStatus,
    checkPayoutStatus,
    processPayout,
  };
}