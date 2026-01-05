import { useState, useCallback } from 'react';

interface ContributionMember {
  memberId: number;
  name: string;
  email: string;
  position: number;
  isRecipient: boolean;
  hasContributed: boolean | null;
  paymentPending?: boolean;
  contributionDate: string | null;
  contributionStatus: string | null;
  paymentMethod?: string | null;
  amount: number;
}

interface ContributionStatus {
  poolId: string;
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  nextPayoutDate: string;
  recipient: {
    name: string;
    email: string;
    position: number;
  } | null;
  contributions: ContributionMember[];
  allContributionsReceived: boolean;
}

interface UsePoolContributionsProps {
  poolId: string;
  userEmail?: string;
}

interface ConfirmPaymentResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface UsePoolContributionsReturn {
  isLoading: boolean;
  error: string | null;
  contributionStatus: ContributionStatus | null;
  userContributionInfo: {
    hasContributed: boolean;
    isRecipient: boolean;
    paymentPending: boolean;
    contributionDate: string | null;
    paymentMethod: string | null;
  } | null;
  getContributionStatus: () => Promise<void>;
  confirmManualPayment: (paymentMethod: string) => Promise<ConfirmPaymentResult>;
  completeContribution: (sessionId?: string) => Promise<ConfirmPaymentResult>;
}

export function usePoolContributions({
  poolId,
  userEmail
}: UsePoolContributionsProps): UsePoolContributionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributionStatus, setContributionStatus] = useState<ContributionStatus | null>(null);

  // Get contribution status for the current round
  const getContributionStatus = useCallback(async () => {
    if (!poolId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/contributions`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get contribution status');
      }

      setContributionStatus(data);
    } catch (err: any) {
      console.error('Error getting contribution status:', err);
      setError(err.message || 'Failed to get contribution status');
      setContributionStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [poolId]);

  // Confirm a manual payment (Venmo, Cash App, PayPal, Zelle)
  const confirmManualPayment = useCallback(async (paymentMethod: string): Promise<ConfirmPaymentResult> => {
    if (!poolId) {
      return {
        success: false,
        error: 'Pool ID is required',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_manual',
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      // Refresh contribution status after confirming
      await getContributionStatus();

      return {
        success: true,
        message: data.message || 'Payment confirmation recorded',
      };
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setError(err.message || 'Failed to confirm payment');
      return {
        success: false,
        error: err.message || 'Failed to confirm payment',
      };
    } finally {
      setIsLoading(false);
    }
  }, [poolId, getContributionStatus]);

  // Calculate user's contribution info from the status
  const userContributionInfo = contributionStatus && userEmail
    ? (() => {
        const normalizedUserEmail = userEmail.toLowerCase();
        const userMember = contributionStatus.contributions.find(
          (c) => c.email?.toLowerCase() === normalizedUserEmail
        );
        if (!userMember) return null;
        return {
          hasContributed: userMember.hasContributed === true,
          isRecipient: userMember.isRecipient,
          paymentPending: userMember.paymentPending || false,
          contributionDate: userMember.contributionDate,
          paymentMethod: userMember.paymentMethod || null,
        };
      })()
    : null;

  // Legacy function for Stripe completion - now just delegates to confirmManualPayment
  // This is kept for backwards compatibility with pages that expect this function
  const completeContribution = useCallback(async (sessionId?: string): Promise<ConfirmPaymentResult> => {
    // Since Stripe is removed, this just confirms a manual payment
    return confirmManualPayment('manual');
  }, [confirmManualPayment]);

  return {
    isLoading,
    error,
    contributionStatus,
    userContributionInfo,
    getContributionStatus,
    confirmManualPayment,
    completeContribution,
  };
}
