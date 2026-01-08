/**
 * useCreatePool Hook Tests
 *
 * Tests for the useCreatePool hook that manages pool creation with validation.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useCreatePool } from '@/lib/hooks/useCreatePool';
import { CreatePoolRequest } from '@/types/pool';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Valid pool request
const validPoolRequest: CreatePoolRequest = {
  name: 'Test Pool',
  description: 'A test savings pool',
  contributionAmount: 10,
  frequency: 'weekly',
  totalRounds: 12,
  startDate: '2024-02-01',
  invitations: ['friend@example.com'],
  allowedPaymentMethods: ['venmo', 'paypal'],
};

describe('useCreatePool Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('starts with correct initial state', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useCreatePool());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createPool).toBe('function');
    });
  });

  describe('Authentication Validation', () => {
    it('returns error when user is not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useCreatePool());

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Authentication required. Please sign in.');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error when session exists but user is undefined', async () => {
      mockUseSession.mockReturnValue({
        data: { expires: '2024-12-31' } as any,
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useCreatePool());

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Authentication required. Please sign in.');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('returns error when pool name is missing', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, name: '' };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Pool name is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error when contribution amount is missing', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, contributionAmount: 0 };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Contribution amount must be between $1 and $20');
    });

    it('returns error when contribution amount is below minimum', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, contributionAmount: 0.5 };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Contribution amount must be between $1 and $20');
    });

    it('returns error when contribution amount exceeds maximum', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, contributionAmount: 25 };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Contribution amount must be between $1 and $20');
    });

    it('returns error when contribution amount is not an integer', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, contributionAmount: 10.5 };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Contribution amount must be between $1 and $20');
    });

    it('returns error when contribution amount is NaN', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, contributionAmount: NaN as any };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Contribution amount must be between $1 and $20');
    });

    it('returns error when total rounds is missing', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, totalRounds: 0 };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Valid duration is required');
    });

    it('returns error when total rounds is negative', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, totalRounds: -5 };

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(invalidRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Valid duration is required');
    });

    it('accepts valid contribution amounts at boundaries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ pool: { id: 'pool-1' } }),
      });

      const { result } = renderHook(() => useCreatePool());

      // Test minimum boundary
      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool({ ...validPoolRequest, contributionAmount: 1 });
      });
      expect(poolId!).toBe('pool-1');

      // Test maximum boundary
      await act(async () => {
        poolId = await result.current.createPool({ ...validPoolRequest, contributionAmount: 20 });
      });
      expect(poolId!).toBe('pool-1');
    });
  });

  describe('Successful Pool Creation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('creates a pool successfully and returns pool id', async () => {
      const newPoolId = 'new-pool-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pool: { id: newPoolId, name: validPoolRequest.name },
        }),
      });

      const { result } = renderHook(() => useCreatePool());

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBe(newPoolId);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);

      // Verify fetch call
      expect(mockFetch).toHaveBeenCalledWith('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPoolRequest,
          invitations: validPoolRequest.invitations,
        }),
      });
    });

    it('calls onSuccess callback with pool id when provided', async () => {
      const newPoolId = 'new-pool-456';
      const onSuccess = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: { id: newPoolId } }),
      });

      const { result } = renderHook(() => useCreatePool({ onSuccess }));

      await act(async () => {
        await result.current.createPool(validPoolRequest);
      });

      expect(onSuccess).toHaveBeenCalledWith(newPoolId);
    });

    it('does not call onSuccess when response has no pool id', async () => {
      const onSuccess = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: {} }),
      });

      const { result } = renderHook(() => useCreatePool({ onSuccess }));

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBeNull();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('handles empty invitations array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: { id: 'pool-1' } }),
      });

      const { result } = renderHook(() => useCreatePool());

      const requestWithNoInvites = { ...validPoolRequest, invitations: [] };

      await act(async () => {
        await result.current.createPool(requestWithNoInvites);
      });

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.invitations).toEqual([]);
    });

    it('handles undefined invitations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: { id: 'pool-1' } }),
      });

      const { result } = renderHook(() => useCreatePool());

      const requestWithUndefinedInvites = { ...validPoolRequest, invitations: undefined };

      await act(async () => {
        await result.current.createPool(requestWithUndefinedInvites);
      });

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.invitations).toEqual([]);
    });

    it('handles non-array invitations by converting to empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: { id: 'pool-1' } }),
      });

      const { result } = renderHook(() => useCreatePool());

      const requestWithInvalidInvites = { ...validPoolRequest, invitations: 'invalid' as any };

      await act(async () => {
        await result.current.createPool(requestWithInvalidInvites);
      });

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.invitations).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('handles server error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Pool name already exists' }),
      });

      const { result } = renderHook(() => useCreatePool());

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Pool name already exists');
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCreatePool());

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Network error');
    });

    it('uses default error message when server returns empty error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useCreatePool());

      let poolId: string | null;
      await act(async () => {
        poolId = await result.current.createPool(validPoolRequest);
      });

      expect(poolId!).toBeNull();
      expect(result.current.error).toBe('Failed to create pool');
    });

    it('clears previous error on new successful request', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useCreatePool());

      await act(async () => {
        await result.current.createPool(validPoolRequest);
      });

      expect(result.current.error).toBe('Server error');

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pool: { id: 'pool-1' } }),
      });

      await act(async () => {
        await result.current.createPool(validPoolRequest);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('sets isLoading to true during pool creation', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { result } = renderHook(() => useCreatePool());

      expect(result.current.isLoading).toBe(false);

      const createPromise = act(async () => {
        return result.current.createPool(validPoolRequest);
      });

      // Wait for loading state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise({ pool: { id: 'pool-1' } });

      await createPromise;

      expect(result.current.isLoading).toBe(false);
    });

    it('sets isLoading to false after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useCreatePool());

      await act(async () => {
        await result.current.createPool(validPoolRequest);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('does not set isLoading when validation fails', async () => {
      const { result } = renderHook(() => useCreatePool());

      const invalidRequest = { ...validPoolRequest, name: '' };

      await act(async () => {
        await result.current.createPool(invalidRequest);
      });

      // isLoading should never have been set to true
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Multiple Creations', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('can create multiple pools sequentially', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pool: { id: 'pool-1' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pool: { id: 'pool-2' } }),
        });

      const { result } = renderHook(() => useCreatePool());

      let poolId1: string | null;
      let poolId2: string | null;

      await act(async () => {
        poolId1 = await result.current.createPool({
          ...validPoolRequest,
          name: 'Pool 1',
        });
      });

      await act(async () => {
        poolId2 = await result.current.createPool({
          ...validPoolRequest,
          name: 'Pool 2',
        });
      });

      expect(poolId1!).toBe('pool-1');
      expect(poolId2!).toBe('pool-2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
