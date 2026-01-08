/**
 * usePoolPayouts Hook Unit Tests
 *
 * Tests for the usePoolPayouts hook which manages
 * payout status checking and payout processing for pools.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePoolPayouts } from '@/lib/hooks/usePoolPayouts';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePoolPayouts Hook', () => {
  const defaultProps = {
    poolId: 'pool-123',
    userId: 'user-456',
  };

  const mockPayoutStatus = {
    round: 1,
    totalRounds: 10,
    recipient: {
      name: 'John Doe',
      email: 'john@example.com',
      payoutReceived: false,
      payoutMethod: {
        type: 'venmo' as const,
        handle: '@johndoe',
        displayName: 'John D',
      },
    },
    payoutAmount: 1000,
    platformFee: 50,
    totalAmount: 1000,
    contributionStatus: [
      { name: 'Alice', contributed: true, isRecipient: false },
      { name: 'Bob', contributed: false, isRecipient: false },
      { name: 'John', contributed: true, isRecipient: true },
    ],
    allContributionsReceived: false,
    payoutProcessed: false,
    nextPayoutDate: '2024-02-15T00:00:00.000Z',
    frequency: 'weekly',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.payoutStatus).toBeNull();
      expect(typeof result.current.checkPayoutStatus).toBe('function');
      expect(typeof result.current.processPayout).toBe('function');
    });
  });

  describe('checkPayoutStatus', () => {
    it('should fetch and set payout status on success', async () => {
      const apiResponse = {
        round: 1,
        totalRounds: 10,
        recipient: mockPayoutStatus.recipient,
        payoutAmount: 1000,
        platformFee: 50,
        contributions: mockPayoutStatus.contributionStatus,
        allContributionsReceived: false,
        payoutProcessed: false,
        nextPayoutDate: '2024-02-15T00:00:00.000Z',
        frequency: 'weekly',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse,
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.payoutStatus).toEqual({
        round: 1,
        totalRounds: 10,
        recipient: mockPayoutStatus.recipient,
        payoutAmount: 1000,
        platformFee: 50,
        totalAmount: 1000,
        contributionStatus: mockPayoutStatus.contributionStatus,
        allContributionsReceived: false,
        payoutProcessed: false,
        nextPayoutDate: '2024-02-15T00:00:00.000Z',
        frequency: 'weekly',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/payouts');
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => fetchPromise);

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      // Start the fetch
      act(() => {
        result.current.checkPayoutStatus();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            round: 1,
            totalRounds: 10,
            payoutAmount: 1000,
            allContributionsReceived: false,
            payoutProcessed: false,
            nextPayoutDate: '2024-02-15',
            frequency: 'weekly',
          }),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle missing recipient in API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          payoutAmount: 1000,
          allContributionsReceived: true,
          payoutProcessed: false,
          nextPayoutDate: '2024-02-15',
          frequency: 'weekly',
          // No recipient field
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.payoutStatus?.recipient).toEqual({
        name: 'Unknown',
        email: '',
        payoutReceived: false,
        payoutMethod: null,
      });
    });

    it('should handle missing contributions in API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          recipient: { name: 'John', email: 'john@example.com', payoutReceived: false },
          payoutAmount: 1000,
          allContributionsReceived: true,
          payoutProcessed: false,
          nextPayoutDate: '2024-02-15',
          frequency: 'weekly',
          // No contributions field
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.payoutStatus?.contributionStatus).toEqual([]);
    });

    it('should not fetch if poolId is empty', async () => {
      const { result } = renderHook(() =>
        usePoolPayouts({ poolId: '', userId: 'user-456' })
      );

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Pool not found' }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Pool not found');
      expect(result.current.payoutStatus).toBeNull();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.payoutStatus).toBeNull();
    });

    it('should handle API error without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.error).toBe('Failed to check payout status');
    });
  });

  describe('processPayout', () => {
    it('should process payout successfully', async () => {
      // Mock for processPayout POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Payout initiated successfully' }),
      });

      // Mock for checkPayoutStatus after successful payout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          recipient: { name: 'John', email: 'john@example.com', payoutReceived: true },
          payoutAmount: 1000,
          allContributionsReceived: true,
          payoutProcessed: true,
          nextPayoutDate: '2024-02-22',
          frequency: 'weekly',
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.success).toBe(true);
      expect(payoutResult.message).toBe('Payout initiated successfully');

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'user-456' }),
      });
    });

    it('should set loading state during payout processing', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => fetchPromise);

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      // Start processing
      act(() => {
        result.current.processPayout();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ message: 'Success' }),
        });
      });

      // Mock the checkPayoutStatus call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          payoutAmount: 1000,
          allContributionsReceived: true,
          payoutProcessed: true,
          nextPayoutDate: '2024-02-15',
          frequency: 'weekly',
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return error when poolId is missing', async () => {
      const { result } = renderHook(() =>
        usePoolPayouts({ poolId: '', userId: 'user-456' })
      );

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.success).toBe(false);
      expect(payoutResult.error).toBe('Pool ID and user ID are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error when userId is missing', async () => {
      const { result } = renderHook(() =>
        usePoolPayouts({ poolId: 'pool-123', userId: '' })
      );

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.success).toBe(false);
      expect(payoutResult.error).toBe('Pool ID and user ID are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API error during payout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient contributions' }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.success).toBe(false);
      expect(payoutResult.error).toBe('Insufficient contributions');
      expect(result.current.error).toBe('Insufficient contributions');
    });

    it('should handle network error during payout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.success).toBe(false);
      expect(payoutResult.error).toBe('Connection failed');
      expect(result.current.error).toBe('Connection failed');
    });

    it('should handle API error without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.error).toBe('Failed to process payout');
    });

    it('should use default success message when none provided', async () => {
      // Mock for processPayout POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No message in response
      });

      // Mock for checkPayoutStatus
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          payoutAmount: 1000,
          allContributionsReceived: true,
          payoutProcessed: true,
          nextPayoutDate: '2024-02-15',
          frequency: 'weekly',
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      let payoutResult: any;
      await act(async () => {
        payoutResult = await result.current.processPayout();
      });

      expect(payoutResult.success).toBe(true);
      expect(payoutResult.message).toBe('Payout processed successfully');
    });

    it('should refresh payout status after successful payout', async () => {
      // Mock for processPayout POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }),
      });

      // Mock for checkPayoutStatus after payout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 2, // Round advanced
          totalRounds: 10,
          recipient: { name: 'Jane', email: 'jane@example.com', payoutReceived: false },
          payoutAmount: 1000,
          allContributionsReceived: false,
          payoutProcessed: false,
          nextPayoutDate: '2024-02-22',
          frequency: 'weekly',
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.processPayout();
      });

      // Should have updated payout status
      expect(result.current.payoutStatus?.round).toBe(2);
      expect(result.current.payoutStatus?.recipient?.name).toBe('Jane');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing platformFee in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          recipient: { name: 'John', email: 'john@example.com', payoutReceived: false },
          payoutAmount: 1000,
          // No platformFee
          allContributionsReceived: true,
          payoutProcessed: false,
          nextPayoutDate: '2024-02-15',
          frequency: 'weekly',
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.payoutStatus?.platformFee).toBe(0);
    });

    it('should clear error on new fetch', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Error occurred' }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.error).toBe('Error occurred');

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 1,
          totalRounds: 10,
          payoutAmount: 1000,
          allContributionsReceived: true,
          payoutProcessed: false,
          nextPayoutDate: '2024-02-15',
          frequency: 'weekly',
        }),
      });

      await act(async () => {
        await result.current.checkPayoutStatus();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle concurrent status checks', async () => {
      const slowResponse = new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({
                round: 1,
                totalRounds: 10,
                payoutAmount: 1000,
                allContributionsReceived: true,
                payoutProcessed: false,
                nextPayoutDate: '2024-02-15',
                frequency: 'weekly',
              }),
            }),
          100
        )
      );

      mockFetch.mockImplementationOnce(() => slowResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          round: 2,
          totalRounds: 10,
          payoutAmount: 1000,
          allContributionsReceived: false,
          payoutProcessed: false,
          nextPayoutDate: '2024-02-22',
          frequency: 'weekly',
        }),
      });

      const { result } = renderHook(() => usePoolPayouts(defaultProps));

      // Start both calls
      await act(async () => {
        result.current.checkPayoutStatus();
        result.current.checkPayoutStatus();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Both calls should have been made
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
