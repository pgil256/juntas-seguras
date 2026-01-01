'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Notification, NotificationPreference, NotificationContextType } from '../types/notification';

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  preferences: [],
  getNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  togglePreference: async () => {},
  savePreferences: async () => false,
});

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  const getNotifications = async () => {
    try {
      setLoading(true);
      
      // Don't fetch if not authenticated
      if (status !== 'authenticated') {
        setNotifications([]);
        setUnreadCount(0);
        setPreferences([]);
        return;
      }

      const response = await fetch('/api/notifications');
      
      // Handle redirect responses
      if (response.redirected) {
        window.location.href = response.url;
        return;
      }

      // Check for MFA requirement
      if (response.status === 403) {
        const data = await response.json();
        if (data.requiresMfa) {
          console.log('MFA verification required for notifications - will retry after verification');
          return;
        }
      }

      const data = await response.json();
      
      if (response.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setPreferences(data.preferences);
      } else {
        console.error('Failed to fetch notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications when authentication status changes
  useEffect(() => {
    if (status === 'authenticated' || status === 'unauthenticated') {
      getNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // getNotifications is intentionally omitted to prevent infinite loops

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', id }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === id ? { ...notification, read: true } : notification
          )
        );
        setUnreadCount(prev => Math.max(prev - 1, 0));
      } else {
        console.error('Failed to mark notification as read:', data.error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
      } else {
        console.error('Failed to mark all notifications as read:', data.error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteNotification', id }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const notificationToDelete = notifications.find(n => n.id === id);
        setNotifications(prevNotifications => 
          prevNotifications.filter(notification => notification.id !== id)
        );
        
        if (notificationToDelete && !notificationToDelete.read) {
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      } else {
        console.error('Failed to delete notification:', data.error);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const togglePreference = async (id: string, type: 'email' | 'push') => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'togglePreference', id, type }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPreferences(prevPreferences => 
          prevPreferences.map(pref => 
            pref.id === id ? { ...pref, [type]: !pref[type] } : pref
          )
        );
      } else {
        console.error('Failed to toggle preference:', data.error);
      }
    } catch (error) {
      console.error('Error toggling preference:', error);
    }
  };

  const savePreferences = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'savePreferences', preferences }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to save preferences:', data.error);
      }
      
      return response.ok;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  };

  const value = {
    notifications,
    unreadCount,
    preferences,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    togglePreference,
    savePreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);