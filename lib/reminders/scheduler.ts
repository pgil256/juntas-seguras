import mongoose from 'mongoose';
import connectToDatabase from '../db/connect';
import getPoolModel from '../db/models/pool';
import {
  getReminderScheduleModel,
  getSentReminderModel,
  ReminderType,
  ReminderChannel,
  TimingUnit,
  calculateReminderSendTime,
  ReminderScheduleDocument,
  SentReminderDocument,
} from '../db/models/reminder';
import {
  getNotificationPreferenceModel,
  isPoolMuted,
  isInQuietHours,
  getEffectiveChannels,
  NotificationPreferenceDocument,
} from '../db/models/notificationPreference';

/**
 * ReminderScheduler - Identifies which reminders need to be sent
 *
 * This module is responsible for:
 * 1. Finding pools with upcoming events (payment due dates, payouts, etc.)
 * 2. Checking reminder schedules for those pools
 * 3. Identifying which users need reminders based on their preferences
 * 4. Creating pending reminder records for the sender to process
 *
 * Note: Designed for Vercel Hobby plan's once-per-day cron limit.
 * Uses a 24-hour window to catch all reminders that should be sent today.
 */

// Interface for a pending reminder that needs to be sent
export interface PendingReminder {
  scheduleId: mongoose.Types.ObjectId;
  poolId: string;
  poolName: string;
  userId: mongoose.Types.ObjectId;
  memberName: string;
  memberEmail: string;
  type: ReminderType;
  round?: number;
  channel: ReminderChannel;
  eventDate: Date;
  customSubject?: string;
  customMessage?: string;
  // Pool context for message templates
  contributionAmount: number;
  frequency: string;
  recipientPosition?: number;
}

// Window for checking reminders (24 hours for daily cron on Hobby plan)
// For Pro plan with hourly cron, this could be reduced to 1
const REMINDER_WINDOW_HOURS = 24;

/**
 * Get all pending reminders that need to be sent
 * This is the main entry point for the scheduler
 */
export async function getPendingReminders(): Promise<PendingReminder[]> {
  await connectToDatabase();

  const pendingReminders: PendingReminder[] = [];

  // Get payment due reminders
  const paymentDueReminders = await getPaymentDueReminders();
  pendingReminders.push(...paymentDueReminders);

  // Get payout coming reminders
  const payoutReminders = await getPayoutComingReminders();
  pendingReminders.push(...payoutReminders);

  // Get overdue payment reminders
  const overdueReminders = await getOverduePaymentReminders();
  pendingReminders.push(...overdueReminders);

  return pendingReminders;
}

/**
 * Get reminders for upcoming payment due dates
 */
