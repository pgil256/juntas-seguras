/**
 * usePoolMembers Hook Unit Tests
 *
 * Tests for the usePoolMembers hook which manages
 * pool member CRUD operations including add, update, remove, and position updates.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePoolMembers } from '@/lib/hooks/usePoolMembers';
import { PoolMemberRole, PoolMemberStatus } from '@/types/pool';

// Mock next-auth/react
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePoolMembers Hook', () => {
  const defaultProps = {
    poolId: 'pool-123',
  };

  const mockMembers = [
    {
      id: 1,
      userId: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-0101',
      joinDate: '2024-01-01T00:00:00.000Z',
      role: PoolMemberRole.ADMIN,
      position: 1,
      status: PoolMemberStatus.ACTIVE,
      paymentsOnTime: 5,
      paymentsMissed: 0,
      totalContributed: 500,
      payoutReceived: false,
      payoutDate: '',
    },
    {
      id: 2,
      userId: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      joinDate: '2024-01-02T00:00:00.000Z',
      role: PoolMemberRole.MEMBER,
      position: 2,
      status: PoolMemberStatus.ACTIVE,
      paymentsOnTime: 4,
      paymentsMissed: 1,
      totalContributed: 400,
      payoutReceived: true,
      payoutDate: '2024-01-15T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      status: 'authenticated',
      update: jest.fn(),
    } as any);
  });

  describe('Initial State', () => {
    it('should return loading state initially when authenticated', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.members).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should return loading state while session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.members).toEqual([]);
    });

    it('should set error when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Authentication required');
    });

    it('should set error when poolId is missing', async () => {
      const { result } = renderHook(() => usePoolMembers({ poolId: '' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool ID is required');
    });
  });

  describe('Successful API Fetch', () => {
    it('should fetch and return members on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual(mockMembers);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/members', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return empty array when pool has no members', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [] }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle response without members property', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Pool not found' }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool not found');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should use default error message when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch pool members');
    });
  });

  describe('addMember', () => {
    it('should add a member successfully', async () => {
      const newMember = {
        id: 3,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: PoolMemberRole.MEMBER,
        position: 3,
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add member POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ member: newMember }),
      });

      // Refresh after add
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [...mockMembers, newMember] }),
      });

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addMember({
          name: 'Bob Wilson',
          email: 'bob@example.com',
          role: PoolMemberRole.MEMBER,
        });
      });

      expect(addResult.success).toBe(true);
      expect(addResult.member).toEqual(newMember);

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberDetails: {
            name: 'Bob Wilson',
            email: 'bob@example.com',
            role: PoolMemberRole.MEMBER,
          },
        }),
      });
    });

    it('should return error when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addMember({
          name: 'Bob',
          email: 'bob@example.com',
        });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Authentication required');
    });

    it('should handle API error when adding member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add member fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists in pool' }),
      });

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addMember({
          name: 'Duplicate',
          email: 'john@example.com',
        });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Email already exists in pool');
    });

    it('should handle network error when adding member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addMember({
          name: 'Bob',
          email: 'bob@example.com',
        });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Connection failed');
    });

    it('should refresh members list after successful add', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toHaveLength(2);

      const newMember = {
        id: 3,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: PoolMemberRole.MEMBER,
        position: 3,
      };

      // Add member POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ member: newMember }),
      });

      // Refresh after add
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [...mockMembers, newMember] }),
      });

      await act(async () => {
        await result.current.addMember({
          name: 'Bob Wilson',
          email: 'bob@example.com',
        });
      });

      expect(result.current.members).toHaveLength(3);
    });
  });

  describe('updateMember', () => {
    it('should update a member successfully', async () => {
      const updatedMember = {
        ...mockMembers[0],
        name: 'John Updated',
        phone: '555-9999',
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update member PATCH
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ member: updatedMember }),
      });

      // Refresh after update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [updatedMember, mockMembers[1]] }),
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMember({
          memberId: 1,
          updates: {
            name: 'John Updated',
            phone: '555-9999',
          },
        });
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.member).toEqual(updatedMember);

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: 1,
          updates: {
            name: 'John Updated',
            phone: '555-9999',
          },
        }),
      });
    });

    it('should return error when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMember({
          memberId: 1,
          updates: { name: 'New Name' },
        });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Authentication required');
    });

    it('should handle API error when updating member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Member not found' }),
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMember({
          memberId: 999,
          updates: { name: 'New Name' },
        });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Member not found');
    });
  });

  describe('removeMember', () => {
    it('should remove a member successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Remove member DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Member removed' }),
      });

      // Refresh after remove
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [mockMembers[0]] }),
      });

      let removeResult: any;
      await act(async () => {
        removeResult = await result.current.removeMember(2);
      });

      expect(removeResult.success).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pools/pool-123/members?memberId=2',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should return error when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let removeResult: any;
      await act(async () => {
        removeResult = await result.current.removeMember(1);
      });

      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toBe('Authentication required');
    });

    it('should handle API error when removing member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot remove admin member' }),
      });

      let removeResult: any;
      await act(async () => {
        removeResult = await result.current.removeMember(1);
      });

      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toBe('Cannot remove admin member');
    });

    it('should handle network error when removing member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let removeResult: any;
      await act(async () => {
        removeResult = await result.current.removeMember(2);
      });

      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toBe('Network error');
    });

    it('should refresh members list after successful remove', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toHaveLength(2);

      // Remove member DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Member removed' }),
      });

      // Refresh after remove
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [mockMembers[0]] }),
      });

      await act(async () => {
        await result.current.removeMember(2);
      });

      expect(result.current.members).toHaveLength(1);
    });
  });

  describe('updatePositions', () => {
    it('should update positions successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update positions PATCH
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Positions updated' }),
      });

      // Refresh after update
      const reorderedMembers = [
        { ...mockMembers[0], position: 2 },
        { ...mockMembers[1], position: 1 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: reorderedMembers }),
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updatePositions({
          positions: [
            { memberId: 1, position: 2 },
            { memberId: 2, position: 1 },
          ],
        });
      });

      expect(updateResult.success).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pools/pool-123/members?positions=true',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            positions: [
              { memberId: 1, position: 2 },
              { memberId: 2, position: 1 },
            ],
          }),
        }
      );
    });

    it('should return error when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updatePositions({
          positions: [{ memberId: 1, position: 2 }],
        });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Authentication required');
    });

    it('should handle API error when updating positions', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid position values' }),
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updatePositions({
          positions: [{ memberId: 1, position: -1 }],
        });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Invalid position values');
    });

    it('should handle network error when updating positions', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Connection lost'));

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updatePositions({
          positions: [{ memberId: 1, position: 2 }],
        });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Connection lost');
    });
  });

  describe('refreshMembers', () => {
    it('should refresh members when called', async () => {
      const initialMembers = [mockMembers[0]];
      const updatedMembers = [...mockMembers];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ members: initialMembers }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ members: updatedMembers }),
        });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toHaveLength(1);

      await act(async () => {
        await result.current.refreshMembers();
      });

      expect(result.current.members).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

      await act(async () => {
        await result.current.refreshMembers();
      });

      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('Session State Changes', () => {
    it('should fetch members when session becomes authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      } as any);

      const { result, rerender } = renderHook(() => usePoolMembers(defaultProps));

      expect(mockFetch).not.toHaveBeenCalled();

      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual(mockMembers);
    });

    it('should not fetch when poolId changes while unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { rerender } = renderHook(
        ({ poolId }) => usePoolMembers({ poolId }),
        { initialProps: { poolId: 'pool-123' } }
      );

      rerender({ poolId: 'pool-456' });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle default error message for add member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addMember({
          name: 'Test',
          email: 'test@example.com',
        });
      });

      expect(addResult.error).toBe('Failed to add member');
    });

    it('should handle default error message for update member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMember({
          memberId: 1,
          updates: { name: 'New Name' },
        });
      });

      expect(updateResult.error).toBe('Failed to update member');
    });

    it('should handle default error message for remove member', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let removeResult: any;
      await act(async () => {
        removeResult = await result.current.removeMember(1);
      });

      expect(removeResult.error).toBe('Failed to remove member');
    });

    it('should handle default error message for update positions', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const { result } = renderHook(() => usePoolMembers(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updatePositions({
          positions: [{ memberId: 1, position: 2 }],
        });
      });

      expect(updateResult.error).toBe('Failed to update positions');
    });
  });
});
