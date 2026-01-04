import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * ScheduledCollection Model - Tracks scheduled and processed automatic collections
 *
 * Each record represents a scheduled automatic collection for a specific user/pool/round.
 * This provides visibility into upcoming, pending, successful, and failed collections.
 */

// Collection status enum
export enum CollectionStatus {
  SCHEDULED = 'scheduled',       // Future collection, not yet due
  PENDING = 'pending',           // Due and waiting to be processed
  PROCESSING = 'processing',     // Currently being processed
  COMPLETED = 'completed',       // Successfully collected
  FAILED = 'failed',             // Failed after all retry attempts
  MANUALLY_PAID = 'manually_paid', // User paid manually before auto-collection
  CANCELLED = 'cancelled',       // Cancelled by admin
  SKIPPED = 'skipped',           // Skipped (e.g., user left pool)
}

// Retry attempt tracking
const RetryAttemptSchema = new Schema({
  attemptNumber: { type: Number, required: true },
  attemptedAt: { type: Date, required: true },
  success: { type: Boolean, required: true },
  stripePaymentIntentId: { type: String },
  errorCode: { type: String },
  errorMessage: { type: String },
  declineCode: { type: String },
  nextRetryAt: { type: Date }, // When to retry if failed
});

// Main ScheduledCollection schema
const ScheduledCollectionSchema = new Schema({
  // Unique collection ID for idempotency
  collectionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Pool and user references
  poolId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Member info (denormalized for display)
  memberName: { type: String, required: true },
  memberEmail: { type: String, required: true },

  // Round/cycle information
  round: { type: Number, required: true },
  cycleNumber: { type: Number },

  // Amount to collect
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },

  // Scheduling
  dueDate: { type: Date, required: true, index: true },
  gracePeriodHours: { type: Number, default: 24 },
  collectionEligibleAt: { type: Date, required: true, index: true }, // dueDate + gracePeriod

  // Status tracking
  status: {
    type: String,
    enum: Object.values(CollectionStatus),
    required: true,
    default: CollectionStatus.SCHEDULED,
  },

  // Processing info
  processedAt: { type: Date },
  completedAt: { type: Date },

  // Stripe payment info (when successful)
  stripePaymentIntentId: { type: String, index: true },
  stripePaymentMethodId: { type: String },
  stripeCustomerId: { type: String },

  // Retry tracking
  attemptCount: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastAttemptAt: { type: Date },
  nextRetryAt: { type: Date, index: true },
  retryAttempts: [RetryAttemptSchema],

  // Failure info
  failureReason: { type: String },
  lastErrorCode: { type: String },
  lastDeclineCode: { type: String },

  // Manual intervention
  cancelledAt: { type: Date },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelReason: { type: String },

  // Notification tracking
  reminderSentAt: { type: Date },
  failureNotificationSentAt: { type: Date },
  updateRequestSentAt: { type: Date },

  // Idempotency key for Stripe
  idempotencyKey: { type: String, unique: true, sparse: true },

}, {
  timestamps: true,
});

// Compound indexes for efficient queries
ScheduledCollectionSchema.index({ poolId: 1, round: 1 });
ScheduledCollectionSchema.index({ status: 1, dueDate: 1 });
ScheduledCollectionSchema.index({ status: 1, collectionEligibleAt: 1 });
ScheduledCollectionSchema.index({ status: 1, nextRetryAt: 1 });
ScheduledCollectionSchema.index({ userId: 1, poolId: 1, round: 1 }, { unique: true });

// Document interface
export interface RetryAttempt {
  attemptNumber: number;
  attemptedAt: Date;
  success: boolean;
  stripePaymentIntentId?: string;
  errorCode?: string;
  errorMessage?: string;
  declineCode?: string;
  nextRetryAt?: Date;
}

export interface ScheduledCollectionDocument extends Document {
  collectionId: string;
  poolId: string;
  userId: mongoose.Types.ObjectId;
  memberName: string;
  memberEmail: string;
  round: number;
  cycleNumber?: number;
  amount: number;
  currency: string;
  dueDate: Date;
  gracePeriodHours: number;
  collectionEligibleAt: Date;
  status: CollectionStatus;
  processedAt?: Date;
  completedAt?: Date;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  stripeCustomerId?: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  retryAttempts: RetryAttempt[];
  failureReason?: string;
  lastErrorCode?: string;
  lastDeclineCode?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelReason?: string;
  reminderSentAt?: Date;
  failureNotificationSentAt?: Date;
  updateRequestSentAt?: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to generate collection ID
export function generateCollectionId(poolId: string, round: number, userId: string): string {
  return `col_${poolId}_r${round}_${userId.substring(0, 8)}`;
}

// Helper function to generate idempotency key
export function generateIdempotencyKey(collectionId: string, attemptNumber: number): string {
  return `auto-collect-${collectionId}-attempt-${attemptNumber}`;
}

// Model getter
export function getScheduledCollectionModel(): Model<ScheduledCollectionDocument> {
  const modelName = 'ScheduledCollection';
  return mongoose.models[modelName] || mongoose.model<ScheduledCollectionDocument>(modelName, ScheduledCollectionSchema);
}

export const ScheduledCollection = getScheduledCollectionModel();

export default ScheduledCollection;
