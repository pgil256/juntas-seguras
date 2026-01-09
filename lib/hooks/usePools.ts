/**
 * usePools Hook
 *
 * Fetches all pools for the current authenticated user using SWR
 * for automatic caching, deduplication, and background revalidation.
 */

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { Pool } from '../../types/pool';
import { fetcher, conditionalKey, defaultSWRConfig } from '../swr/config';

interface PoolsResponse {
  success: boolean;
  pools: Pool[];
}

interface UsePoolsReturn {
  pools: Pool[];
  isLoading: boolean;
  error: string | null;
  refreshPools: () => Promise<void>;
  isValidating: boolean;
}

export function usePools(): UsePoolsReturn {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // Use conditional key to prevent fetching when not authenticated
  const { data, error, isLoading, isValidating, mutate } = useSWR<PoolsResponse>(
    conditionalKey(isAuthenticated, '/api/pools'),
    fetcher,
    {
      ...defaultSWRConfig,
      // For new users, don't show error for empty pools
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 401 (unauthorized)
        if (error.status === 401) return;
        // Don't retry on 404 (no pools yet)
        if (error.status === 404) return;
        // Only retry once for other errors
        if (retryCount >= 1) return;
      },
    }
  );

  // Handle authentication states
  if (status === 'loading') {
    return {
      pools: [],
      isLoading: true,
      error: null,
      refreshPools: async () => {},
      isValidating: false,
    };
  }

  if (status === 'unauthenticated') {
    return {
      pools: [],
      isLoading: false,
      error: 'Authentication required',
      refreshPools: async () => {},
      isValidating: false,
    };
  }

  return {
    pools: data?.pools ?? [],
    isLoading,
    error: error?.message ?? null,
    refreshPools: async () => {
      await mutate();
    },
    isValidating,
  };
}
