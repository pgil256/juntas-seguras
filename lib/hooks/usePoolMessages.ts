import { useState, useEffect } from 'react';
import { PoolMessage } from '../../types/pool';

interface UsePoolMessagesProps {
  poolId: string;
  userId: string;
}

interface UsePoolMessagesReturn {
  messages: PoolMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<PoolMessage | null>;
  deleteMessage: (messageId: number) => Promise<boolean>;
  refreshMessages: () => Promise<void>;
}

export function usePoolMessages({ poolId, userId }: UsePoolMessagesProps): UsePoolMessagesReturn {
  const [messages, setMessages] = useState<PoolMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!poolId) {
      setError('Pool ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const headers: HeadersInit = {};
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/messages`, {
        headers
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
  };

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
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/messages`, {
        method: 'POST',
        headers,
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

  const deleteMessage = async (messageId: number): Promise<boolean> => {
    if (!poolId) {
      setError('Pool ID is required');
      return false;
    }

    try {
      const headers: HeadersInit = {};
      if (userId) {
        headers['user-id'] = userId;
      }
      
      const response = await fetch(`/api/pools/${poolId}/messages?messageId=${messageId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }
      
      // Remove the message from the state
      setMessages(prevMessages => prevMessages.filter(m => m.id !== messageId));
      return true;
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setError(err.message || 'Failed to delete message');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (poolId) {
      fetchMessages();
    }
  }, [poolId, userId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    deleteMessage,
    refreshMessages: fetchMessages,
  };
}