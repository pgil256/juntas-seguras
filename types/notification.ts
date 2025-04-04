export type NotificationType = 'payment' | 'transaction' | 'pool' | 'invite' | 'alert' | 'system';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  date: string;
  read: boolean;
  isImportant?: boolean;
}

export interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference[];
  getNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  togglePreference: (id: string, type: 'email' | 'push') => Promise<void>;
  savePreferences: () => Promise<void>;
}