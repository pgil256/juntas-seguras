import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CreatePoolRequest } from '../../types/pool';

interface UseCreatePoolProps {
  onSuccess?: (poolId: string) => void;
}

interface UseCreatePoolReturn {
  createPool: (data: CreatePoolRequest) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useCreatePool({ onSuccess }: UseCreatePoolProps = {}): UseCreatePoolReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const createPool = async (data: CreatePoolRequest): Promise<string | null> => {
    // Check if user is authenticated
    if (!session || !session.user) {
      setError('Authentication required. Please sign in.');
      return null;
    }

    // Form validation
    if (!data.name) {
      setError('Pool name is required');
      return null;
    }

    if (!data.contributionAmount || isNaN(Number(data.contributionAmount)) || Number(data.contributionAmount) <= 0) {
      setError('Valid contribution amount is required');
      return null;
    }

    if (!data.totalRounds || isNaN(Number(data.totalRounds)) || Number(data.totalRounds) <= 0) {
      setError('Valid duration is required');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Process any invitations if they exist
      const invitations: string[] = data.invitations && Array.isArray(data.invitations)
        ? data.invitations
        : [];

      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          invitations
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pool');
      }
      
      const responseData = await response.json();
      
      // Call the success callback with the new pool ID
      if (onSuccess && responseData.pool?.id) {
        onSuccess(responseData.pool.id);
      }
      
      return responseData.pool?.id || null;
    } catch (err: any) {
      console.error('Error creating pool:', err);
      setError(err.message || 'Failed to create pool');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPool,
    isLoading,
    error
  };
}