import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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
  updateSettings: (settingsData: Partial<UserSettings>) => Promise<{ success: boolean, error?: string }>;
  refreshSettings: () => void;
}

export function useUserSettings({ onSuccess, onError }: UseUserSettingsProps = {}): UseUserSettingsReturn {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch settings data
  useEffect(() => {
    // Don't fetch if not authenticated
    if (status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    // Don't fetch if still loading auth
    if (status === 'loading') {
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/users/settings');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch settings');
        }

        const settingsData = await response.json();
        setSettings(settingsData);
        
        if (onSuccess) {
          onSuccess(settingsData);
        }
      } catch (err: any) {
        console.error('Error fetching user settings:', err);
        setError(err.message || 'Failed to fetch user settings');
        
        if (onError) {
          onError(err.message || 'Failed to fetch user settings');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [status, refreshTrigger, onSuccess, onError]);

  // Update settings
  const updateSettings = async (settingsData: Partial<UserSettings>) => {
    try {
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

      const updatedSettings = await response.json();
      setSettings(updatedSettings);

      return { success: true };
    } catch (err: any) {
      console.error('Error updating user settings:', err);
      return { 
        success: false, 
        error: err.message || 'Failed to update user settings'
      };
    }
  };

  // Refresh settings data
  const refreshSettings = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings
  };
}