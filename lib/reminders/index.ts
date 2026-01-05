/**
 * Reminder System Module
 *
 * This module provides a complete reminder system for the Juntas Seguras application.
 * It handles scheduling, sending, and tracking reminders for pool events.
 *
 * Components:
 * - scheduler.ts: Identifies which reminders need to be sent
 * - sender.ts: Sends reminders through email, SMS, push, or in-app channels
 *
 * Database Models (in lib/db/models/):
 * - reminder.ts: ReminderSchedule and SentReminder models
 * - notificationPreference.ts: User notification preferences
 *
 * Usage:
 * 1. Reminders are automatically created when a pool is created
 * 2. The cron endpoint (/api/cron/reminders) processes pending reminders
 * 3. Users can customize their notification preferences
 *
 * Cron Setup (Vercel Hobby - once daily):
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reminders",
 *     "schedule": "0 8 * * *"  // 8 AM UTC daily
 *   }]
 * }
 *
 * For Vercel Pro (hourly), change REMINDER_WINDOW_HOURS to 1 in scheduler.ts
 */

// Re-export scheduler functions
export {
  getPendingReminders,
  createDefaultReminderSchedules,
  getReminderStats,
  type PendingReminder,
} from './scheduler';

// Re-export sender functions
export {
  processReminders,
  retryFailedReminders,
} from './sender';

// Re-export model types and enums
export {
  ReminderType,
  ReminderChannel,
  TimingUnit,
  calculateReminderSendTime,
  getReminderScheduleModel,
  getSentReminderModel,
  ReminderSchedule,
  SentReminder,
  type ReminderScheduleDocument,
  type SentReminderDocument,
} from '../db/models/reminder';

export {
  NotificationFrequency,
  getNotificationPreferenceModel,
  NotificationPreference,
  isPoolMuted,
  isInQuietHours,
  getEffectiveChannels,
  createDefaultPreferences,
  type NotificationPreferenceDocument,
} from '../db/models/notificationPreference';
