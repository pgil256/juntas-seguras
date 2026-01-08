import { faker } from '@faker-js/faker';
import { Notification, NotificationType, NotificationPreference } from '../../types/notification';

/**
 * Notification test fixture factory
 * Creates mock notification data for testing purposes
 */

/**
 * Creates a test notification with optional overrides
 */
export const createTestNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification => ({
  id: faker.number.int({ min: 1, max: 999999 }),
  message: faker.lorem.sentence(),
  type: 'system' as NotificationType,
  date: new Date().toISOString(),
  read: false,
  isImportant: false,
  userId,
  ...overrides,
});

/**
 * Creates a payment notification
 */
export const createPaymentNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification =>
  createTestNotification(userId, {
    type: 'payment',
    message: 'Payment reminder: Your contribution of $50 is due in 2 days.',
    isImportant: true,
    ...overrides,
  });

/**
 * Creates a transaction notification
 */
export const createTransactionNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification =>
  createTestNotification(userId, {
    type: 'transaction',
    message: 'John Doe made a payment of $50 to the pool.',
    ...overrides,
  });

/**
 * Creates a pool update notification
 */
export const createPoolNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification =>
  createTestNotification(userId, {
    type: 'pool',
    message: 'Pool status has been updated to Active.',
    ...overrides,
  });

/**
 * Creates an invitation notification
 */
export const createInviteNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification =>
  createTestNotification(userId, {
    type: 'invite',
    message: 'You have been invited to join "Family Savings Pool".',
    isImportant: true,
    ...overrides,
  });

/**
 * Creates an alert notification
 */
export const createAlertNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification =>
  createTestNotification(userId, {
    type: 'alert',
    message: 'Alert: A member has missed their scheduled payment.',
    isImportant: true,
    ...overrides,
  });

/**
 * Creates a system notification
 */
export const createSystemNotification = (
  userId: string,
  overrides: Partial<Notification> = {}
): Notification =>
  createTestNotification(userId, {
    type: 'system',
    message: 'System maintenance scheduled for this weekend.',
    ...overrides,
  });

/**
 * Creates a notification preference with optional overrides
 */
export const createTestPreference = (
  overrides: Partial<NotificationPreference> = {}
): NotificationPreference => ({
  id: `pref_${faker.string.alphanumeric(8)}`,
  label: faker.lorem.words(2),
  description: faker.lorem.sentence(),
  email: true,
  push: true,
  ...overrides,
});

/**
 * Pre-defined notification preferences for testing
 */
export const defaultNotificationPreferences: NotificationPreference[] = [
  {
    id: 'email_payment',
    label: 'Payment Reminders',
    description: 'Get notified before payments are due',
    email: true,
    push: true,
  },
  {
    id: 'email_transaction',
    label: 'Transactions',
    description: 'When members make deposits or receive payouts',
    email: true,
    push: true,
  },
  {
    id: 'email_pool',
    label: 'Pool Updates',
    description: 'Changes to pool status or information',
    email: false,
    push: true,
  },
  {
    id: 'email_invite',
    label: 'New Invitations',
    description: "When you're invited to join a pool",
    email: true,
    push: true,
  },
  {
    id: 'email_missed',
    label: 'Missed Payments',
    description: 'When a member misses a scheduled payment',
    email: true,
    push: true,
  },
];

/**
 * Pre-defined test notifications for consistent testing
 */
export const testNotifications = {
  paymentDue: (userId: string) =>
    createPaymentNotification(userId, {
      message: 'Payment reminder: Your contribution of $50 is due tomorrow.',
    }),

  paymentOverdue: (userId: string) =>
    createPaymentNotification(userId, {
      message: 'Payment overdue: Your contribution of $50 was due 2 days ago.',
      isImportant: true,
    }),

  paymentReceived: (userId: string) =>
    createTransactionNotification(userId, {
      message: 'Payment received: $50 from John Doe.',
    }),

  payoutCompleted: (userId: string) =>
    createTransactionNotification(userId, {
      message: 'Payout completed: $250 sent to Jane Smith.',
    }),

  poolStarted: (userId: string) =>
    createPoolNotification(userId, {
      message: 'Your pool "Family Savings" has started! Round 1 begins now.',
    }),

  poolPaused: (userId: string) =>
    createPoolNotification(userId, {
      message: 'Pool "Family Savings" has been paused by the admin.',
    }),

  poolCompleted: (userId: string) =>
    createPoolNotification(userId, {
      message: 'Congratulations! Your pool "Family Savings" has completed all rounds.',
    }),

  inviteReceived: (userId: string) =>
    createInviteNotification(userId, {
      message: 'You have been invited to join "Neighborhood Pool" by John Doe.',
    }),

  missedPayment: (userId: string) =>
    createAlertNotification(userId, {
      message: 'Alert: Jane Smith has missed their payment for Round 3.',
    }),

  securityAlert: (userId: string) =>
    createAlertNotification(userId, {
      message: 'Security alert: New login detected from a new device.',
    }),

  systemMaintenance: (userId: string) =>
    createSystemNotification(userId, {
      message: 'Scheduled maintenance: The app will be briefly unavailable on Sunday at 2 AM.',
    }),

  welcomeMessage: (userId: string) =>
    createSystemNotification(userId, {
      message: 'Welcome to My Juntas! Complete your profile to get started.',
    }),
};

/**
 * Generate multiple random test notifications
 */
export const generateTestNotifications = (
  count: number,
  userId: string
): Notification[] =>
  Array.from({ length: count }, () => createTestNotification(userId));

/**
 * Generate notifications of mixed types
 */
export const generateMixedNotifications = (userId: string): Notification[] => [
  createPaymentNotification(userId),
  createTransactionNotification(userId),
  createPoolNotification(userId),
  createInviteNotification(userId),
  createAlertNotification(userId),
  createSystemNotification(userId),
];

/**
 * Generate unread and read notifications
 */
export const generateReadUnreadNotifications = (
  userId: string
): { unread: Notification[]; read: Notification[] } => ({
  unread: [
    createPaymentNotification(userId, { read: false }),
    createTransactionNotification(userId, { read: false }),
    createInviteNotification(userId, { read: false }),
  ],
  read: [
    createPoolNotification(userId, { read: true }),
    createSystemNotification(userId, { read: true }),
  ],
});

/**
 * Notification type labels for display
 */
export const notificationTypeLabels: Record<NotificationType, string> = {
  payment: 'Payment',
  transaction: 'Transaction',
  pool: 'Pool Update',
  invite: 'Invitation',
  alert: 'Alert',
  system: 'System',
};

/**
 * Notification type icons for display (using emoji for testing)
 */
export const notificationTypeIcons: Record<NotificationType, string> = {
  payment: '💰',
  transaction: '💸',
  pool: '🏊',
  invite: '📧',
  alert: '⚠️',
  system: '🔔',
};
