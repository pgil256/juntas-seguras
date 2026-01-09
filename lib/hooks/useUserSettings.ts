/**
 * useUserSettings Hook
 *
 * Fetches and manages the current user's settings using SWR
 * for automatic caching, deduplication, and background revalidation.
 */

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher, conditionalKey, stableDataConfig } from '../swr/config';

interface NotificationPreferences {
  email: {
    paymentReminders: boolean;
    poolUpdates: boolean;
    memberActivity: boolean;
    marketing: boolean;
  };
  push: {
    paymentReminders: boolean;
    poolUpdates: boolean;
    memberActivity: boolean;
    marketing: boolean;
  };
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  lastPasswordChange: string;
}

interface UserSettings {
  id: string;
  language: string;
  timezone: string;
  securitySettings: SecuritySettings;
  notificationPreferences: NotificationPreferences;
}

interface UseUserSettingsProps {
  onSuccess?: (data: UserSettings) => void;
  onError?: (error: string) => void;
}

interface UseUserSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settingsData: Partial<UserSettings>) => Promise<{ success: boolean; error?: string }>;
  refreshSettings: () => Promise<void>;
  isValidating: boolean;
}

export function useUserSettings({ onSuccess, onError }: UseUserSettingsProps = {}): UseUserSettingsReturn {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data, error, isLoading, isValidating, mutate } = useSWR<UserSettings>(
    conditionalKey(isAuthenticated, '/api/users/settings'),
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
          onError(error.message || 'Failed to fetch user settings');
        }
      },
    }
  );

  // Update settings with optimistic update
  const updateSettings = async (settingsData: Partial<UserSettings>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Optimistic update
      const optimisticData = data ? { ...data, ...settingsData } : null;

      await mutate(
        async () => {
          const response = await fetch('/api/users/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingsData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update settings');
          }

          return response.json();
        },
        {
          optimisticData: optimisticData as UserSettings,
          rollbackOnError: true,
          revalidate: true,
        }
      );

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user settings';
      console.error('Error updating user settings:', err);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  // Handle authentication states
  if (status === 'loading') {
    return {
      settings: null,
      isLoading: true,
      error: null,
      updateSettings,
      refreshSettings: async () => {},
      isValidating: false,
    };
  }

  if (status === 'unauthenticated') {
    return {
      settings: null,
      isLoading: false,
      error: null,
      updateSettings,
      refreshSettings: async () => {},
      isValidating: false,
    };
  }

  return {
    settings: data ?? null,
    isLoading,
    error: error?.message ?? null,
    updateSettings,
    refreshSettings: async () => {
      await mutate();
    },
    isValidating,
  };
}
