import mongoose, { Schema, Document, Model } from 'mongoose';
import { ReminderType, ReminderChannel } from './reminder';

/**
 * NotificationPreference Model - User's preferences for receiving notifications
 *
 * This allows users to control which notifications they receive and how
 */

// Notification frequency options
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',     // Send as soon as triggered
  DAILY_DIGEST = 'daily',      // Bundle into daily digest
  WEEKLY_DIGEST = 'weekly',    // Bundle into weekly digest
  NONE = 'none',               // Don't send
}

// Quiet hours configuration
const QuietHoursSchema = new Schema({
  enabled: { type: Boolean, default: false },
  startHour: { type: Number, min: 0, max: 23, default: 22 }, // 10 PM
  endHour: { type: Number, min: 0, max: 23, default: 8 },    // 8 AM
  timezone: { type: String, default: 'America/New_York' },
}, { _id: false });

// Per-type notification settings
const TypePreferenceSchema = new Schema({
  enabled: { type: Boolean, default: true },
  channels: [{
    type: String,
    enum: Object.values(ReminderChannel),
  }],
  frequency: {
    type: String,
    enum: Object.values(NotificationFrequency),
    default: NotificationFrequency.IMMEDIATE,
  },
}, { _id: false });

// Main NotificationPreference Schema
const NotificationPreferenceSchema = new Schema({
  // User this preference belongs to
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // Global settings
  globalEnabled: {
    type: Boolean,
    default: true,
  },

  // Preferred channels (ordered by preference)
  preferredChannels: [{
    type: String,
    enum: Object.values(ReminderChannel),
  }],

  // Quiet hours settings
  quietHours: {
    type: QuietHoursSchema,
    default: () => ({}),
  },

  // Email-specific settings
  email: {
    enabled: { type: Boolean, default: true },
    address: { type: String }, // Override email if different from account email
    verified: { type: Boolean, default: false },
  },

  // SMS-specific settings
  sms: {
    enabled: { type: Boolean, default: false },
    phoneNumber: { type: String },
    verified: { type: Boolean, default: false },
  },

  // Push notification settings
  push: {
    enabled: { type: Boolean, default: false },
    subscriptions: [{ type: Schema.Types.Mixed }], // Web push subscriptions
  },

  // In-app notification settings
  inApp: {
    enabled: { type: Boolean, default: true },
    showBadge: { type: Boolean, default: true },
    playSound: { type: Boolean, default: false },
  },

  // Per-type preferences (override defaults)
  typePreferences: {
    [ReminderType.PAYMENT_DUE]: { type: TypePreferenceSchema, default: () => ({}) },
    [ReminderType.PAYMENT_OVERDUE]: { type: TypePreferenceSchema, default: () => ({}) },
    [ReminderType.PAYOUT_COMING]: { type: TypePreferenceSchema, default: () => ({}) },
    [ReminderType.ROUND_START]: { type: TypePreferenceSchema, default: () => ({}) },
    [ReminderType.POOL_ANNOUNCEMENT]: { type: TypePreferenceSchema, default: () => ({}) },
  },

  // Pool-specific overrides (optional - allows users to mute specific pools)
  poolOverrides: [{
    poolId: { type: String, required: true },
    muted: { type: Boolean, default: false },
    mutedUntil: { type: Date }, // Temporary mute
  }],

  // Unsubscribe tracking
  unsubscribedAt: { type: Date },
  unsubscribeReason: { type: String },

}, {
  timestamps: true,
});

// Index for pool overrides lookup
NotificationPreferenceSchema.index({ 'poolOverrides.poolId': 1 });

// Document interface
export interface NotificationPreferenceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  globalEnabled: boolean;
  preferredChannels: ReminderChannel[];
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    timezone: string;
  };
  email: {
    enabled: boolean;
    address?: string;
    verified: boolean;
  };
  sms: {
    enabled: boolean;
    phoneNumber?: string;
    verified: boolean;
  };
  push: {
    enabled: boolean;
    subscriptions: unknown[];
  };
  inApp: {
    enabled: boolean;
    showBadge: boolean;
    playSound: boolean;
  };
  typePreferences: {
    [key in ReminderType]?: {
      enabled: boolean;
      channels: ReminderChannel[];
      frequency: NotificationFrequency;
    };
  };
  poolOverrides: Array<{
    poolId: string;
    muted: boolean;
    mutedUntil?: Date;
  }>;
  unsubscribedAt?: Date;
  unsubscribeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to check if a pool is muted for a user
