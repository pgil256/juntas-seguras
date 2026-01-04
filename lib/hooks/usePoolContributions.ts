import { useState, useCallback } from 'react';

interface ContributionMember {
  memberId: number;
  name: string;
  email: string;
  position: number;
  isRecipient: boolean;
  hasContributed: boolean | null;
  contributionDate: string | null;
  contributionStatus: string | null;
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

interface InitiateContributionResult {
  success: boolean;
  orderId?: string;
  approvalUrl?: string;
  error?: string;
}

interface CompleteContributionResult {
  success: boolean;
  message?: string;
  error?: string;
  allMembersContributed?: boolean;
}

interface UsePoolContributionsReturn {
  isLoading: boolean;
  error: string | null;
  contributionStatus: ContributionStatus | null;
  userContributionInfo: {
    hasContributed: boolean;
    isRecipient: boolean;
    contributionDate: string | null;
  } | null;
  getContributionStatus: () => Promise<void>;
  initiateContribution: () => Promise<InitiateContributionResult>;
  completeContribution: (orderId: string) => Promise<CompleteContributionResult>;
  // Legacy method for backwards compatibility
  makeContribution: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    allMembersContributed?: boolean;
    approvalUrl?: string;
    orderId?: string;
  }>;
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

  // Initiate a contribution - creates Stripe checkout session
  const initiateContribution = useCallback(async (): Promise<InitiateContributionResult> => {
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
        body: JSON.stringify({ action: 'initiate' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate contribution');
      }

      return {
        success: true,
        orderId: data.orderId,
        approvalUrl: data.approvalUrl,
      };
    } catch (err: any) {
      console.error('Error initiating contribution:', err);
      setError(err.message || 'Failed to initiate contribution');
      return {
        success: false,
        error: err.message || 'Failed to initiate contribution',
      };
    } finally {
      setIsLoading(false);
    }
  }, [poolId]);

  // Complete a contribution - confirms Stripe payment
  const completeContribution = useCallback(async (sessionId: string): Promise<CompleteContributionResult> => {
    if (!poolId) {
      return {
        success: false,
        error: 'Pool ID is required',
      };
    }

    if (!sessionId) {
      return {
        success: false,
        error: 'Session ID is required',
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
        body: JSON.stringify({ action: 'complete', sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete contribution');
      }

      // Refresh contribution status after completing
      await getContributionStatus();

      return {
        success: true,
        message: data.message || 'Contribution completed successfully',
        allMembersContributed: data.allMembersContributed,
      };
    } catch (err: any) {
      console.error('Error completing contribution:', err);
      setError(err.message || 'Failed to complete contribution');
      return {
        success: false,
        error: err.message || 'Failed to complete contribution',
      };
    } finally {
      setIsLoading(false);
    }
  }, [poolId, getContributionStatus]);

  // Legacy makeContribution - now initiates Stripe flow
  const makeContribution = useCallback(async () => {
    const result = await initiateContribution();
    if (result.success && result.approvalUrl) {
      return {
        success: true,
        message: 'Redirecting to Stripe...',
        approvalUrl: result.approvalUrl,
        orderId: result.orderId,
      };
    }
    return {
      success: false,
      error: result.error || 'Failed to initiate payment',
    };
  }, [initiateContribution]);

  // Calculate user's contribution info from the status
  const userContributionInfo = contributionStatus && userEmail
    ? (() => {
        const userMember = contributionStatus.contributions.find(
          (c) => c.email === userEmail
        );
        if (!userMember) return null;
        return {
          hasContributed: userMember.hasContributed === true,
          isRecipient: userMember.isRecipient,
          contributionDate: userMember.contributionDate,
        };
      })()
    : null;

  return {
    isLoading,
    error,
    contributionStatus,
    userContributionInfo,
    getContributionStatus,
    initiateContribution,
    completeContribution,
    makeContribution,
  };
}
