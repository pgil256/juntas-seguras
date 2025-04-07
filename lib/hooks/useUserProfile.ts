import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ success: boolean, error?: string }>;
  refreshProfile: () => void;
}

export function useUserProfile({ onSuccess, onError }: UseUserProfileProps = {}): UseUserProfileReturn {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch profile data
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

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/users/profile');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch profile');
        }

        const profileData = await response.json();
        setProfile(profileData);
        
        if (onSuccess) {
          onSuccess(profileData);
        }
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message || 'Failed to fetch user profile');
        
        if (onError) {
          onError(err.message || 'Failed to fetch user profile');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [status, refreshTrigger, onSuccess, onError]);

  // Update profile
  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
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

      const updatedProfile = await response.json();
      setProfile(updatedProfile);

      return { success: true };
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      return { 
        success: false, 
        error: err.message || 'Failed to update user profile'
      };
    }
  };

  // Refresh profile data
  const refreshProfile = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile
  };
}