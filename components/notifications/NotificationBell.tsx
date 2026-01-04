'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, X, CheckCircle2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/button';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  // Handle marking a notification as read
  const handleMarkAsRead = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the notification click event
    markAsRead(id);
  };

  // Handle deleting a notification
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the notification click event
    deleteNotification(id);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors h-10 w-10 flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 bottom-auto sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white rounded-lg shadow-lg ring-1 ring-black/5 overflow-hidden z-50">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full p-1.5 transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <p className="text-sm text-gray-800 leading-relaxed">{notification.message}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      {formatDate(notification.date)}
                    </p>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-100"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          aria-label="Mark as read"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => handleDelete(notification.id, e)}
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">
                No notifications
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100">
            <Link
              href="/notifications"
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};