import { useState, useEffect } from 'react';
import { VerificationStatus, VerificationType, VerificationMethod, UserIdentityInfo } from '../../types/identity';

interface UseIdentityVerificationProps {
  userId: string;
}

interface UseIdentityVerificationReturn {
  isLoading: boolean;
  error: string | null;
  identityInfo: UserIdentityInfo | null;
  startVerification: (type: VerificationType, method: VerificationMethod) => Promise<{
    success: boolean;
    verificationUrl?: string;
    error?: string;
  }>;
  checkVerificationStatus: () => Promise<void>;
  completeVerification: (status: 'verified' | 'rejected' | 'submitted', verificationId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

export function useIdentityVerification({ userId }: UseIdentityVerificationProps): UseIdentityVerificationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityInfo, setIdentityInfo] = useState<UserIdentityInfo | null>(null);

  // Check verification status on load
  useEffect(() => {
    if (userId) {
      checkVerificationStatus();
    }
  }, [userId]);

  // Start a new identity verification process
  const startVerification = async (type: VerificationType, method: VerificationMethod) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/identity/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type,
          method,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start verification process');
      }
      
      // Update local state
      setIdentityInfo({
        isVerified: false,
        verificationStatus: data.verification.status,
        verificationType: data.verification.type,
        verificationMethod: data.verification.method,
        lastUpdated: data.verification.lastUpdated,
      });
      
      return {
        success: true,
        verificationUrl: data.verificationUrl,
      };
    } catch (err: any) {
      console.error('Error starting verification:', err);
      setError(err.message || 'Failed to start verification process');
      return {
        success: false,
        error: err.message || 'Failed to start verification process',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Check the status of the current verification
  const checkVerificationStatus = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/identity/verification?userId=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check verification status');
      }
      
      setIdentityInfo({
        isVerified: data.isVerified,
        verificationStatus: data.status,
        verificationType: data.verification?.type,
        verificationMethod: data.verification?.method,
        lastUpdated: data.verification?.lastUpdated,
      });
    } catch (err: any) {
      console.error('Error checking verification status:', err);
      setError(err.message || 'Failed to check verification status');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete the verification process (update status)
  const completeVerification = async (status: 'verified' | 'rejected' | 'submitted', verificationId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/identity/verification/complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status,
          verificationId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete verification');
      }
      
      // Update local state
      await checkVerificationStatus();
      
      return {
        success: true,
      };
    } catch (err: any) {
      console.error('Error completing verification:', err);
      setError(err.message || 'Failed to complete verification');
      return {
        success: false,
        error: err.message || 'Failed to complete verification',
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    identityInfo,
    startVerification,
    checkVerificationStatus,
    completeVerification,
  };
}