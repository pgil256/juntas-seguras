/**
 * Unit tests for lib/hooks/useCreateNotification.ts
 * Tests notification creation functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCreateNotification, CreateNotificationParams } from '@/lib/hooks/useCreateNotification';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useCreateNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useCreateNotification());

      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createNotification).toBe('function');
    });
  });

  describe('Successful Operations', () => {
    it('should create notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, notificationId: 'notif-123' }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createNotification({
          message: 'Test notification',
          type: 'alert',
          isImportant: false,
        });
      });

      expect(createResult!).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isCreating).toBe(false);
    });

    it('should call API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      const params: CreateNotificationParams = {
        message: 'Payment received',
        type: 'payment',
        isImportant: true,
      };

      await act(async () => {
        await result.current.createNotification(params);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
    });

    it('should create notification with minimal parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      const params: CreateNotificationParams = {
        message: 'Simple notification',
        type: 'system',
      };

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createNotification(params);
      });

      expect(createResult!).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
    });

    it('should handle all notification types', async () => {
      const notificationTypes = ['payment', 'transaction', 'pool', 'invite', 'alert', 'system'] as const;

      for (const type of notificationTypes) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

        const { result } = renderHook(() => useCreateNotification());

        let createResult: boolean;
        await act(async () => {
          createResult = await result.current.createNotification({
            message: `Test ${type} notification`,
            type,
          });
        });

        expect(createResult!).toBe(true);
      }
    });
  });

  describe('Loading State', () => {
    it('should set isCreating to true during creation', async () => {
      let resolvePromise: (value: any) => void;
      const responsePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(responsePromise as Promise<Response>);

      const { result } = renderHook(() => useCreateNotification());

      let createPromise: Promise<boolean>;
      act(() => {
        createPromise = result.current.createNotification({
          message: 'Test',
          type: 'alert',
        });
      });

      // Should be loading while request is in progress
      expect(result.current.isCreating).toBe(true);

      // Resolve the request
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true }),
        });
        await createPromise;
      });

      // Should no longer be loading
      expect(result.current.isCreating).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid notification type' }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createNotification({
          message: 'Test',
          type: 'alert',
        });
      });

      expect(createResult!).toBe(false);
      expect(result.current.error).toBe('Invalid notification type');
    });

    it('should use default error message when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createNotification({
          message: 'Test',
          type: 'alert',
        });
      });

      expect(createResult!).toBe(false);
      expect(result.current.error).toBe('Failed to create notification');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCreateNotification());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createNotification({
          message: 'Test',
          type: 'alert',
        });
      });

      expect(createResult!).toBe(false);
      expect(result.current.error).toBe('An error occurred while creating the notification');
    });

    it('should clear error on successful creation after error', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      await act(async () => {
        await result.current.createNotification({
          message: 'Test',
          type: 'alert',
        });
      });

      expect(result.current.error).toBe('Server error');

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await act(async () => {
        await result.current.createNotification({
          message: 'Test 2',
          type: 'alert',
        });
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear error at the start of new creation', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      await act(async () => {
        await result.current.createNotification({
          message: 'Test',
          type: 'alert',
        });
      });

      expect(result.current.error).toBe('Server error');

      // Setup pending promise for second request
      let resolvePromise: (value: any) => void;
      const responsePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(responsePromise as Promise<Response>);

      // Start second request
      act(() => {
        result.current.createNotification({
          message: 'Test 2',
          type: 'alert',
        });
      });

      // Error should be cleared at start of new request
      expect(result.current.error).toBeNull();

      // Clean up
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true }),
        });
      });
    });
  });

  describe('Multiple Creations', () => {
    it('should handle multiple sequential creations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      let result1: boolean;
      let result2: boolean;
      let result3: boolean;

      await act(async () => {
        result1 = await result.current.createNotification({
          message: 'Notification 1',
          type: 'payment',
        });
      });

      await act(async () => {
        result2 = await result.current.createNotification({
          message: 'Notification 2',
          type: 'transaction',
        });
      });

      await act(async () => {
        result3 = await result.current.createNotification({
          message: 'Notification 3',
          type: 'pool',
        });
      });

      expect(result1!).toBe(true);
      expect(result2!).toBe(true);
      expect(result3!).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Return Value Types', () => {
    it('should expose all expected properties and methods', () => {
      const { result } = renderHook(() => useCreateNotification());

      expect(result.current).toHaveProperty('createNotification');
      expect(result.current).toHaveProperty('isCreating');
      expect(result.current).toHaveProperty('error');
      expect(typeof result.current.createNotification).toBe('function');
      expect(typeof result.current.isCreating).toBe('boolean');
    });
  });

  describe('isImportant Flag', () => {
    it('should include isImportant when set to true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      await act(async () => {
        await result.current.createNotification({
          message: 'Important notification',
          type: 'alert',
          isImportant: true,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Important notification',
          type: 'alert',
          isImportant: true,
        }),
      });
    });

    it('should include isImportant when set to false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useCreateNotification());

      await act(async () => {
        await result.current.createNotification({
          message: 'Normal notification',
          type: 'system',
          isImportant: false,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Normal notification',
          type: 'system',
          isImportant: false,
        }),
      });
    });
  });
});
