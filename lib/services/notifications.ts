import mongoose from 'mongoose';
import connect from '../db/connect';

export type NotificationType = 'payment' | 'transaction' | 'pool' | 'invite' | 'alert' | 'system';

export interface CreateNotificationParams {
  userId: string;
  message: string;
  type: NotificationType;
  isImportant?: boolean;
}

export interface CreateBulkNotificationParams {
  userIds: string[];
  message: string;
  type: NotificationType;
  isImportant?: boolean;
}

/**
 * Create a notification for a single user
 */
export async function createNotification({
  userId,
  message,
  type,
  isImportant = false,
}: CreateNotificationParams): Promise<boolean> {
  try {
    await connect();

    const db = mongoose.connection.db;
    if (!db) {
      console.error('Database not connected');
      return false;
    }

    const notificationsCollection = db.collection('notifications');

    const notification = {
      id: Date.now(),
      userId,
      message,
      type,
      isImportant,
      date: new Date().toISOString(),
      read: false,
    };

    await notificationsCollection.insertOne(notification);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

/**
 * Create notifications for multiple users (e.g., all pool members)
 */
export async function createBulkNotifications({
  userIds,
  message,
  type,
  isImportant = false,
}: CreateBulkNotificationParams): Promise<boolean> {
  try {
    await connect();

    const db = mongoose.connection.db;
    if (!db) {
      console.error('Database not connected');
      return false;
    }

    const notificationsCollection = db.collection('notifications');
    const now = new Date().toISOString();

    const notifications = userIds.map((userId, index) => ({
      id: Date.now() + index,
      userId,
      message,
      type,
      isImportant,
      date: now,
      read: false,
    }));

    if (notifications.length > 0) {
      await notificationsCollection.insertMany(notifications);
    }

    return true;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return false;
  }
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  // Payment notifications
  paymentReceived: (poolName: string, amount: number, memberName: string) =>
    `${memberName} contributed $${amount} to ${poolName}.`,

  paymentDue: (poolName: string, amount: number, daysUntil: number) =>
    daysUntil === 0
      ? `Your payment of $${amount} for ${poolName} is due today.`
      : `Your payment of $${amount} for ${poolName} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,

  paymentOverdue: (poolName: string, amount: number) =>
    `Your payment of $${amount} for ${poolName} is overdue. Please pay as soon as possible.`,

  // Payout notifications
  payoutReceived: (poolName: string, amount: number) =>
    `You received a payout of $${amount} from ${poolName}!`,

  payoutProcessed: (poolName: string, recipientName: string, amount: number) =>
    `Payout of $${amount} was sent to ${recipientName} from ${poolName}.`,

  payoutUpcoming: (poolName: string, daysUntil: number) =>
    `Your payout from ${poolName} is coming in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}!`,

  // Pool notifications
  poolCreated: (poolName: string) =>
    `Your pool "${poolName}" has been created. Invite members to get started!`,

  poolStarted: (poolName: string) =>
    `${poolName} has started! The first round is now active.`,

  poolCompleted: (poolName: string) =>
    `Congratulations! ${poolName} has completed all rounds.`,

  newRoundStarted: (poolName: string, roundNumber: number, totalRounds: number) =>
    `Round ${roundNumber} of ${totalRounds} has started in ${poolName}.`,

  allContributionsReceived: (poolName: string) =>
    `All contributions have been received for ${poolName}. Payout will be processed soon.`,

  // Member notifications
  memberJoined: (poolName: string, memberName: string) =>
    `${memberName} joined ${poolName}.`,

  memberLeft: (poolName: string, memberName: string) =>
    `${memberName} left ${poolName}.`,

  // Invitation notifications
  invitationReceived: (poolName: string, inviterName: string) =>
    `${inviterName} invited you to join ${poolName}.`,

  invitationAccepted: (poolName: string, memberName: string) =>
    `${memberName} accepted your invitation to ${poolName}.`,

  invitationDeclined: (poolName: string, memberName: string) =>
    `${memberName} declined your invitation to ${poolName}.`,

  // System notifications
  welcomeMessage: (userName: string) =>
    `Welcome to Juntas, ${userName}! Create your first savings pool to get started.`,

  profileUpdated: () =>
    `Your profile has been updated successfully.`,

  securityAlert: (action: string) =>
    `Security alert: ${action}. If this wasn't you, please contact support immediately.`,
};

/**
 * Helper to notify all pool members
 */
export async function notifyPoolMembers(
  poolId: string,
  memberEmails: string[],
  message: string,
  type: NotificationType,
  excludeEmail?: string,
  isImportant = false
): Promise<boolean> {
  const userIds = memberEmails.filter(email => email !== excludeEmail);

  if (userIds.length === 0) return true;

  return createBulkNotifications({
    userIds,
    message,
    type,
    isImportant,
  });
}

/**
 * Helper to notify pool creator
 */
export async function notifyPoolCreator(
  creatorEmail: string,
  message: string,
  type: NotificationType,
  isImportant = false
): Promise<boolean> {
  return createNotification({
    userId: creatorEmail,
    message,
    type,
    isImportant,
  });
}
