import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PoolMessage } from '../../types/pool';

interface UsePoolMessagesProps {
  poolId: string;
}

interface UsePoolMessagesReturn {
  messages: PoolMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<PoolMessage | null>;
  deleteMessage: (messageId: number | string) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

export function usePoolMessages({ poolId }: UsePoolMessagesProps): UsePoolMessagesReturn {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<PoolMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    if (status === 'unauthenticated') {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    if (status === 'loading') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/messages`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [poolId, status]);

  const sendMessage = async (content: string): Promise<PoolMessage | null> => {
    if (!poolId) {
      setError('Pool ID is required');
      return null;
    }

    if (!content || content.trim() === '') {
      setError('Message content cannot be empty');
      return null;
    }

    try {
      const response = await fetch(`/api/pools/${poolId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          poolId,
          content
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      const data = await response.json();
      
      // Add the new message to the state
      setMessages(prevMessages => [...prevMessages, data.message]);
      return data.message;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      return null;
    }
  };

  /**
   * Delete a message by ID
   * Accepts either the MongoDB _id string or the legacy numeric id
   * For more reliable deletion, prefer using the _id if available
   */
  const deleteMessage = async (messageId: number | string): Promise<boolean> => {
    if (!poolId) {
      setError('Pool ID is required');
      return false;
    }

    try {
      // Find the message to get its _id if we have a numeric id
      const message = messages.find(m =>
        m.id === messageId || m._id === messageId
      );

      // Prefer using MongoDB _id for more reliable deletion
      const idToDelete = message?._id || messageId.toString();

      const response = await fetch(`/api/pools/${poolId}/messages?messageId=${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }

      // Remove the message from the state (check both id types)
      setMessages(prevMessages => prevMessages.filter(m =>
        m.id !== messageId && m._id !== messageId
      ));
      return true;
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setError(err.message || 'Failed to delete message');
      return false;
    }
  };

  // Handle edge cases and fetch when ready
  useEffect(() => {
    // Handle missing poolId
    if (!poolId && status !== 'loading') {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    // Handle unauthenticated status
    if (status === 'unauthenticated') {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    // Fetch messages when authenticated with valid poolId
    if (poolId && status === 'authenticated') {
      fetchMessages();
    }
  }, [poolId, status, fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    deleteMessage,
    refreshMessages: fetchMessages,
  };
}