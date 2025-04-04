import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Pool } from '@/types/pool';

interface UsePoolsReturn {
  pools: Pool[] | null;
  isLoading: boolean;
  error: string | null;
  refreshPools: () => Promise<void>;
}

export function usePools(): UsePoolsReturn {
  const { data: session, status } = useSession();
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = async () => {
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
      const response = await fetch('/api/pools', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pools');
      }
      
      const data = await response.json();
      setPools(data.pools || []);
    } catch (err: any) {
      console.error('Error fetching pools:', err);
      setError(err.message || 'Failed to fetch pools');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch when auth status changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchPools();
    }
  }, [status]);

  return {
    pools,
    isLoading,
    error,
    refreshPools: fetchPools,
  };
}