export function isPoolMuted(
  preferences: NotificationPreferenceDocument,
  poolId: string
): boolean {
  const override = preferences.poolOverrides?.find(o => o.poolId === poolId);
  if (!override) return false;

  if (override.muted) {
    // Check if temporary mute has expired
    if (override.mutedUntil && new Date() > override.mutedUntil) {
      return false;
    }
    return true;
  }

  return false;
}

// Helper function to check if we're in quiet hours
export function isInQuietHours(preferences: NotificationPreferenceDocument): boolean {
  if (!preferences.quietHours?.enabled) return false;

  const now = new Date();
  // Simple hour check - in production, use proper timezone library
  const currentHour = now.getHours();
  const { startHour, endHour } = preferences.quietHours;

  // Handle quiet hours that span midnight
  if (startHour > endHour) {
    // e.g., 22:00 to 08:00
    return currentHour >= startHour || currentHour < endHour;
  } else {
    // e.g., 01:00 to 06:00
    return currentHour >= startHour && currentHour < endHour;
  }
}

// Helper function to get effective channels for a reminder type
export function getEffectiveChannels(
  preferences: NotificationPreferenceDocument,
  reminderType: ReminderType
): ReminderChannel[] {
  if (!preferences.globalEnabled) return [];

  const typePrefs = preferences.typePreferences?.[reminderType];

  // If type-specific preferences exist and type is disabled, return empty
  if (typePrefs && !typePrefs.enabled) return [];

  // Use type-specific channels if defined, otherwise fall back to preferred channels
  const channels = typePrefs?.channels?.length
    ? typePrefs.channels
    : preferences.preferredChannels;

  // Filter to only enabled channels
  return channels.filter(channel => {
    switch (channel) {
      case ReminderChannel.EMAIL:
        return preferences.email?.enabled;
      case ReminderChannel.SMS:
        return preferences.sms?.enabled && preferences.sms?.verified;
      case ReminderChannel.PUSH:
        return preferences.push?.enabled;
      case ReminderChannel.IN_APP:
        return preferences.inApp?.enabled;
      default:
        return false;
    }
  });
}

// Helper to create default preferences for a new user
export function createDefaultPreferences(userId: mongoose.Types.ObjectId): Partial<NotificationPreferenceDocument> {
  return {
    userId,
    globalEnabled: true,
    preferredChannels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
    quietHours: {
      enabled: false,
      startHour: 22,
      endHour: 8,
      timezone: 'America/New_York',
    },
    email: {
      enabled: true,
      verified: false,
    },
    sms: {
      enabled: false,
      verified: false,
    },
    push: {
      enabled: false,
      subscriptions: [],
    },
    inApp: {
      enabled: true,
      showBadge: true,
      playSound: false,
    },
    typePreferences: {
      [ReminderType.PAYMENT_DUE]: {
        enabled: true,
        channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
        frequency: NotificationFrequency.IMMEDIATE,
      },
      [ReminderType.PAYMENT_OVERDUE]: {
        enabled: true,
        channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
        frequency: NotificationFrequency.IMMEDIATE,
      },
      [ReminderType.PAYOUT_COMING]: {
        enabled: true,
        channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
        frequency: NotificationFrequency.IMMEDIATE,
      },
      [ReminderType.ROUND_START]: {
        enabled: true,
        channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
        frequency: NotificationFrequency.IMMEDIATE,
      },
      [ReminderType.POOL_ANNOUNCEMENT]: {
        enabled: true,
        channels: [ReminderChannel.EMAIL, ReminderChannel.IN_APP],
        frequency: NotificationFrequency.IMMEDIATE,
      },
    },
    poolOverrides: [],
  };
}

// Model getter
export function getNotificationPreferenceModel(): Model<NotificationPreferenceDocument> {
  const modelName = 'NotificationPreference';
  return mongoose.models[modelName] || mongoose.model<NotificationPreferenceDocument>(modelName, NotificationPreferenceSchema);
}

export const NotificationPreference = getNotificationPreferenceModel();

export default NotificationPreference;
