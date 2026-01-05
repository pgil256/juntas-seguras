import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * ReminderSchedule Model - Defines when reminders should be sent for a pool
 *
 * Each pool can have multiple reminder schedules (e.g., 3 days before, 1 day before, day of)
 */

// Reminder types
export enum ReminderType {
  PAYMENT_DUE = 'payment_due',           // Reminder for upcoming contribution due date
  PAYMENT_OVERDUE = 'payment_overdue',   // Reminder for missed/late payment
  PAYOUT_COMING = 'payout_coming',       // Reminder that payout is coming soon
  ROUND_START = 'round_start',           // Reminder that a new round is starting
  POOL_ANNOUNCEMENT = 'pool_announcement', // General pool announcement
}

// Reminder channel types
export enum ReminderChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

// Timing unit for reminders
export enum TimingUnit {
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
}

// ReminderSchedule Schema - Defines templates for when reminders should be sent
const ReminderScheduleSchema = new Schema({
  // Pool this schedule belongs to
  poolId: {
    type: String,
    required: true,
    index: true,
  },

  // Type of reminder
  type: {
    type: String,
    enum: Object.values(ReminderType),
    required: true,
  },

  // When to send relative to the event (negative = before, positive = after)
  // e.g., -3 with 'days' unit = 3 days before the event
  timingValue: {
    type: Number,
    required: true,
    default: -1,
  },

  // Unit for timing
  timingUnit: {
    type: String,
    enum: Object.values(TimingUnit),
    required: true,
    default: TimingUnit.DAYS,
  },

  // Which channels to use for this reminder
  channels: [{
    type: String,
    enum: Object.values(ReminderChannel),
  }],

  // Is this reminder schedule active?
  isActive: {
    type: Boolean,
    default: true,
  },

  // Custom message template (optional, uses default if not set)
  customSubject: { type: String },
  customMessage: { type: String },

  // Who created this schedule (usually pool admin)
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

}, {
  timestamps: true,
});

// Compound indexes
ReminderScheduleSchema.index({ poolId: 1, type: 1, isActive: 1 });
ReminderScheduleSchema.index({ poolId: 1, isActive: 1 });

// Document interface
export interface ReminderScheduleDocument extends Document {
  poolId: string;
  type: ReminderType;
  timingValue: number;
  timingUnit: TimingUnit;
  channels: ReminderChannel[];
  isActive: boolean;
  customSubject?: string;
  customMessage?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SentReminder Model - Tracks reminders that have been sent
 *
 * This provides audit trail and prevents duplicate reminders
 */
const SentReminderSchema = new Schema({
  // Reference to the schedule that triggered this reminder
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: 'ReminderSchedule',
    required: true,
    index: true,
  },

  // Pool this reminder is for
  poolId: {
    type: String,
    required: true,
    index: true,
  },

  // User who received the reminder
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Member info (denormalized for display)
  memberName: { type: String, required: true },
  memberEmail: { type: String, required: true },

  // Type of reminder
  type: {
    type: String,
    enum: Object.values(ReminderType),
    required: true,
  },

  // Round this reminder is for (if applicable)
  round: { type: Number },

  // Channel used to send this reminder
  channel: {
    type: String,
    enum: Object.values(ReminderChannel),
    required: true,
  },

  // The event date this reminder is about (e.g., payment due date)
  eventDate: {
    type: Date,
    required: true,
    index: true,
  },

  // When the reminder was sent
  sentAt: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // Status of the reminder
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    required: true,
    default: 'pending',
  },

  // Subject and message content that was sent
  subject: { type: String },
  message: { type: String },

  // Delivery tracking
  deliveredAt: { type: Date },
  failureReason: { type: String },
  retryCount: { type: Number, default: 0 },

  // External message ID (e.g., email message ID)
  externalMessageId: { type: String },

  // Was this reminder opened/read?
  openedAt: { type: Date },

}, {
  timestamps: true,
});

// Compound indexes for efficient queries
SentReminderSchema.index({ poolId: 1, round: 1, type: 1 });
SentReminderSchema.index({ userId: 1, type: 1, sentAt: -1 });
SentReminderSchema.index({ status: 1, sentAt: 1 });
// Unique index to prevent duplicate reminders for the same event
SentReminderSchema.index(
  { scheduleId: 1, userId: 1, eventDate: 1, channel: 1 },
  { unique: true }
);

// Document interface
export interface SentReminderDocument extends Document {
  scheduleId: mongoose.Types.ObjectId;
  poolId: string;
  userId: mongoose.Types.ObjectId;
  memberName: string;
  memberEmail: string;
  type: ReminderType;
  round?: number;
  channel: ReminderChannel;
  eventDate: Date;
  sentAt: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  subject?: string;
  message?: string;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  externalMessageId?: string;
  openedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to calculate reminder send time
export function calculateReminderSendTime(
  eventDate: Date,
  timingValue: number,
  timingUnit: TimingUnit
): Date {
  const sendTime = new Date(eventDate);

  switch (timingUnit) {
    case TimingUnit.HOURS:
      sendTime.setHours(sendTime.getHours() + timingValue);
      break;
    case TimingUnit.DAYS:
      sendTime.setDate(sendTime.getDate() + timingValue);
      break;
    case TimingUnit.WEEKS:
      sendTime.setDate(sendTime.getDate() + (timingValue * 7));
      break;
  }

  return sendTime;
}

// Model getters
export function getReminderScheduleModel(): Model<ReminderScheduleDocument> {
  const modelName = 'ReminderSchedule';
  return mongoose.models[modelName] || mongoose.model<ReminderScheduleDocument>(modelName, ReminderScheduleSchema);
}

export function getSentReminderModel(): Model<SentReminderDocument> {
  const modelName = 'SentReminder';
  return mongoose.models[modelName] || mongoose.model<SentReminderDocument>(modelName, SentReminderSchema);
}

export const ReminderSchedule = getReminderScheduleModel();
export const SentReminder = getSentReminderModel();

export default { ReminderSchedule, SentReminder, getReminderScheduleModel, getSentReminderModel };
