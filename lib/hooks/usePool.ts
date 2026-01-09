/**
 * usePool Hook
 *
 * Fetches a single pool by ID for the current authenticated user using SWR
 * for automatic caching, deduplication, and background revalidation.
 */

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { Pool } from '../../types/pool';
import { fetcher, conditionalKey, defaultSWRConfig } from '../swr/config';

interface UsePoolProps {
  poolId: string;
}

interface PoolResponse {
  success: boolean;
  pool: Pool;
}

interface UsePoolReturn {
  pool: Pool | null;
  isLoading: boolean;
  error: string | null;
  refreshPool: () => Promise<void>;
  isValidating: boolean;
}

export function usePool({ poolId }: UsePoolProps): UsePoolReturn {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const hasValidPoolId = Boolean(poolId);

  // Use conditional key to prevent fetching when not authenticated or no poolId
  const shouldFetch = isAuthenticated && hasValidPoolId;
  const key = shouldFetch ? `/api/pools/${poolId}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<PoolResponse>(
    key,
    fetcher,
    defaultSWRConfig
  );

  // Handle missing poolId
  if (!hasValidPoolId && status !== 'loading') {
    return {
      pool: null,
      isLoading: false,
      error: 'Pool ID is required',
      refreshPool: async () => {},
      isValidating: false,
    };
  }

  // Handle authentication states
  if (status === 'loading') {
    return {
      pool: null,
      isLoading: true,
      error: null,
      refreshPool: async () => {},
      isValidating: false,
    };
  }

  if (status === 'unauthenticated') {
    return {
      pool: null,
      isLoading: false,
      error: 'Authentication required',
      refreshPool: async () => {},
      isValidating: false,
    };
  }

  return {
    pool: data?.pool ?? null,
    isLoading,
    error: error?.message ?? null,
    refreshPool: async () => {
      await mutate();
    },
    isValidating,
  };
}
