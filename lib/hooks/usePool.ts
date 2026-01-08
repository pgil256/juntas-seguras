import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Pool } from '../../types/pool';

interface UsePoolProps {
  poolId: string;
}

interface UsePoolReturn {
  pool: Pool | null;
  isLoading: boolean;
  error: string | null;
  refreshPool: () => Promise<void>;
}

export function usePool({ poolId }: UsePoolProps): UsePoolReturn {
  const { data: session, status } = useSession();
  const [pool, setPool] = useState<Pool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPool = useCallback(async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    // Don't try to fetch if not authenticated
    if (status === 'unauthenticated') {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    // Wait for session check to complete
    if (status === 'loading') {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/pools/${poolId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pool');
      }
      
      const data = await response.json();
      setPool(data.pool || null);
    } catch (err: any) {
      console.error('Error fetching pool:', err);
      setError(err.message || 'Failed to fetch pool');
    } finally {
      setIsLoading(false);
    }
  }, [poolId, status]);

  // Handle edge cases and fetch when ready
  useEffect(() => {
    // Handle missing poolId
    if (!poolId && status !== 'loading') {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    // Handle unauthenticated status
    if (status === 'unauthenticated') {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    // Fetch pool when authenticated with valid poolId
    if (poolId && status === 'authenticated') {
      fetchPool();
    }
  }, [poolId, status, fetchPool]);

  return {
    pool,
    isLoading,
    error,
    refreshPool: fetchPool,
  };
}