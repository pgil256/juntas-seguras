/**
 * usePayments Hook Tests
 *
 * Tests for the usePayments hook that manages payment processing and escrow release.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayments } from '@/lib/hooks/usePayments';
import { Transaction, TransactionStatus, TransactionType } from '@/types/payment';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location
const originalLocation = window.location;
delete (window as any).location;
window.location = { ...originalLocation, href: '' } as any;

// Sample transaction
const mockTransaction: Transaction = {
  id: 'txn-1',
  type: TransactionType.CONTRIBUTION,
  amount: 100,
  date: '2024-01-15',
  status: TransactionStatus.COMPLETED,
  description: 'Pool contribution',
  member: 'John Doe',
  poolId: 'pool-1',
  paymentMethodId: 1,
};

const mockEscrowedTransaction: Transaction = {
  id: 'txn-2',
  type: TransactionType.ESCROW,
  amount: 100,
  date: '2024-01-15',
  status: TransactionStatus.ESCROWED,
  description: 'Escrowed contribution',
  member: 'John Doe',
  poolId: 'pool-1',
  paymentMethodId: 1,
  escrowId: 'escrow-1',
  releaseDate: '2024-02-15',
};

describe('usePayments Hook', () => {
  const userId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    window.location.href = '';
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  describe('Initial State', () => {
    it('starts with correct initial state', () => {
      const { result } = renderHook(() => usePayments({ userId }));

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isReleasing).toBe(false);
      expect(typeof result.current.processPayment).toBe('function');
      expect(typeof result.current.releaseEscrowPayment).toBe('function');
    });
  });

  describe('Process Payment', () => {
    it('processes a regular payment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: mockTransaction,
          message: 'Payment processed successfully',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(
          'pool-1',
          100,
          1,
          false,
          undefined,
          false,
          undefined
        );
      });

      expect(response.success).toBe(true);
      expect(response.payment).toEqual(mockTransaction);
      expect(response.message).toBe('Payment processed successfully');

      // Verify fetch call
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          poolId: 'pool-1',
          amount: 100,
          paymentMethodId: 1,
          scheduleForLater: false,
          scheduledDate: undefined,
          useEscrow: false,
          escrowReleaseDate: undefined,
        }),
      });
    });

    it('processes a scheduled payment successfully', async () => {
      const scheduledDate = '2024-02-01';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: { ...mockTransaction, status: TransactionStatus.SCHEDULED, scheduledDate },
          message: 'Payment scheduled successfully',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(
          'pool-1',
          100,
          1,
          true,
          scheduledDate,
          false,
          undefined
        );
      });

      expect(response.success).toBe(true);

      // Verify scheduled date is included
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/process', expect.objectContaining({
        body: expect.stringContaining(scheduledDate),
      }));
    });

    it('processes an escrow payment successfully', async () => {
      const escrowReleaseDate = '2024-02-15';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: mockEscrowedTransaction,
          message: 'Payment escrowed successfully',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(
          'pool-1',
          100,
          1,
          false,
          undefined,
          true,
          escrowReleaseDate
        );
      });

      expect(response.success).toBe(true);
      expect(response.payment.status).toBe(TransactionStatus.ESCROWED);

      // Verify escrow params are included
      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.useEscrow).toBe(true);
      expect(callBody.escrowReleaseDate).toBe(escrowReleaseDate);
    });

    it('handles Stripe checkout redirect', async () => {
      const approvalUrl = 'https://checkout.stripe.com/session/123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: mockTransaction,
          approvalUrl,
          message: 'Redirecting to checkout...',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(
          'pool-1',
          100,
          1,
          false
        );
      });

      expect(response.success).toBe(true);
      expect(response.approvalUrl).toBe(approvalUrl);
      expect(window.location.href).toBe(approvalUrl);
    });

    it('handles payment processing error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient funds' }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(
          'pool-1',
          100,
          1,
          false
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Insufficient funds');
    });

    it('handles network error during payment processing', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment(
          'pool-1',
          100,
          1,
          false
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });

    it('sets isProcessing state correctly during payment', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { result } = renderHook(() => usePayments({ userId }));

      expect(result.current.isProcessing).toBe(false);

      const paymentPromise = act(async () => {
        return result.current.processPayment('pool-1', 100, 1, false);
      });

      // Wait for state update
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      // Resolve the promise
      resolvePromise({ payment: mockTransaction });

      await paymentPromise;

      expect(result.current.isProcessing).toBe(false);
    });

    it('does not include scheduledDate when scheduleForLater is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: mockTransaction,
          message: 'Payment processed successfully',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      await act(async () => {
        await result.current.processPayment(
          'pool-1',
          100,
          1,
          false,
          '2024-02-01', // This should be ignored
          false,
          undefined
        );
      });

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.scheduledDate).toBeUndefined();
    });

    it('does not include escrowReleaseDate when useEscrow is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: mockTransaction,
          message: 'Payment processed successfully',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      await act(async () => {
        await result.current.processPayment(
          'pool-1',
          100,
          1,
          false,
          undefined,
          false,
          '2024-02-15' // This should be ignored
        );
      });

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody.escrowReleaseDate).toBeUndefined();
    });
  });

  describe('Release Escrow Payment', () => {
    it('releases escrow payment successfully', async () => {
      const releasedTransaction = {
        ...mockEscrowedTransaction,
        status: TransactionStatus.RELEASED,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment: releasedTransaction,
          message: 'Escrow released successfully',
        }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.releaseEscrowPayment('txn-2', 'pool-1');
      });

      expect(response.success).toBe(true);
      expect(response.payment.status).toBe(TransactionStatus.RELEASED);
      expect(response.message).toBe('Escrow released successfully');

      // Verify fetch call
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/escrow/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: 'txn-2',
          userId,
          poolId: 'pool-1',
          releaseNow: true,
        }),
      });
    });

    it('handles escrow release error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Payment not found in escrow' }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.releaseEscrowPayment('invalid-id', 'pool-1');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Payment not found in escrow');
    });

    it('handles network error during escrow release', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server unavailable'));

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.releaseEscrowPayment('txn-2', 'pool-1');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Server unavailable');
    });

    it('sets isReleasing state correctly during escrow release', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { result } = renderHook(() => usePayments({ userId }));

      expect(result.current.isReleasing).toBe(false);

      const releasePromise = act(async () => {
        return result.current.releaseEscrowPayment('txn-2', 'pool-1');
      });

      // Wait for state update
      await waitFor(() => {
        expect(result.current.isReleasing).toBe(true);
      });

      // Resolve the promise
      resolvePromise({ payment: mockEscrowedTransaction });

      await releasePromise;

      expect(result.current.isReleasing).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('handles multiple payments independently', async () => {
      const payment1 = { ...mockTransaction, id: 'txn-1' };
      const payment2 = { ...mockTransaction, id: 'txn-2', amount: 200 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ payment: payment1, message: 'Payment 1 processed' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ payment: payment2, message: 'Payment 2 processed' }),
        });

      const { result } = renderHook(() => usePayments({ userId }));

      let response1: any;
      let response2: any;

      await act(async () => {
        [response1, response2] = await Promise.all([
          result.current.processPayment('pool-1', 100, 1, false),
          result.current.processPayment('pool-2', 200, 2, false),
        ]);
      });

      expect(response1.success).toBe(true);
      expect(response1.payment.id).toBe('txn-1');
      expect(response2.success).toBe(true);
      expect(response2.payment.id).toBe('txn-2');
    });
  });

  describe('Edge Cases', () => {
    it('handles payment with zero amount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Amount must be greater than 0' }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment('pool-1', 0, 1, false);
      });

      expect(response.success).toBe(false);
    });

    it('handles payment with invalid payment method id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid payment method' }),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment('pool-1', 100, -1, false);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid payment method');
    });

    it('handles error with empty error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePayments({ userId }));

      let response: any;
      await act(async () => {
        response = await result.current.processPayment('pool-1', 100, 1, false);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Payment processing failed');
    });
  });
});
