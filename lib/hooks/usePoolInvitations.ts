import { useState, useEffect } from 'react';
import { PoolInvitation } from '@/types/pool';

interface UsePoolInvitationsProps {
  poolId: string;
  userId: string;
}

interface SendInvitationParams {
  email: string;
  name?: string;
  phone?: string;
}

export function usePoolInvitations({ poolId, userId }: UsePoolInvitationsProps) {
  const [invitations, setInvitations] = useState<PoolInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all invitations for the pool
  const fetchInvitations = async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const headers: HeadersInit = {};
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/invitations`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invitations');
      }
      
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      setError(err.message || 'Failed to fetch invitations');
    } finally {
      setIsLoading(false);
    }
  };

  // Send a new invitation
  const sendInvitation = async ({ email, name, phone }: SendInvitationParams) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/invitations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          poolId,
          email,
          name,
          phone
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to send invitation'
        };
      }
      
      // Refresh the invitations list
      await fetchInvitations();
      
      return {
        success: true,
        invitation: data.invitation
      };
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      return {
        success: false,
        error: err.message || 'Failed to send invitation'
      };
    }
  };

  // Resend an invitation
  const resendInvitation = async (invitationId: number) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/invitations`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          poolId,
          invitationId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to resend invitation'
        };
      }
      
      // Refresh the invitations list
      await fetchInvitations();
      
      return {
        success: true,
        invitation: data.invitation
      };
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      return {
        success: false,
        error: err.message || 'Failed to resend invitation'
      };
    }
  };

  // Cancel an invitation
  const cancelInvitation = async (invitationId: number) => {
    try {
      const headers: HeadersInit = {};
      
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/invitations?invitationId=${invitationId}`, {
        method: 'DELETE',
        headers
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to cancel invitation'
        };
      }
      
      // Refresh the invitations list
      await fetchInvitations();
      
      return {
        success: true
      };
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      return {
        success: false,
        error: err.message || 'Failed to cancel invitation'
      };
    }
  };

  // Initial fetch of invitations
  useEffect(() => {
    if (poolId) {
      fetchInvitations();
    }
  }, [poolId, userId]);

  return {
    invitations,
    isLoading,
    error,
    sendInvitation,
    resendInvitation,
    cancelInvitation,
    refreshInvitations: fetchInvitations
  };
}