/**
 * usePools Hook Unit Tests
 *
 * Tests for the usePools hook which fetches and manages
 * pool data for the authenticated user.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePools } from '@/lib/hooks/usePools';

// Mock next-auth/react
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePools Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should return loading state initially when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      // Don't resolve fetch immediately to test loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePools());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.pools).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should return loading state while session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePools());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.pools).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set error when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Authentication required');
      expect(result.current.pools).toEqual([]);
    });
  });

  describe('Successful API Fetch', () => {
    it('should fetch and return pools on successful API call', async () => {
      const mockPools = [
        {
          id: 'pool-1',
          name: 'Test Pool 1',
          description: 'A test pool',
          status: 'active',
          totalAmount: 1000,
          contributionAmount: 100,
          frequency: 'weekly',
          currentRound: 1,
          totalRounds: 10,
          memberCount: 5,
          members: [],
          transactions: [],
          messages: [],
        },
        {
          id: 'pool-2',
          name: 'Test Pool 2',
          description: 'Another test pool',
          status: 'active',
          totalAmount: 2000,
          contributionAmount: 200,
          frequency: 'monthly',
          currentRound: 2,
          totalRounds: 5,
          memberCount: 3,
          members: [],
          transactions: [],
          messages: [],
        },
      ];

      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pools: mockPools }),
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual(mockPools);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/pools', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return empty array when user has no pools', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pools: [] }),
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle response without pools property', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-ok response gracefully for new users', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'No pools found' }),
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook handles non-ok responses gracefully for new users
      expect(result.current.pools).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook handles errors gracefully by setting empty pools
      expect(result.current.pools).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle invalid JSON response', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual([]);
    });

    it('should handle unexpected response format', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      // Return a non-object value
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual([]);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh pools when refreshPools is called', async () => {
      const initialPools = [
        {
          id: 'pool-1',
          name: 'Initial Pool',
          status: 'active',
        },
      ];

      const updatedPools = [
        {
          id: 'pool-1',
          name: 'Updated Pool',
          status: 'active',
        },
        {
          id: 'pool-2',
          name: 'New Pool',
          status: 'active',
        },
      ];

      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pools: initialPools }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pools: updatedPools }),
        });

      const { result } = renderHook(() => usePools());

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual(initialPools);

      // Trigger refresh
      await act(async () => {
        await result.current.refreshPools();
      });

      expect(result.current.pools).toEqual(updatedPools);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh error gracefully', async () => {
      const initialPools = [
        {
          id: 'pool-1',
          name: 'Initial Pool',
          status: 'active',
        },
      ];

      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pools: initialPools }),
        })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const { result } = renderHook(() => usePools());

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual(initialPools);

      // Trigger refresh
      await act(async () => {
        await result.current.refreshPools();
      });

      // Pools should be reset to empty on error
      expect(result.current.pools).toEqual([]);
    });

    it('should set loading state during refresh', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pools: [] }),
        })
        .mockImplementationOnce(() => refreshPromise);

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start refresh
      act(() => {
        result.current.refreshPools();
      });

      // Should be loading during refresh
      expect(result.current.isLoading).toBe(true);

      // Complete refresh
      await act(async () => {
        resolveRefresh!({
          ok: true,
          json: async () => ({ pools: [] }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Session State Changes', () => {
    it('should fetch pools when session becomes authenticated', async () => {
      const mockPools = [{ id: 'pool-1', name: 'Test Pool' }];

      // Start with loading session
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      } as any);

      const { result, rerender } = renderHook(() => usePools());

      expect(result.current.isLoading).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();

      // Session becomes authenticated
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pools: mockPools }),
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual(mockPools);
    });

    it('should not fetch when session changes to unauthenticated', async () => {
      // Start authenticated
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pools: [{ id: 'pool-1' }] }),
      });

      const { result, rerender } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      // Session becomes unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      } as any);

      rerender();

      // Should not make additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pools array that is not an array', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pools: 'not an array' }),
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual([]);
    });

    it('should handle response with pools as object instead of array', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        status: 'authenticated',
        update: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pools: { id: 'pool-1' } }),
      });

      const { result } = renderHook(() => usePools());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pools).toEqual([]);
    });
  });
});
