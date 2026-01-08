/**
 * NotificationBell Component Tests
 *
 * Tests for the NotificationBell component used in the app header.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/contexts/NotificationContext';

// Mock the NotificationContext
jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
});

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => '2 hours ago'),
}));

describe('NotificationBell Component', () => {
  const mockNotifications = [
    {
      id: 1,
      message: 'Payment reminder: Your contribution is due tomorrow.',
      type: 'payment' as const,
      date: '2024-01-15T10:00:00Z',
      read: false,
    },
    {
      id: 2,
      message: 'John Doe made a payment of $50.',
      type: 'transaction' as const,
      date: '2024-01-14T15:00:00Z',
      read: true,
    },
    {
      id: 3,
      message: 'You have been invited to join "Friends Pool".',
      type: 'invite' as const,
      date: '2024-01-13T09:00:00Z',
      read: false,
    },
  ];

  const mockContextValue = {
    notifications: mockNotifications,
    unreadCount: 2,
    preferences: [],
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    togglePreference: jest.fn(),
    savePreferences: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotifications as jest.Mock).mockReturnValue(mockContextValue);
  });

  describe('Rendering', () => {
    it('renders the bell icon', () => {
      render(<NotificationBell />);

      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });

    it('shows unread count badge when there are unread notifications', () => {
      render(<NotificationBell />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show badge when unread count is 0', () => {
      (useNotifications as jest.Mock).mockReturnValue({
        ...mockContextValue,
        unreadCount: 0,
      });

      render(<NotificationBell />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('notification dropdown is closed by default', () => {
      render(<NotificationBell />);

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('opens dropdown when bell is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('closes dropdown when bell is clicked again', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      // Open - use exact match
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Close - use exact match to get the bell button, not the close button
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });

    it('closes dropdown when X button is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      await user.click(screen.getByRole('button', { name: /close notifications/i }));

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Notification List', () => {
    it('displays notification messages', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByText('Payment reminder: Your contribution is due tomorrow.')).toBeInTheDocument();
      expect(screen.getByText('John Doe made a payment of $50.')).toBeInTheDocument();
    });

    it('shows up to 5 notifications', async () => {
      const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        message: `Notification ${i + 1}`,
        type: 'system' as const,
        date: '2024-01-15T10:00:00Z',
        read: false,
      }));

      (useNotifications as jest.Mock).mockReturnValue({
        ...mockContextValue,
        notifications: manyNotifications,
        unreadCount: 10,
      });

      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      // Should only show first 5
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
      expect(screen.getByText('Notification 5')).toBeInTheDocument();
      expect(screen.queryByText('Notification 6')).not.toBeInTheDocument();
    });

    it('shows empty state when no notifications', async () => {
      (useNotifications as jest.Mock).mockReturnValue({
        ...mockContextValue,
        notifications: [],
        unreadCount: 0,
      });

      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('displays formatted timestamp', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getAllByText('2 hours ago').length).toBeGreaterThan(0);
    });
  });

  describe('Notification Styling', () => {
    it('highlights unread notifications', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      // Unread notifications should have blue background
      const unreadNotification = screen.getByText('Payment reminder: Your contribution is due tomorrow.').closest('div');
      expect(unreadNotification).toHaveClass('bg-blue-50/50');
    });

    it('does not highlight read notifications', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      // Read notification should not have blue background
      const readNotification = screen.getByText('John Doe made a payment of $50.').closest('div');
      expect(readNotification).not.toHaveClass('bg-blue-50/50');
    });
  });

  describe('Mark As Read', () => {
    it('shows mark as read button for unread notifications', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
      expect(markReadButtons.length).toBeGreaterThan(0);
    });

    it('does not show mark as read button for read notifications', async () => {
      (useNotifications as jest.Mock).mockReturnValue({
        ...mockContextValue,
        notifications: [
          {
            id: 1,
            message: 'Read notification',
            type: 'system' as const,
            date: '2024-01-15T10:00:00Z',
            read: true,
          },
        ],
        unreadCount: 0,
      });

      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
    });

    it('calls markAsRead when mark as read button is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
      await user.click(markReadButtons[0]);

      expect(mockContextValue.markAsRead).toHaveBeenCalledWith(1);
    });

    it('marks notification as read when clicking on it', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      // Click on an unread notification
      const notification = screen.getByText('Payment reminder: Your contribution is due tomorrow.').closest('div');
      if (notification) {
        await user.click(notification);
      }

      expect(mockContextValue.markAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe('Delete Notification', () => {
    it('shows delete button for all notifications', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const deleteButtons = screen.getAllByRole('button', { name: /delete notification/i });
      expect(deleteButtons.length).toBe(3);
    });

    it('calls deleteNotification when delete button is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const deleteButtons = screen.getAllByRole('button', { name: /delete notification/i });
      await user.click(deleteButtons[0]);

      expect(mockContextValue.deleteNotification).toHaveBeenCalledWith(1);
    });
  });

  describe('View All Link', () => {
    it('shows view all notifications link', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByText('View all notifications')).toBeInTheDocument();
    });

    it('links to notifications page', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const viewAllLink = screen.getByText('View all notifications');
      expect(viewAllLink.closest('a')).toHaveAttribute('href', '/notifications');
    });

    it('closes dropdown when view all is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      await user.click(screen.getByText('View all notifications'));

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Event Propagation', () => {
    it('stops propagation when mark as read is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
      await user.click(markReadButtons[0]);

      // markAsRead should be called only once (not also from the parent click)
      expect(mockContextValue.markAsRead).toHaveBeenCalledTimes(1);
    });

    it('stops propagation when delete is clicked', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const deleteButtons = screen.getAllByRole('button', { name: /delete notification/i });
      await user.click(deleteButtons[0]);

      // Should not trigger markAsRead
      expect(mockContextValue.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Badge Styling', () => {
    it('badge has correct styling for visibility', () => {
      render(<NotificationBell />);

      const badge = screen.getByText('2');
      expect(badge).toHaveClass('bg-red-500');
      expect(badge).toHaveClass('text-white');
    });
  });

  describe('Accessibility', () => {
    it('bell button has aria-label', () => {
      render(<NotificationBell />);

      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });

    it('close button has aria-label', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByRole('button', { name: /close notifications/i })).toBeInTheDocument();
    });

    it('action buttons have aria-labels', async () => {
      const user = userEvent.setup();

      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getAllByRole('button', { name: /mark as read/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /delete notification/i }).length).toBeGreaterThan(0);
    });
  });
});
