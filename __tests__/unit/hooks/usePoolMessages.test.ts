/**
 * Unit tests for lib/hooks/usePoolMessages.ts
 * Tests the usePoolMessages hook for pool-wide messaging with session authentication
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePoolMessages } from '@/lib/hooks/usePoolMessages';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('usePoolMessages', () => {
  const defaultProps = {
    poolId: 'pool-123',
  };

  const authenticatedSession = {
    data: {
      user: { email: 'test@example.com', name: 'Test User', id: 'user-123' },
      expires: '2025-12-31',
    },
    status: 'authenticated' as const,
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return loading state initially when authenticated', () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should have sendMessage, deleteMessage, and refreshMessages functions', () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.deleteMessage).toBe('function');
      expect(typeof result.current.refreshMessages).toBe('function');
    });

    it('should return loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should return error when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Authentication required');
      expect(result.current.messages).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not fetch when session status is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      renderHook(() => usePoolMessages(defaultProps));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch when session becomes authenticated', async () => {
      const { rerender } = renderHook(() => usePoolMessages(defaultProps));

      // Start with loading session
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Update to authenticated
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      rerender();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Validation', () => {
    it('should return error when poolId is missing', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);

      const { result } = renderHook(() => usePoolMessages({ poolId: '' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool ID is required');
      expect(result.current.messages).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Fetching Messages', () => {
    it('should fetch messages successfully when authenticated', async () => {
      const mockMessages = [
        { id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01T00:00:00Z' },
        { id: 2, author: 'User 2', content: 'Hi there', date: '2025-01-01T00:01:00Z' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toEqual(mockMessages);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/pools/${defaultProps.poolId}/messages`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle empty messages array', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle null messages from API', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: null }),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toEqual([]);
    });

    it('should handle undefined messages from API', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors with error message', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Pool not found' }),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool not found');
      expect(result.current.messages).toEqual([]);
    });

    it('should handle API errors without error message', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch messages');
    });

    it('should handle network errors', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.messages).toEqual([]);
    });

    it('should handle errors without message property', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockRejectedValueOnce({});

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch messages');
    });
  });

  describe('Sending Messages', () => {
    it('should send message successfully', async () => {
      const mockMessages = [
        { id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01T00:00:00Z' },
      ];
      const newMessage = {
        id: 2,
        author: 'Test User',
        content: 'Test message',
        date: '2025-01-01T00:01:00Z',
      };

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: newMessage }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('Test message');
      });

      expect(sentMessage).toEqual(newMessage);
      expect(result.current.messages).toContainEqual(newMessage);
      expect(result.current.messages).toHaveLength(2);

      // Verify send request
      expect(mockFetch).toHaveBeenLastCalledWith(
        `/api/pools/${defaultProps.poolId}/messages`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            poolId: defaultProps.poolId,
            content: 'Test message',
          }),
        })
      );
    });

    it('should return null when poolId is missing', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);

      const { result } = renderHook(() => usePoolMessages({ poolId: '' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('Test');
      });

      expect(sentMessage).toBeNull();
      expect(result.current.error).toBe('Pool ID is required');
    });

    it('should return null when content is empty', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('');
      });

      expect(sentMessage).toBeNull();
      expect(result.current.error).toBe('Message content cannot be empty');
    });

    it('should return null when content is whitespace only', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('   ');
      });

      expect(sentMessage).toBeNull();
      expect(result.current.error).toBe('Message content cannot be empty');
    });

    it('should handle send message API error', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Failed to send message' }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('Test message');
      });

      expect(sentMessage).toBeNull();
      expect(result.current.error).toBe('Failed to send message');
    });

    it('should handle send message network error', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [] }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('Test message');
      });

      expect(sentMessage).toBeNull();
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Deleting Messages', () => {
    it('should delete message by id successfully', async () => {
      const mockMessages = [
        { id: 1, _id: 'mongo-1', author: 'User 1', content: 'Hello', date: '2025-01-01' },
        { id: 2, _id: 'mongo-2', author: 'User 2', content: 'Hi', date: '2025-01-01' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMessage(1);
      });

      expect(deleted).toBe(true);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages.find((m) => m.id === 1)).toBeUndefined();
    });

    it('should delete message by _id successfully', async () => {
      const mockMessages = [
        { id: 1, _id: 'mongo-1', author: 'User 1', content: 'Hello', date: '2025-01-01' },
        { id: 2, _id: 'mongo-2', author: 'User 2', content: 'Hi', date: '2025-01-01' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMessage('mongo-2');
      });

      expect(deleted).toBe(true);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages.find((m) => m._id === 'mongo-2')).toBeUndefined();

      // Verify _id was used in the API call
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('messageId=mongo-2'),
        expect.any(Object)
      );
    });

    it('should prefer MongoDB _id when deleting by numeric id', async () => {
      const mockMessages = [
        { id: 1, _id: 'mongo-1', author: 'User 1', content: 'Hello', date: '2025-01-01' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteMessage(1);
      });

      // Verify _id was used instead of numeric id
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('messageId=mongo-1'),
        expect.any(Object)
      );
    });

    it('should use messageId as string when message not found in state', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteMessage(999);
      });

      // Should convert numeric id to string
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('messageId=999'),
        expect.any(Object)
      );
    });

    it('should return false when poolId is missing', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);

      const { result } = renderHook(() => usePoolMessages({ poolId: '' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMessage(1);
      });

      expect(deleted).toBe(false);
      expect(result.current.error).toBe('Pool ID is required');
    });

    it('should handle delete API error', async () => {
      const mockMessages = [
        { id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Permission denied' }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMessage(1);
      });

      expect(deleted).toBe(false);
      expect(result.current.error).toBe('Permission denied');
      // Message should still be in state since delete failed
      expect(result.current.messages).toHaveLength(1);
    });

    it('should handle delete network error', async () => {
      const mockMessages = [
        { id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMessage(1);
      });

      expect(deleted).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should use DELETE method for message deletion', async () => {
      const mockMessages = [
        { id: 1, _id: 'mongo-1', author: 'User 1', content: 'Hello', date: '2025-01-01' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteMessage(1);
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  describe('Refreshing Messages', () => {
    it('should refresh messages when refreshMessages is called', async () => {
      const initialMessages = [
        { id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01' },
      ];
      const updatedMessages = [
        { id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01' },
        { id: 2, author: 'User 2', content: 'New message', date: '2025-01-02' },
      ];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: initialMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: updatedMessages }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.messages).toEqual(initialMessages);
      });

      await act(async () => {
        await result.current.refreshMessages();
      });

      expect(result.current.messages).toEqual(updatedMessages);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear error when refreshMessages succeeds', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Initial error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [] }),
        });

      const { result } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      await act(async () => {
        await result.current.refreshMessages();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Props Changes', () => {
    it('should re-fetch when poolId changes', async () => {
      const messages1 = [{ id: 1, author: 'User 1', content: 'Pool 1', date: '2025-01-01' }];
      const messages2 = [{ id: 2, author: 'User 2', content: 'Pool 2', date: '2025-01-02' }];

      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: messages1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: messages2 }),
        });

      const { result, rerender } = renderHook(
        ({ poolId }) => usePoolMessages({ poolId }),
        { initialProps: { poolId: 'pool-1' } }
      );

      await waitFor(() => {
        expect(result.current.messages).toEqual(messages1);
      });

      rerender({ poolId: 'pool-2' });

      await waitFor(() => {
        expect(result.current.messages).toEqual(messages2);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/pools/pool-1/messages', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/pools/pool-2/messages', expect.any(Object));
    });

    it('should re-fetch when session status changes to authenticated', async () => {
      const messages = [{ id: 1, author: 'User 1', content: 'Hello', date: '2025-01-01' }];

      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePoolMessages(defaultProps));

      await waitFor(() => {
        expect(result.current.error).toBe('Authentication required');
      });

      // Change to authenticated
      mockUseSession.mockReturnValue(authenticatedSession);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages }),
      });

      rerender();

      await waitFor(() => {
        expect(result.current.messages).toEqual(messages);
      });
    });
  });
});
