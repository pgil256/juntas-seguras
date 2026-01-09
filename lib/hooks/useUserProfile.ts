/**
 * useUserProfile Hook
 *
 * Fetches and manages the current user's profile using SWR
 * for automatic caching, deduplication, and background revalidation.
 */

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher, conditionalKey, stableDataConfig } from '../swr/config';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
}

interface UseUserProfileProps {
  onSuccess?: (data: UserProfile) => void;
  onError?: (error: string) => void;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  isValidating: boolean;
}

export function useUserProfile({ onSuccess, onError }: UseUserProfileProps = {}): UseUserProfileReturn {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data, error, isLoading, isValidating, mutate } = useSWR<UserProfile>(
    conditionalKey(isAuthenticated, '/api/users/profile'),
    fetcher,
    {
      ...stableDataConfig,
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        if (onError) {
          onError(error.message || 'Failed to fetch user profile');
        }
      },
    }
  );

  // Update profile with optimistic update
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Optimistic update
      const optimisticData = data ? { ...data, ...profileData } : null;

      await mutate(
        async () => {
          const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
          }

          return response.json();
        },
        {
          optimisticData: optimisticData as UserProfile,
          rollbackOnError: true,
          revalidate: true,
        }
      );

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user profile';
      console.error('Error updating user profile:', err);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  // Handle authentication states
  if (status === 'loading') {
    return {
      profile: null,
      isLoading: true,
      error: null,
      updateProfile,
      refreshProfile: async () => {},
      isValidating: false,
    };
  }

  if (status === 'unauthenticated') {
    return {
      profile: null,
      isLoading: false,
      error: null,
      updateProfile,
      refreshProfile: async () => {},
      isValidating: false,
    };
  }

  return {
    profile: data ?? null,
    isLoading,
    error: error?.message ?? null,
    updateProfile,
    refreshProfile: async () => {
      await mutate();
    },
    isValidating,
  };
}