async function getPaymentDueReminders(): Promise<PendingReminder[]> {
  const PoolModel = getPoolModel();
  const ReminderSchedule = getReminderScheduleModel();
  const SentReminder = getSentReminderModel();
  const NotificationPreference = getNotificationPreferenceModel();

  const reminders: PendingReminder[] = [];
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  // Find all active pools
  const pools = await PoolModel.find({ status: 'active' });

  for (const pool of pools) {
    // Get payment due schedules for this pool
    const schedules = await ReminderSchedule.find({
      poolId: pool.id,
      type: ReminderType.PAYMENT_DUE,
      isActive: true,
    });

    if (schedules.length === 0) continue;

    // Calculate the next payment due date from the pool's nextPayoutDate
    // In this app, payments are due before the payout date
    const payoutDate = pool.nextPayoutDate ? new Date(pool.nextPayoutDate) : null;
    if (!payoutDate) continue;

    // Payment is typically due the day before payout (24 hours before)
    const paymentDueDate = new Date(payoutDate.getTime() - 24 * 60 * 60 * 1000);

    for (const schedule of schedules) {
      // Calculate when this reminder should be sent
      const reminderSendTime = calculateReminderSendTime(
        paymentDueDate,
        schedule.timingValue,
        schedule.timingUnit
      );

      // Check if the reminder should be sent within our window
      if (reminderSendTime < now || reminderSendTime > windowEnd) {
        continue;
      }

      // Get members who need this reminder (exclude admin and those who already paid)
      for (const member of pool.members) {
        // Skip if no userId (not a registered user)
        if (!member.userId) continue;

        // Skip if member already received payout (they're done for this cycle)
        if (member.payoutReceived || member.hasReceivedPayout) continue;

        // Skip the recipient of this round's payout (they don't pay this round)
        const currentRecipient = pool.members.find((m: { status: string }) => m.status === 'current');
        if (currentRecipient && currentRecipient.userId?.toString() === member.userId.toString()) {
          continue;
        }

        // Check if member already paid for this round
        const memberPayment = pool.currentRoundPayments?.find(
          (p: { memberId: number; status: string }) => p.memberId === member.id &&
            (p.status === 'admin_verified' || p.status === 'member_confirmed')
        );
        if (memberPayment) continue;

        // Check user's notification preferences
        const preferences = await NotificationPreference.findOne({ userId: member.userId });

        // Check if pool is muted
        if (preferences && isPoolMuted(preferences as NotificationPreferenceDocument, pool.id)) {
          continue;
        }

        // Get effective channels for this reminder type
        const channels = preferences
          ? getEffectiveChannels(preferences as NotificationPreferenceDocument, ReminderType.PAYMENT_DUE)
          : [ReminderChannel.EMAIL]; // Default to email if no preferences

        if (channels.length === 0) continue;

        // Check quiet hours (skip if in quiet hours)
        if (preferences && isInQuietHours(preferences as NotificationPreferenceDocument)) {
          continue;
        }

        // Check if reminder was already sent
        for (const channel of channels) {
          const existingReminder = await SentReminder.findOne({
            scheduleId: schedule._id,
            userId: member.userId,
            eventDate: paymentDueDate,
            channel,
          });

          if (!existingReminder) {
            reminders.push({
              scheduleId: schedule._id as mongoose.Types.ObjectId,
              poolId: pool.id,
              poolName: pool.name,
              userId: member.userId,
              memberName: member.name,
              memberEmail: member.email,
              type: ReminderType.PAYMENT_DUE,
              round: pool.currentRound,
              channel,
              eventDate: paymentDueDate,
              customSubject: schedule.customSubject,
              customMessage: schedule.customMessage,
              contributionAmount: pool.contributionAmount,
              frequency: pool.frequency,
              recipientPosition: currentRecipient?.position,
            });
          }
        }
      }
    }
  }

  return reminders;
}

/**
 * Get reminders for upcoming payouts
 */
async function getPayoutComingReminders(): Promise<PendingReminder[]> {
  const PoolModel = getPoolModel();
  const ReminderSchedule = getReminderScheduleModel();
  const SentReminder = getSentReminderModel();
  const NotificationPreference = getNotificationPreferenceModel();

  const reminders: PendingReminder[] = [];
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const pools = await PoolModel.find({ status: 'active' });

  for (const pool of pools) {
    const schedules = await ReminderSchedule.find({
      poolId: pool.id,
      type: ReminderType.PAYOUT_COMING,
      isActive: true,
    });

    if (schedules.length === 0) continue;

    const payoutDate = pool.nextPayoutDate ? new Date(pool.nextPayoutDate) : null;
    if (!payoutDate) continue;

    for (const schedule of schedules) {
      const reminderSendTime = calculateReminderSendTime(
        payoutDate,
        schedule.timingValue,
        schedule.timingUnit
      );

      if (reminderSendTime < now || reminderSendTime > windowEnd) {
        continue;
      }

      // Find the member who will receive this payout
      const recipient = pool.members.find((m: { status: string }) => m.status === 'current');
      if (!recipient || !recipient.userId) continue;

      const preferences = await NotificationPreference.findOne({ userId: recipient.userId });

      if (preferences && isPoolMuted(preferences as NotificationPreferenceDocument, pool.id)) {
        continue;
      }

      const channels = preferences
        ? getEffectiveChannels(preferences as NotificationPreferenceDocument, ReminderType.PAYOUT_COMING)
        : [ReminderChannel.EMAIL];

      if (channels.length === 0) continue;

      if (preferences && isInQuietHours(preferences as NotificationPreferenceDocument)) {
        continue;
      }

      for (const channel of channels) {
        const existingReminder = await SentReminder.findOne({
          scheduleId: schedule._id,
          userId: recipient.userId,
          eventDate: payoutDate,
          channel,
        });

        if (!existingReminder) {
          reminders.push({
            scheduleId: schedule._id as mongoose.Types.ObjectId,
            poolId: pool.id,
            poolName: pool.name,
            userId: recipient.userId,
            memberName: recipient.name,
            memberEmail: recipient.email,
            type: ReminderType.PAYOUT_COMING,
            round: pool.currentRound,
            channel,
            eventDate: payoutDate,
            customSubject: schedule.customSubject,
            customMessage: schedule.customMessage,
            contributionAmount: pool.contributionAmount,
            frequency: pool.frequency,
            recipientPosition: recipient.position,
          });
        }
      }
    }
  }

  return reminders;
}

