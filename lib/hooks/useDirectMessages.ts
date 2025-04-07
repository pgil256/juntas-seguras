import { useState, useEffect } from 'react';
import { PoolMessage } from '../../types/pool';

interface UseDirectMessagesProps {
  poolId: string;
  userId: string;
  memberId: number | string;
}

interface UseDirectMessagesReturn {
  messages: PoolMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<PoolMessage | null>;
  refreshMessages: () => Promise<void>;
}

export function useDirectMessages({ poolId, userId, memberId }: UseDirectMessagesProps): UseDirectMessagesReturn {
  const [messages, setMessages] = useState<PoolMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!poolId || !memberId) {
      setError('Pool ID and member ID are required');
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
      
      const response = await fetch(`/api/pools/${poolId}/members/messages?memberId=${memberId}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching direct messages:', err);
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string): Promise<PoolMessage | null> => {
    if (!poolId || !memberId) {
      setError('Pool ID and member ID are required');
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
      
      const response = await fetch(`/api/pools/${poolId}/members/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          memberId,
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
      console.error('Error sending direct message:', err);
      setError(err.message || 'Failed to send message');
      return null;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (poolId && memberId) {
      fetchMessages();
    }
  }, [poolId, userId, memberId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages: fetchMessages,
  };
}