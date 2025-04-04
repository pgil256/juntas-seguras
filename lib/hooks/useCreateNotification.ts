'use client';

import { useState } from 'react';
import { NotificationType } from '@/types/notification';

export interface CreateNotificationParams {
  message: string;
  type: NotificationType;
  isImportant?: boolean;
}

interface UseCreateNotificationReturn {
  createNotification: (params: CreateNotificationParams) => Promise<boolean>;
  isCreating: boolean;
  error: string | null;
}

export const useCreateNotification = (): UseCreateNotificationReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNotification = async (params: CreateNotificationParams): Promise<boolean> => {
    try {
      setIsCreating(true);
      setError(null);
      
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to create notification');
        return false;
      }
      
      return true;
    } catch (error) {
      setError('An error occurred while creating the notification');
      console.error('Error creating notification:', error);
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createNotification,
    isCreating,
    error,
  };
};