/**
 * usePoolInvitations Hook Unit Tests
 *
 * Tests for the usePoolInvitations hook which manages
 * pool invitation operations including send, resend, and cancel.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePoolInvitations } from '@/lib/hooks/usePoolInvitations';
import { InvitationStatus } from '@/types/pool';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePoolInvitations Hook', () => {
  const defaultProps = {
    poolId: 'pool-123',
    userId: 'user-456',
  };

  const mockInvitations = [
    {
      id: 1,
      email: 'alice@example.com',
      sentDate: '2024-01-15T10:00:00.000Z',
      status: InvitationStatus.PENDING,
    },
    {
      id: 2,
      email: 'bob@example.com',
      sentDate: '2024-01-14T10:00:00.000Z',
      status: InvitationStatus.ACCEPTED,
    },
    {
      id: 3,
      email: 'charlie@example.com',
      sentDate: '2024-01-13T10:00:00.000Z',
      status: InvitationStatus.EXPIRED,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should return loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.invitations).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set error when poolId is missing', async () => {
      const { result } = renderHook(() =>
        usePoolInvitations({ poolId: '', userId: 'user-456' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool ID is required');
    });
  });

  describe('Successful API Fetch', () => {
    it('should fetch and return invitations on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toEqual(mockInvitations);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/invitations', {
        headers: {
          'user-id': 'user-456',
        },
      });
    });

    it('should fetch without user-id header when userId is not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() =>
        usePoolInvitations({ poolId: 'pool-123' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/invitations', {
        headers: {},
      });
    });

    it('should return empty array when pool has no invitations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: [] }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle response without invitations property', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Pool not found' }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool not found');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

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

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch invitations');
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation successfully', async () => {
      const newInvitation = {
        id: 4,
        email: 'dave@example.com',
        sentDate: '2024-01-16T10:00:00.000Z',
        status: InvitationStatus.PENDING,
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Send invitation POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitation: newInvitation }),
      });

      // Refresh after send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: [...mockInvitations, newInvitation] }),
      });

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendInvitation({
          email: 'dave@example.com',
          name: 'Dave Wilson',
          phone: '555-0104',
        });
      });

      expect(sendResult.success).toBe(true);
      expect(sendResult.invitation).toEqual(newInvitation);

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'user-456',
        },
        body: JSON.stringify({
          poolId: 'pool-123',
          email: 'dave@example.com',
          name: 'Dave Wilson',
          phone: '555-0104',
        }),
      });
    });

    it('should send invitation without userId header when not provided', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() =>
        usePoolInvitations({ poolId: 'pool-123' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Send invitation POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitation: { id: 4 } }),
      });

      // Refresh after send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      await act(async () => {
        await result.current.sendInvitation({
          email: 'dave@example.com',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolId: 'pool-123',
          email: 'dave@example.com',
          name: undefined,
          phone: undefined,
        }),
      });
    });

    it('should handle API error when sending invitation', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already invited' }),
      });

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendInvitation({
          email: 'alice@example.com',
        });
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('Email already invited');
    });

    it('should handle network error when sending invitation', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendInvitation({
          email: 'dave@example.com',
        });
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('Connection failed');
    });

    it('should use default error message when none provided', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendInvitation({
          email: 'dave@example.com',
        });
      });

      expect(sendResult.error).toBe('Failed to send invitation');
    });

    it('should refresh invitations list after successful send', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toHaveLength(3);

      const newInvitation = {
        id: 4,
        email: 'dave@example.com',
        sentDate: '2024-01-16T10:00:00.000Z',
        status: InvitationStatus.PENDING,
      };

      // Send invitation POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitation: newInvitation }),
      });

      // Refresh after send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: [...mockInvitations, newInvitation] }),
      });

      await act(async () => {
        await result.current.sendInvitation({
          email: 'dave@example.com',
        });
      });

      expect(result.current.invitations).toHaveLength(4);
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation successfully', async () => {
      const updatedInvitation = {
        ...mockInvitations[0],
        sentDate: '2024-01-16T10:00:00.000Z',
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Resend invitation PATCH
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitation: updatedInvitation }),
      });

      // Refresh after resend
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          invitations: [updatedInvitation, mockInvitations[1], mockInvitations[2]],
        }),
      });

      let resendResult: any;
      await act(async () => {
        resendResult = await result.current.resendInvitation(1);
      });

      expect(resendResult.success).toBe(true);
      expect(resendResult.invitation).toEqual(updatedInvitation);

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/invitations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'user-456',
        },
        body: JSON.stringify({
          poolId: 'pool-123',
          invitationId: 1,
        }),
      });
    });

    it('should handle API error when resending invitation', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invitation already accepted' }),
      });

      let resendResult: any;
      await act(async () => {
        resendResult = await result.current.resendInvitation(2);
      });

      expect(resendResult.success).toBe(false);
      expect(resendResult.error).toBe('Invitation already accepted');
    });

    it('should handle network error when resending invitation', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Connection lost'));

      let resendResult: any;
      await act(async () => {
        resendResult = await result.current.resendInvitation(1);
      });

      expect(resendResult.success).toBe(false);
      expect(resendResult.error).toBe('Connection lost');
    });

    it('should use default error message when none provided', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let resendResult: any;
      await act(async () => {
        resendResult = await result.current.resendInvitation(1);
      });

      expect(resendResult.error).toBe('Failed to resend invitation');
    });

    it('should refresh invitations after successful resend', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedInvitation = {
        ...mockInvitations[0],
        sentDate: '2024-01-16T10:00:00.000Z',
      };

      // Resend invitation PATCH
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitation: updatedInvitation }),
      });

      // Refresh after resend
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          invitations: [updatedInvitation, mockInvitations[1], mockInvitations[2]],
        }),
      });

      await act(async () => {
        await result.current.resendInvitation(1);
      });

      expect(result.current.invitations[0].sentDate).toBe('2024-01-16T10:00:00.000Z');
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Cancel invitation DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Invitation cancelled' }),
      });

      // Refresh after cancel
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          invitations: [mockInvitations[1], mockInvitations[2]],
        }),
      });

      let cancelResult: any;
      await act(async () => {
        cancelResult = await result.current.cancelInvitation(1);
      });

      expect(cancelResult.success).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pools/pool-123/invitations?invitationId=1',
        {
          method: 'DELETE',
          headers: {
            'user-id': 'user-456',
          },
        }
      );
    });

    it('should cancel invitation without userId header when not provided', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() =>
        usePoolInvitations({ poolId: 'pool-123' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Cancel invitation DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Invitation cancelled' }),
      });

      // Refresh after cancel
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      await act(async () => {
        await result.current.cancelInvitation(1);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pools/pool-123/invitations?invitationId=1',
        {
          method: 'DELETE',
          headers: {},
        }
      );
    });

    it('should handle API error when cancelling invitation', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invitation not found' }),
      });

      let cancelResult: any;
      await act(async () => {
        cancelResult = await result.current.cancelInvitation(999);
      });

      expect(cancelResult.success).toBe(false);
      expect(cancelResult.error).toBe('Invitation not found');
    });

    it('should handle network error when cancelling invitation', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let cancelResult: any;
      await act(async () => {
        cancelResult = await result.current.cancelInvitation(1);
      });

      expect(cancelResult.success).toBe(false);
      expect(cancelResult.error).toBe('Network error');
    });

    it('should use default error message when none provided', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      let cancelResult: any;
      await act(async () => {
        cancelResult = await result.current.cancelInvitation(1);
      });

      expect(cancelResult.error).toBe('Failed to cancel invitation');
    });

    it('should refresh invitations list after successful cancel', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toHaveLength(3);

      // Cancel invitation DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Invitation cancelled' }),
      });

      // Refresh after cancel
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          invitations: [mockInvitations[1], mockInvitations[2]],
        }),
      });

      await act(async () => {
        await result.current.cancelInvitation(1);
      });

      expect(result.current.invitations).toHaveLength(2);
    });
  });

  describe('refreshInvitations', () => {
    it('should refresh invitations when called', async () => {
      const initialInvitations = [mockInvitations[0]];
      const updatedInvitations = [...mockInvitations];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: initialInvitations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: updatedInvitations }),
        });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toHaveLength(1);

      await act(async () => {
        await result.current.refreshInvitations();
      });

      expect(result.current.invitations).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      mockFetch.mockImplementationOnce(() => refreshPromise);

      // Start refresh
      act(() => {
        result.current.refreshInvitations();
      });

      expect(result.current.isLoading).toBe(true);

      // Complete refresh
      await act(async () => {
        resolveRefresh!({
          ok: true,
          json: async () => ({ invitations: mockInvitations }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle refresh error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

      await act(async () => {
        await result.current.refreshInvitations();
      });

      expect(result.current.error).toBe('Refresh failed');
    });

    it('should clear error on successful refresh', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Error occurred' }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Error occurred');

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      await act(async () => {
        await result.current.refreshInvitations();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Pool ID Changes', () => {
    it('should refetch invitations when poolId changes', async () => {
      const pool1Invitations = [mockInvitations[0]];
      const pool2Invitations = [mockInvitations[1], mockInvitations[2]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: pool1Invitations }),
      });

      const { result, rerender } = renderHook(
        ({ poolId }) => usePoolInvitations({ poolId, userId: 'user-456' }),
        { initialProps: { poolId: 'pool-123' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invitations).toEqual(pool1Invitations);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: pool2Invitations }),
      });

      rerender({ poolId: 'pool-456' });

      await waitFor(() => {
        expect(result.current.invitations).toEqual(pool2Invitations);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/pools/pool-456/invitations', {
        headers: {
          'user-id': 'user-456',
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: mockInvitations }),
      });

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set up multiple operations
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ invitations: mockInvitations, invitation: { id: 4 } }),
      });

      // Run operations concurrently
      await act(async () => {
        await Promise.all([
          result.current.sendInvitation({ email: 'test1@example.com' }),
          result.current.resendInvitation(1),
        ]);
      });

      // All calls should have been made
      expect(mockFetch.mock.calls.length).toBeGreaterThan(2);
    });

    it('should return all required functions', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePoolInvitations(defaultProps));

      expect(typeof result.current.sendInvitation).toBe('function');
      expect(typeof result.current.resendInvitation).toBe('function');
      expect(typeof result.current.cancelInvitation).toBe('function');
      expect(typeof result.current.refreshInvitations).toBe('function');
    });
  });
});
