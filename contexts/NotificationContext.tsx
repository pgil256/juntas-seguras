'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  savePreferences: async () => {},
});

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
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

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', id }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
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
        // Update local state
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
        // Update local state
        const notificationToDelete = notifications.find(n => n.id === id);
        setNotifications(prevNotifications => 
          prevNotifications.filter(notification => notification.id !== id)
        );
        
        // Update unread count if the deleted notification was unread
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
        // Update local state
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

  // Fetch notifications when component mounts
  useEffect(() => {
    getNotifications();
  }, []);

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