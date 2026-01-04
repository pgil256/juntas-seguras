import { useState, useCallback } from 'react';
import { EarlyPayoutVerification } from '../../types/pool';

interface UseEarlyPayoutProps {
  poolId: string;
  userId: string;
}

interface EarlyPayoutResult {
  success: boolean;
  message?: string;
  error?: string;
  transaction?: {
    id: number;
    amount: number;
    recipient: string;
    wasEarlyPayout: boolean;
    scheduledPayoutDate: string;
    stripeTransferId: string;
  };
  nextRound?: number;
  isComplete?: boolean;
}

interface UseEarlyPayoutReturn {
  isLoading: boolean;
  error: string | null;
  earlyPayoutStatus: EarlyPayoutVerification | null;
  checkEarlyPayoutStatus: () => Promise<EarlyPayoutVerification | null>;
  initiateEarlyPayout: (reason?: string) => Promise<EarlyPayoutResult>;
}

export function useEarlyPayout({ poolId, userId }: UseEarlyPayoutProps): UseEarlyPayoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earlyPayoutStatus, setEarlyPayoutStatus] = useState<EarlyPayoutVerification | null>(null);

  // Check if early payout is allowed for current round
  const checkEarlyPayoutStatus = useCallback(async (): Promise<EarlyPayoutVerification | null> => {
    if (!poolId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/early-payout`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check early payout status');
      }

      const status: EarlyPayoutVerification = {
        allowed: data.allowed,
        reason: data.reason,
        missingContributions: data.missingContributions,
        recipientConnectStatus: data.recipientConnectStatus,
        recipient: data.recipient,
        payoutAmount: data.payoutAmount,
        scheduledDate: data.scheduledDate,
        currentRound: data.currentRound,
      };

      setEarlyPayoutStatus(status);
      return status;
    } catch (err: any) {
      console.error('Error checking early payout status:', err);
      setError(err.message || 'Failed to check early payout status');
      setEarlyPayoutStatus(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [poolId]);

  // Initiate the early payout
  const initiateEarlyPayout = async (reason?: string): Promise<EarlyPayoutResult> => {
    if (!poolId || !userId) {
      return {
        success: false,
        error: 'Pool ID and user ID are required',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/early-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process early payout');
      }

      // Refresh status after processing
      await checkEarlyPayoutStatus();

      return {
        success: true,
        message: data.message || 'Early payout processed successfully',
        transaction: data.transaction,
        nextRound: data.nextRound,
        isComplete: data.isComplete,
      };
    } catch (err: any) {
      console.error('Error processing early payout:', err);
      setError(err.message || 'Failed to process early payout');
      return {
        success: false,
        error: err.message || 'Failed to process early payout',
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    earlyPayoutStatus,
    checkEarlyPayoutStatus,
    initiateEarlyPayout,
  };
}
