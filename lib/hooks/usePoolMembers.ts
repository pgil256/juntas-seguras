import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PoolMember, PoolMemberRole } from '@/types/pool';

interface UsePoolMembersProps {
  poolId: string;
}

interface AddMemberParams {
  name: string;
  email: string;
  phone?: string;
  role?: PoolMemberRole;
  position?: number;
}

interface UpdateMemberParams {
  memberId: number;
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    role?: PoolMemberRole;
    position?: number;
    paymentsOnTime?: number;
    paymentsMissed?: number;
    payoutReceived?: boolean;
    payoutDate?: string;
  };
}

interface UpdatePositionsParams {
  positions: {
    memberId: number;
    position: number;
  }[];
}

interface UsePoolMembersReturn {
  members: PoolMember[];
  isLoading: boolean;
  error: string | null;
  addMember: (memberDetails: AddMemberParams) => Promise<{ success: boolean; error?: string; member?: PoolMember }>;
  updateMember: (params: UpdateMemberParams) => Promise<{ success: boolean; error?: string; member?: PoolMember }>;
  removeMember: (memberId: number) => Promise<{ success: boolean; error?: string }>;
  updatePositions: (params: UpdatePositionsParams) => Promise<{ success: boolean; error?: string }>;
  refreshMembers: () => Promise<void>;
}

export function usePoolMembers({ poolId }: UsePoolMembersProps): UsePoolMembersReturn {
  const { data: session, status } = useSession();
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

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
      const response = await fetch(`/api/pools/${poolId}/members`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pool members');
      }
      
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err: any) {
      console.error('Error fetching pool members:', err);
      setError(err.message || 'Failed to fetch pool members');
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (memberDetails: AddMemberParams) => {
    // Check authentication
    if (status !== 'authenticated') {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    try {
      const response = await fetch(`/api/pools/${poolId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memberDetails
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to add member'
        };
      }
      
      // Refresh members list after successful addition
      await fetchMembers();
      
      return {
        success: true,
        member: data.member
      };
    } catch (err: any) {
      console.error('Error adding pool member:', err);
      return {
        success: false,
        error: err.message || 'Failed to add member'
      };
    }
  };

  const updateMember = async ({ memberId, updates }: UpdateMemberParams) => {
    // Check authentication
    if (status !== 'authenticated') {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    try {
      const response = await fetch(`/api/pools/${poolId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memberId,
          updates
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to update member'
        };
      }
      
      // Refresh members list after successful update
      await fetchMembers();
      
      return {
        success: true,
        member: data.member
      };
    } catch (err: any) {
      console.error('Error updating pool member:', err);
      return {
        success: false,
        error: err.message || 'Failed to update member'
      };
    }
  };

  const removeMember = async (memberId: number) => {
    // Check authentication
    if (status !== 'authenticated') {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    try {
      const response = await fetch(`/api/pools/${poolId}/members?memberId=${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to remove member'
        };
      }
      
      // Refresh members list after successful removal
      await fetchMembers();
      
      return {
        success: true
      };
    } catch (err: any) {
      console.error('Error removing pool member:', err);
      return {
        success: false,
        error: err.message || 'Failed to remove member'
      };
    }
  };

  const updatePositions = async ({ positions }: UpdatePositionsParams) => {
    // Check authentication
    if (status !== 'authenticated') {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    try {
      const response = await fetch(`/api/pools/${poolId}/members?positions=true`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          positions
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to update positions'
        };
      }
      
      // Refresh members list after successful position update
      await fetchMembers();
      
      return {
        success: true
      };
    } catch (err: any) {
      console.error('Error updating pool positions:', err);
      return {
        success: false,
        error: err.message || 'Failed to update positions'
      };
    }
  };

  // Initial fetch when poolId changes or auth status changes
  useEffect(() => {
    if (poolId && status === 'authenticated') {
      fetchMembers();
    }
  }, [poolId, status]);

  return {
    members,
    isLoading,
    error,
    addMember,
    updateMember,
    removeMember,
    updatePositions,
    refreshMembers: fetchMembers,
  };
}