/**
 * Unit tests for lib/hooks/usePoolContributions.ts
 * Tests the usePoolContributions hook that manages contribution status and payments
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePoolContributions } from '@/lib/hooks/usePoolContributions';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('usePoolContributions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockContributionStatus = {
    poolId: 'pool-123',
    currentRound: 1,
    totalRounds: 5,
    contributionAmount: 100,
    nextPayoutDate: '2025-02-01',
    recipient: {
      name: 'John Doe',
      email: 'john@example.com',
      position: 1,
    },
    contributions: [
      {
        memberId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        position: 1,
        isRecipient: true,
        hasContributed: null,
        contributionDate: null,
        contributionStatus: null,
        amount: 100,
      },
      {
        memberId: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        position: 2,
        isRecipient: false,
        hasContributed: true,
        paymentPending: false,
        contributionDate: '2025-01-15',
        contributionStatus: 'confirmed',
        paymentMethod: 'venmo',
        amount: 100,
      },
      {
        memberId: 3,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        position: 3,
        isRecipient: false,
        hasContributed: false,
        paymentPending: true,
        contributionDate: null,
        contributionStatus: 'pending',
        paymentMethod: null,
        amount: 100,
      },
    ],
    allContributionsReceived: false,
  };

  describe('getContributionStatus', () => {
    it('should fetch and set contribution status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.contributionStatus).toBeNull();

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.contributionStatus).toEqual(mockContributionStatus);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/contributions');
    });

    it('should handle errors in getContributionStatus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to get contribution status' }),
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.error).toBe('Failed to get contribution status');
      expect(result.current.contributionStatus).toBeNull();
    });

    it('should not fetch when poolId is empty', async () => {
      const { result } = renderHook(() =>
        usePoolContributions({ poolId: '', userEmail: 'jane@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.contributionStatus).toBeNull();
    });
  });

  describe('confirmManualPayment', () => {
    it('should send POST request and refresh contribution status', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Payment confirmation recorded' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockContributionStatus,
        });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmManualPayment('venmo');
      });

      expect(paymentResult).toEqual({
        success: true,
        message: 'Payment confirmation recorded',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_manual',
          paymentMethod: 'venmo',
        }),
      });

      // Should refresh contribution status
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/pools/pool-123/contributions');
    });

    it('should return error when poolId is missing', async () => {
      const { result } = renderHook(() =>
        usePoolContributions({ poolId: '', userEmail: 'jane@example.com' })
      );

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmManualPayment('venmo');
      });

      expect(paymentResult).toEqual({
        success: false,
        error: 'Pool ID is required',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors in confirmManualPayment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Already contributed this round' }),
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmManualPayment('venmo');
      });

      expect(paymentResult).toEqual({
        success: false,
        error: 'Already contributed this round',
      });

      expect(result.current.error).toBe('Already contributed this round');
    });

    it('should handle network errors in confirmManualPayment', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.confirmManualPayment('venmo');
      });

      expect(paymentResult).toEqual({
        success: false,
        error: 'Network failure',
      });
    });
  });

  describe('userContributionInfo', () => {
    it('should calculate correctly from contribution status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.userContributionInfo).toEqual({
        hasContributed: true,
        isRecipient: false,
        paymentPending: false,
        contributionDate: '2025-01-15',
        paymentMethod: 'venmo',
      });
    });

    it('should return null when userEmail is not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.userContributionInfo).toBeNull();
    });

    it('should return null when user is not in contributions list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'unknown@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.userContributionInfo).toBeNull();
    });

    it('should handle recipient user correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'john@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.userContributionInfo).toEqual({
        hasContributed: false,
        isRecipient: true,
        paymentPending: false,
        contributionDate: null,
        paymentMethod: null,
      });
    });

    it('should handle pending payment user correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'bob@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.userContributionInfo).toEqual({
        hasContributed: false,
        isRecipient: false,
        paymentPending: true,
        contributionDate: null,
        paymentMethod: null,
      });
    });

    it('should handle case-insensitive email matching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'JANE@EXAMPLE.COM' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.userContributionInfo).not.toBeNull();
      expect(result.current.userContributionInfo?.hasContributed).toBe(true);
    });
  });

  describe('completeContribution', () => {
    it('should delegate to confirmManualPayment with manual method', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Payment confirmation recorded' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockContributionStatus,
        });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.completeContribution();
      });

      expect(paymentResult).toEqual({
        success: true,
        message: 'Payment confirmation recorded',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_manual',
          paymentMethod: 'manual',
        }),
      });
    });

    it('should ignore sessionId parameter (legacy support)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Payment confirmation recorded' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockContributionStatus,
        });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      await act(async () => {
        await result.current.completeContribution('stripe-session-123');
      });

      // Should still use 'manual' payment method regardless of sessionId
      expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_manual',
          paymentMethod: 'manual',
        }),
      });
    });
  });

  describe('loading and error states', () => {
    it('should set loading state during getContributionStatus', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => promise);

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.getContributionStatus();
      });

      // Need to wait for state update
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => mockContributionStatus,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set loading state during confirmManualPayment', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(() => promise);

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.confirmManualPayment('venmo');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ message: 'Payment recorded' }),
        });
      });

      // Mock the getContributionStatus call that happens after
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear error on successful fetch', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'First error' }),
      });

      const { result } = renderHook(() =>
        usePoolContributions({ poolId: 'pool-123', userEmail: 'jane@example.com' })
      );

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.error).toBe('First error');

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionStatus,
      });

      await act(async () => {
        await result.current.getContributionStatus();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
