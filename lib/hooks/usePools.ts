import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Pool } from '@/types/pool';

interface UsePoolsReturn {
  pools: Pool[];
  isLoading: boolean;
  error: string | null;
  refreshPools: () => Promise<void>;
}

export function usePools(): UsePoolsReturn {
  const { data: session, status } = useSession();
  const [pools, setPools] = useState<Pool[]>([]);
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
      
      // Get the data first so we can use it for error messages if needed
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response format from server');
      }
      
      // Then check if the response was successful
      if (!response.ok) {
        throw new Error(data?.error || `Failed to fetch pools: ${response.status}`);
      }
      
      // Type guard to ensure data.pools is handled properly
      if (!data || typeof data !== 'object') {
        console.warn('Unexpected response format, expected object with pools property');
        setPools([]);
        return;
      }
      
      // Initialize with empty array if no pools are found or if data.pools is not an array
      setPools(Array.isArray(data.pools) ? data.pools : []);
    } catch (err: any) {
      console.error('Error fetching pools:', err);
      setError(err.message || 'Failed to fetch pools');
      setPools([]); // Reset to empty array on error to avoid null checks
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