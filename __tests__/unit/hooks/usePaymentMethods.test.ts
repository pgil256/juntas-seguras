/**
 * usePaymentMethods Hook Tests
 *
 * Tests for the usePaymentMethods hook that manages payment method CRUD operations.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import { PaymentMethod, PaymentMethodFormValues } from '@/types/payment';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample payment methods
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 1,
    type: 'card',
    name: 'Visa',
    last4: '4242',
    isDefault: true,
    cardholderName: 'John Doe',
    expiryMonth: '12',
    expiryYear: '2025',
  },
  {
    id: 2,
    type: 'bank',
    name: 'Checking',
    last4: '6789',
    isDefault: false,
    accountHolderName: 'John Doe',
    accountType: 'checking',
  },
];

describe('usePaymentMethods Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('starts with loading state and empty payment methods', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    it('does not fetch when no user session exists', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses provided userId over session userId', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'session-user', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [] }),
      });

      renderHook(() => usePaymentMethods({ userId: 'custom-user-id' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/payments/methods?userId=custom-user-id');
      });
    });
  });

  describe('Fetch Payment Methods', () => {
    it('fetches payment methods successfully', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toHaveLength(2);
      expect(result.current.paymentMethods[0].last4).toBe('4242');
      expect(result.current.error).toBeNull();
    });

    it('handles fetch error correctly', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.error).toBe('Server error');
    });

    it('handles network error correctly', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });

    it('can refresh payment methods manually', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [mockPaymentMethods[0]] }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toHaveLength(1);

      // Refresh fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      await act(async () => {
        await result.current.refreshPaymentMethods();
      });

      expect(result.current.paymentMethods).toHaveLength(2);
    });
  });

  describe('Add Payment Method', () => {
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

    it('adds a payment method successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [] }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMethod: PaymentMethodFormValues = {
        type: 'card',
        cardholderName: 'Jane Doe',
        cardNumber: '4111111111111111',
        expiryMonth: '06',
        expiryYear: '2026',
        cvv: '123',
        isDefault: true,
      };

      const addedMethod = { ...mockPaymentMethods[0], id: 3 };

      // Add method call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ method: addedMethod }),
      });

      // Refresh call after add
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [addedMethod] }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.addPaymentMethod(newMethod);
      });

      expect(response.success).toBe(true);
      expect(response.method).toEqual(addedMethod);
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/methods', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    it('handles add error when not logged in', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMethod: PaymentMethodFormValues = {
        type: 'card',
        isDefault: false,
      };

      let response: any;
      await act(async () => {
        response = await result.current.addPaymentMethod(newMethod);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('You must be logged in to add a payment method');
    });

    it('handles server error when adding payment method', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [] }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMethod: PaymentMethodFormValues = {
        type: 'card',
        isDefault: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid card details' }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.addPaymentMethod(newMethod);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid card details');
    });
  });

  describe('Update Payment Method', () => {
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

    it('updates a payment method successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedValues: PaymentMethodFormValues = {
        type: 'card',
        cardholderName: 'John Updated',
        isDefault: true,
      };

      const updatedMethod = { ...mockPaymentMethods[0], cardholderName: 'John Updated' };

      // Update call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ method: updatedMethod }),
      });

      // Refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [updatedMethod, mockPaymentMethods[1]] }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.updatePaymentMethod(1, updatedValues);
      });

      expect(response.success).toBe(true);
      expect(response.method.cardholderName).toBe('John Updated');
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/methods/1', expect.objectContaining({
        method: 'PUT',
      }));
    });

    it('handles update error when not logged in', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: any;
      await act(async () => {
        response = await result.current.updatePaymentMethod(1, { type: 'card', isDefault: false });
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('You must be logged in to update a payment method');
    });
  });

  describe('Remove Payment Method', () => {
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

    it('removes a payment method successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Remove call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [mockPaymentMethods[1]] }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.removePaymentMethod(1);
      });

      expect(response.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/payments/methods?id=1&userId=user-1',
        { method: 'DELETE' }
      );
    });

    it('handles remove error when not logged in', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: any;
      await act(async () => {
        response = await result.current.removePaymentMethod(1);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('You must be logged in to remove a payment method');
    });

    it('handles server error when removing payment method', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete default payment method' }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.removePaymentMethod(1);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Cannot delete default payment method');
    });
  });

  describe('Set Default Payment Method', () => {
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

    it('sets default payment method successfully', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set default call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Refresh call
      const updatedMethods = [
        { ...mockPaymentMethods[0], isDefault: false },
        { ...mockPaymentMethods[1], isDefault: true },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: updatedMethods }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.setDefaultPaymentMethod(2);
      });

      expect(response.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/methods/2/default', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    it('handles set default error when not logged in', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: any;
      await act(async () => {
        response = await result.current.setDefaultPaymentMethod(2);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('You must be logged in to set a default payment method');
    });

    it('handles server error when setting default payment method', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Payment method not found' }),
      });

      let response: any;
      await act(async () => {
        response = await result.current.setDefaultPaymentMethod(999);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Payment method not found');
    });
  });

  describe('Session Changes', () => {
    it('refetches payment methods when session changes', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: [mockPaymentMethods[0]] }),
      });

      const { result, rerender } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toHaveLength(1);

      // Session changes to different user
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-2', email: 'other@example.com', name: 'Other User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockPaymentMethods }),
      });

      rerender();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/payments/methods?userId=user-2');
      });
    });
  });
});
