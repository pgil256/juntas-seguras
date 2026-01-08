/**
 * useEarlyPayout Hook Tests
 *
 * Tests for the useEarlyPayout hook that manages early payout status checking and initiation.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEarlyPayout } from '@/lib/hooks/useEarlyPayout';
import { EarlyPayoutVerification } from '@/types/pool';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample early payout verification data
const mockEarlyPayoutAllowed: EarlyPayoutVerification = {
  allowed: true,
  recipient: {
    name: 'John Doe',
    email: 'john@example.com',
    payoutMethod: {
      type: 'venmo',
      handle: '@johndoe',
      displayName: 'John D',
    },
    paymentLink: 'https://venmo.com/johndoe',
  },
  payoutAmount: 500,
  scheduledDate: '2024-02-15',
  currentRound: 3,
};

const mockEarlyPayoutNotAllowed: EarlyPayoutVerification = {
  allowed: false,
  reason: 'Not all contributions have been received',
  missingContributions: ['member-2', 'member-3'],
  currentRound: 3,
};

const mockEarlyPayoutTransaction = {
  id: 1,
  amount: 500,
  recipient: 'John Doe',
  wasEarlyPayout: true,
  scheduledPayoutDate: '2024-02-15',
  stripeTransferId: 'tr_123456',
};

describe('useEarlyPayout Hook', () => {
  const poolId = 'pool-1';
  const userId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('starts with correct initial state', () => {
      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.earlyPayoutStatus).toBeNull();
      expect(typeof result.current.checkEarlyPayoutStatus).toBe('function');
      expect(typeof result.current.initiateEarlyPayout).toBe('function');
    });
  });

  describe('Check Early Payout Status', () => {
    it('checks early payout status successfully when allowed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          recipient: mockEarlyPayoutAllowed.recipient,
          payoutAmount: mockEarlyPayoutAllowed.payoutAmount,
          scheduledDate: mockEarlyPayoutAllowed.scheduledDate,
          currentRound: mockEarlyPayoutAllowed.currentRound,
        }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!).not.toBeNull();
      expect(status!.allowed).toBe(true);
      expect(status!.recipient?.name).toBe('John Doe');
      expect(status!.payoutAmount).toBe(500);

      expect(result.current.earlyPayoutStatus).toEqual(status);
      expect(result.current.error).toBeNull();

      // Verify fetch call
      expect(mockFetch).toHaveBeenCalledWith(`/api/pools/${poolId}/early-payout`);
    });

    it('checks early payout status when not allowed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          reason: mockEarlyPayoutNotAllowed.reason,
          missingContributions: mockEarlyPayoutNotAllowed.missingContributions,
          currentRound: mockEarlyPayoutNotAllowed.currentRound,
        }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!).not.toBeNull();
      expect(status!.allowed).toBe(false);
      expect(status!.reason).toBe('Not all contributions have been received');
      expect(status!.missingContributions).toEqual(['member-2', 'member-3']);
    });

    it('returns null when poolId is empty', async () => {
      const { result } = renderHook(() => useEarlyPayout({ poolId: '', userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles server error when checking status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Pool not found' }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!).toBeNull();
      expect(result.current.error).toBe('Pool not found');
      expect(result.current.earlyPayoutStatus).toBeNull();
    });

    it('handles network error when checking status', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!).toBeNull();
      expect(result.current.error).toBe('Network unavailable');
    });

    it('sets isLoading state correctly during status check', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      expect(result.current.isLoading).toBe(false);

      const checkPromise = act(async () => {
        return result.current.checkEarlyPayoutStatus();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise({ allowed: true });

      await checkPromise;

      expect(result.current.isLoading).toBe(false);
    });

    it('uses useCallback to memoize checkEarlyPayoutStatus', () => {
      const { result, rerender } = renderHook(() => useEarlyPayout({ poolId, userId }));

      const firstCallback = result.current.checkEarlyPayoutStatus;

      rerender();

      const secondCallback = result.current.checkEarlyPayoutStatus;

      // Same function reference (memoized)
      expect(firstCallback).toBe(secondCallback);
    });

    it('updates callback when poolId changes', () => {
      const { result, rerender } = renderHook(
        ({ poolId }) => useEarlyPayout({ poolId, userId }),
        { initialProps: { poolId: 'pool-1' } }
      );

      const firstCallback = result.current.checkEarlyPayoutStatus;

      rerender({ poolId: 'pool-2' });

      const secondCallback = result.current.checkEarlyPayoutStatus;

      // Different function reference (new poolId)
      expect(firstCallback).not.toBe(secondCallback);
    });
  });

  describe('Initiate Early Payout', () => {
    it('initiates early payout successfully', async () => {
      // First call: initiate payout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Early payout processed successfully',
          transaction: mockEarlyPayoutTransaction,
          nextRound: 4,
          isComplete: false,
        }),
      });

      // Second call: status refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          reason: 'Payout already processed for this round',
          currentRound: 4,
        }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout('Need funds urgently');
      });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Early payout processed successfully');
      expect(response.transaction).toEqual(mockEarlyPayoutTransaction);
      expect(response.nextRound).toBe(4);
      expect(response.isComplete).toBe(false);

      // Verify fetch call
      expect(mockFetch).toHaveBeenCalledWith(`/api/pools/${poolId}/early-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Need funds urgently' }),
      });
    });

    it('initiates early payout without reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Early payout processed successfully',
          transaction: mockEarlyPayoutTransaction,
        }),
      });

      // Status refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: false }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(true);

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.reason).toBeUndefined();
    });

    it('handles complete pool after payout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Final payout processed. Pool is complete.',
          transaction: mockEarlyPayoutTransaction,
          isComplete: true,
        }),
      });

      // Status refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: false }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(true);
      expect(response.isComplete).toBe(true);
    });

    it('returns error when poolId is missing', async () => {
      const { result } = renderHook(() => useEarlyPayout({ poolId: '', userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Pool ID and user ID are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error when userId is missing', async () => {
      const { result } = renderHook(() => useEarlyPayout({ poolId, userId: '' }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Pool ID and user ID are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles server error when initiating payout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not all contributions received' }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Not all contributions received');
      expect(result.current.error).toBe('Not all contributions received');
    });

    it('handles network error when initiating payout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection timeout'));

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Connection timeout');
    });

    it('uses default success message when server returns none', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction: mockEarlyPayoutTransaction,
        }),
      });

      // Status refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: false }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let response: any;
      await act(async () => {
        response = await result.current.initiateEarlyPayout();
      });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Early payout processed successfully');
    });

    it('refreshes status after successful payout', async () => {
      // Initiate payout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Success',
          transaction: mockEarlyPayoutTransaction,
        }),
      });

      // Status refresh - should be called after payout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          reason: 'Already paid out',
          currentRound: 4,
        }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      await act(async () => {
        await result.current.initiateEarlyPayout();
      });

      // Verify status was refreshed
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(`/api/pools/${poolId}/early-payout`);
      expect(result.current.earlyPayoutStatus?.allowed).toBe(false);
    });

    it('sets isLoading state correctly during payout initiation', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      expect(result.current.isLoading).toBe(false);

      const initiatePromise = act(async () => {
        return result.current.initiateEarlyPayout();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Mock status refresh for after payout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: false }),
      });

      // Resolve the payout promise
      resolvePromise({ transaction: mockEarlyPayoutTransaction });

      await initiatePromise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error State Management', () => {
    it('clears error on successful status check', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      await act(async () => {
        await result.current.checkEarlyPayoutStatus();
      });

      expect(result.current.error).toBe('Server error');

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: true }),
      });

      await act(async () => {
        await result.current.checkEarlyPayoutStatus();
      });

      expect(result.current.error).toBeNull();
    });

    it('clears error when initiating payout', async () => {
      // Set initial error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Initial error' }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      await act(async () => {
        await result.current.checkEarlyPayoutStatus();
      });

      expect(result.current.error).toBe('Initial error');

      // Initiate payout (even if it fails, error should be updated)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transaction: mockEarlyPayoutTransaction }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: false }),
      });

      await act(async () => {
        await result.current.initiateEarlyPayout();
      });

      // Error should be cleared after successful payout
      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty response data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!).toEqual({
        allowed: undefined,
        reason: undefined,
        missingContributions: undefined,
        recipientConnectStatus: undefined,
        recipient: undefined,
        payoutAmount: undefined,
        scheduledDate: undefined,
        currentRound: undefined,
      });
    });

    it('handles recipient without payout method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          recipient: {
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          payoutAmount: 300,
        }),
      });

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      let status: EarlyPayoutVerification | null;
      await act(async () => {
        status = await result.current.checkEarlyPayoutStatus();
      });

      expect(status!.recipient?.payoutMethod).toBeUndefined();
      expect(status!.recipient?.paymentLink).toBeUndefined();
    });

    it('handles error without message', async () => {
      mockFetch.mockRejectedValueOnce({});

      const { result } = renderHook(() => useEarlyPayout({ poolId, userId }));

      await act(async () => {
        await result.current.checkEarlyPayoutStatus();
      });

      expect(result.current.error).toBe('Failed to check early payout status');
    });
  });
});
