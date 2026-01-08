/**
 * Unit tests for lib/hooks/usePool.ts
 * Tests the usePool hook that fetches pool data with session authentication
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePool } from '@/lib/hooks/usePool';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('usePool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return loading state initially', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pool).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return error when poolId is missing', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => usePool({ poolId: '' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Pool ID is required');
    expect(result.current.pool).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return error when unauthenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Authentication required');
    expect(result.current.pool).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch pool successfully when authenticated', async () => {
    const mockPool = {
      _id: 'pool-123',
      name: 'Test Pool',
      contributionAmount: 100,
      frequency: 'monthly',
      members: [],
    };

    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pool: mockPool }),
    });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pool).toEqual(mockPool);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle API errors gracefully', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Pool not found' }),
    });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Pool not found');
    expect(result.current.pool).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.pool).toBeNull();
  });

  it('should re-fetch data when refreshPool is called', async () => {
    const mockPool = {
      _id: 'pool-123',
      name: 'Test Pool',
      contributionAmount: 100,
      frequency: 'monthly',
      members: [],
    };

    const updatedPool = {
      ...mockPool,
      name: 'Updated Pool',
    };

    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: mockPool }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: updatedPool }),
      });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.pool).toEqual(mockPool);
    });

    // Call refreshPool
    await act(async () => {
      await result.current.refreshPool();
    });

    // Verify the pool was updated
    expect(result.current.pool).toEqual(updatedPool);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle API error response without error message', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch pool');
    expect(result.current.pool).toBeNull();
  });

  it('should not fetch when session status is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    });

    renderHook(() => usePool({ poolId: 'pool-123' }));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch again when poolId changes', async () => {
    const mockPool1 = { _id: 'pool-1', name: 'Pool 1' };
    const mockPool2 = { _id: 'pool-2', name: 'Pool 2' };

    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: mockPool1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: mockPool2 }),
      });

    const { result, rerender } = renderHook(
      ({ poolId }) => usePool({ poolId }),
      { initialProps: { poolId: 'pool-1' } }
    );

    await waitFor(() => {
      expect(result.current.pool).toEqual(mockPool1);
    });

    // Change poolId
    rerender({ poolId: 'pool-2' });

    await waitFor(() => {
      expect(result.current.pool).toEqual(mockPool2);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/pools/pool-1', expect.any(Object));
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/pools/pool-2', expect.any(Object));
  });

  it('should set pool to null when API returns empty pool', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pool: null }),
    });

    const { result } = renderHook(() => usePool({ poolId: 'pool-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pool).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
