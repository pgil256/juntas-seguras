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
  makeContribution: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    allMembersContributed?: boolean;
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

  // Make a contribution for the current round
  const makeContribution = useCallback(async () => {
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
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to make contribution');
      }

      // Refresh contribution status after making contribution
      await getContributionStatus();

      return {
        success: true,
        message: data.message || 'Contribution recorded successfully',
        allMembersContributed: data.allMembersContributed,
      };
    } catch (err: any) {
      console.error('Error making contribution:', err);
      setError(err.message || 'Failed to make contribution');
      return {
        success: false,
        error: err.message || 'Failed to make contribution',
      };
    } finally {
      setIsLoading(false);
    }
  }, [poolId, getContributionStatus]);

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
    makeContribution,
  };
}