/**
 * Get reminders for overdue payments
 */
async function getOverduePaymentReminders(): Promise<PendingReminder[]> {
  const PoolModel = getPoolModel();
  const ReminderSchedule = getReminderScheduleModel();
  const SentReminder = getSentReminderModel();
  const NotificationPreference = getNotificationPreferenceModel();

  const reminders: PendingReminder[] = [];
  const now = new Date();

  const pools = await PoolModel.find({ status: 'active' });

  for (const pool of pools) {
    const schedules = await ReminderSchedule.find({
      poolId: pool.id,
      type: ReminderType.PAYMENT_OVERDUE,
      isActive: true,
    });

    if (schedules.length === 0) continue;

    // Find members with overdue payments
    const overduePayments = pool.currentRoundPayments?.filter(
      (p: { status: string; dueDate: Date }) => p.status === 'pending' && p.dueDate && new Date(p.dueDate) < now
    ) || [];

    for (const payment of overduePayments) {
      const member = pool.members.find((m: { id: number }) => m.id === payment.memberId);
      if (!member || !member.userId) continue;

      const overdueSince = new Date(payment.dueDate);

      for (const schedule of schedules) {
        // For overdue reminders, timing is after the due date
        const reminderSendTime = calculateReminderSendTime(
          overdueSince,
          Math.abs(schedule.timingValue), // Use positive value for "after"
          schedule.timingUnit
        );

        // Check if we should send this reminder now
        const timeSinceReminder = now.getTime() - reminderSendTime.getTime();
        if (timeSinceReminder < 0 || timeSinceReminder > REMINDER_WINDOW_HOURS * 60 * 60 * 1000) {
          continue;
        }

        const preferences = await NotificationPreference.findOne({ userId: member.userId });

        if (preferences && isPoolMuted(preferences as NotificationPreferenceDocument, pool.id)) {
          continue;
        }

        const channels = preferences
          ? getEffectiveChannels(preferences as NotificationPreferenceDocument, ReminderType.PAYMENT_OVERDUE)
          : [ReminderChannel.EMAIL];

        if (channels.length === 0) continue;

        // Don't skip quiet hours for overdue reminders - they're important

        for (const channel of channels) {
          const existingReminder = await SentReminder.findOne({
            scheduleId: schedule._id,
            userId: member.userId,
            eventDate: overdueSince,
            channel,
          });

          if (!existingReminder) {
            reminders.push({
              scheduleId: schedule._id as mongoose.Types.ObjectId,
              poolId: pool.id,
              poolName: pool.name,
              userId: member.userId,
              memberName: member.name,
              memberEmail: member.email,
              type: ReminderType.PAYMENT_OVERDUE,
              round: pool.currentRound,
              channel,
              eventDate: overdueSince,
              customSubject: schedule.customSubject,
              customMessage: schedule.customMessage,
              contributionAmount: pool.contributionAmount,
              frequency: pool.frequency,
            });
          }
        }
      }
    }
  }

  return reminders;
}

