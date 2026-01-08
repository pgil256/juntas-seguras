import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Pool } from '../../types/pool';

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

  const fetchPools = useCallback(async () => {
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
        console.warn('Invalid response format from server');
        // For new users, just set empty pools and continue
        setPools([]);
        setIsLoading(false);
        return;
      }
      
      // For new users or when no pools exist, just set empty array
      // instead of throwing errors. This covers all status codes.
      if (!response.ok) {
        console.warn(`Non-success response from /api/pools: ${response.status}`);
        setPools([]);
        setIsLoading(false);
        return;
      }
      
      // Type guard to ensure data.pools is handled properly
      if (!data || typeof data !== 'object') {
        console.warn('Unexpected response format, expected object');
        setPools([]);
        setIsLoading(false);
        return;
      }
      
      // Check if data has the pools property
      if (!('pools' in data)) {
        console.warn('Response does not contain pools property');
        setPools([]);
        setIsLoading(false);
        return;
      }
      
      // Initialize with empty array if no pools are found or if data.pools is not an array
      setPools(Array.isArray(data.pools) ? data.pools : []);
    } catch (err: any) {
      console.error('Error fetching pools:', err);
      // Don't set error for new users - just use empty array
      setError(null);
      setPools([]); // Reset to empty array on error to avoid null checks
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // Handle authentication status and fetch pools
  useEffect(() => {
    // Handle unauthenticated status
    if (status === 'unauthenticated') {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    // Fetch pools when authenticated
    if (status === 'authenticated') {
      fetchPools();
    }
  }, [status, fetchPools]);

  return {
    pools,
    isLoading,
    error,
    refreshPools: fetchPools,
  };
}