/**
 * Create default reminder schedules for a new pool
 */
export async function createDefaultReminderSchedules(
  poolId: string,
  createdBy: mongoose.Types.ObjectId
): Promise<void> {
  await connectToDatabase();
  const ReminderSchedule = getReminderScheduleModel();

  // Default schedules optimized for daily cron (Vercel Hobby plan)
  // All timings are in days to align with once-daily execution
  const defaultSchedules = [
    // Payment due reminders
    {
      poolId,
      type: ReminderType.PAYMENT_DUE,
      timingValue: -3, // 3 days before
      timingUnit: TimingUnit.DAYS,
      channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
      isActive: true,
      createdBy,
    },
    {
      poolId,
      type: ReminderType.PAYMENT_DUE,
      timingValue: -1, // 1 day before
      timingUnit: TimingUnit.DAYS,
      channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
      isActive: true,
      createdBy,
    },
    {
      poolId,
      type: ReminderType.PAYMENT_DUE,
      timingValue: 0, // Day of (morning reminder)
      timingUnit: TimingUnit.DAYS,
      channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
      isActive: true,
      createdBy,
    },

    // Payout coming reminders (for the recipient)
    {
      poolId,
      type: ReminderType.PAYOUT_COMING,
      timingValue: -1, // 1 day before
      timingUnit: TimingUnit.DAYS,
      channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
      isActive: true,
      createdBy,
    },

    // Overdue payment reminders
    {
      poolId,
      type: ReminderType.PAYMENT_OVERDUE,
      timingValue: 1, // 1 day after due
      timingUnit: TimingUnit.DAYS,
      channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
      isActive: true,
      createdBy,
    },
    {
      poolId,
      type: ReminderType.PAYMENT_OVERDUE,
      timingValue: 3, // 3 days after due
      timingUnit: TimingUnit.DAYS,
      channels: [ReminderChannel.EMAIL],
      isActive: true,
      createdBy,
    },
  ];

  // Use insertMany for efficiency, but handle duplicates gracefully
  try {
    await ReminderSchedule.insertMany(defaultSchedules, { ordered: false });
    console.log(`[Scheduler] Created ${defaultSchedules.length} default reminder schedules for pool ${poolId}`);
  } catch (error: unknown) {
    // Ignore duplicate key errors (schedules already exist)
    const mongoError = error as { code?: number };
    if (mongoError.code !== 11000) {
      throw error;
    }
    console.log(`[Scheduler] Some reminder schedules already exist for pool ${poolId}`);
  }
}

/**
 * Get statistics about pending reminders
 */
export async function getReminderStats(): Promise<{
  pendingCount: number;
  sentToday: number;
  failedToday: number;
  byType: Record<string, number>;
}> {
  await connectToDatabase();
  const SentReminder = getSentReminderModel();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [sentToday, failedToday, byType] = await Promise.all([
    SentReminder.countDocuments({
      sentAt: { $gte: today },
      status: { $in: ['sent', 'delivered'] },
    }),
    SentReminder.countDocuments({
      sentAt: { $gte: today },
      status: 'failed',
    }),
    SentReminder.aggregate([
      { $match: { sentAt: { $gte: today } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
  ]);

  const byTypeMap: Record<string, number> = {};
  for (const item of byType) {
    byTypeMap[item._id] = item.count;
  }

  const pendingReminders = await getPendingReminders();

  return {
    pendingCount: pendingReminders.length,
    sentToday,
    failedToday,
    byType: byTypeMap,
  };
}

export default {
  getPendingReminders,
  createDefaultReminderSchedules,
  getReminderStats,
};
