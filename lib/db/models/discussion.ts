/**
 * Discussion Model - MongoDB schema for pool activity feed and discussions
 *
 * This model handles threaded discussions and activity posts within a pool.
 * Discussions can be:
 * 1. User-created posts (general discussions, announcements)
 * 2. Auto-generated activity posts (payment events, member joins, etc.)
 * 3. Replies to existing discussions (threaded conversations)
 *
 * Features:
 * - Threaded replies with parent-child relationships
 * - @mentions with notifications
 * - Read receipts for tracking who has seen posts
 * - Pinned posts for important announcements
 * - Activity type classification for filtering
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Discussion types for filtering and display
export enum DiscussionType {
  POST = 'post',              // User-created general discussion
  ANNOUNCEMENT = 'announcement', // Admin announcements (can be pinned)
  ACTIVITY = 'activity',      // Auto-generated activity posts
  REPLY = 'reply',            // Reply to another discussion
}

// Activity subtypes for auto-generated posts
export enum ActivityType {
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYOUT_SENT = 'payout_sent',
  PAYOUT_COMPLETED = 'payout_completed',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  ROUND_STARTED = 'round_started',
  ROUND_COMPLETED = 'round_completed',
  POOL_CREATED = 'pool_created',
  POOL_STATUS_CHANGED = 'pool_status_changed',
  REMINDER_SENT = 'reminder_sent',
}

// TypeScript interface for Discussion document
export interface IDiscussion extends Document {
  _id: Types.ObjectId;
  poolId: Types.ObjectId;           // Reference to the Pool
  authorId: Types.ObjectId;         // Reference to the User who created this
  authorName: string;               // Cached author name for display
  authorAvatar?: string;            // Cached author avatar URL

  type: DiscussionType;             // Type of discussion
  activityType?: ActivityType;      // Subtype for activity posts

  title?: string;                   // Optional title for announcements
  content: string;                  // Discussion text content

  // Threading
  parentId?: Types.ObjectId;        // Parent discussion for replies
  replyCount: number;               // Cached count of replies

  // Mentions
  mentions: Types.ObjectId[];       // Array of mentioned user IDs

  // Metadata
  isPinned: boolean;                // Pinned to top of feed
  isEdited: boolean;                // Has been edited
  editedAt?: Date;                  // When last edited

  // Soft delete
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  // Activity metadata (for auto-generated posts)
  activityMetadata?: {
    memberId?: number;              // Related member ID
    memberName?: string;            // Related member name
    amount?: number;                // Payment/payout amount
    round?: number;                 // Related round number
    paymentMethod?: string;         // Payment method used
    transactionId?: string;         // Related transaction ID
  };

  createdAt: Date;
  updatedAt: Date;
}

// Discussion schema definition
const DiscussionSchema = new Schema<IDiscussion>(
  {
    poolId: {
      type: Schema.Types.ObjectId,
      ref: 'Pool',
      required: [true, 'Pool ID is required'],
      index: true
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
      index: true
    },
    authorName: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    authorAvatar: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(DiscussionType),
      required: true,
      default: DiscussionType.POST
    },
    activityType: {
      type: String,
      enum: Object.values(ActivityType)
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [10000, 'Content cannot exceed 10000 characters']
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
      index: true
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0
    },
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    isPinned: {
      type: Boolean,
      default: false
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    activityMetadata: {
      memberId: { type: Number },
      memberName: { type: String },
      amount: { type: Number },
      round: { type: Number },
      paymentMethod: { type: String },
      transactionId: { type: String }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
// Primary query: get discussions for a pool, sorted by time
DiscussionSchema.index({ poolId: 1, createdAt: -1 });

// Pinned posts first, then by time
DiscussionSchema.index({ poolId: 1, isPinned: -1, createdAt: -1 });

// Filter by type
DiscussionSchema.index({ poolId: 1, type: 1, createdAt: -1 });

// Get replies for a parent
DiscussionSchema.index({ parentId: 1, createdAt: 1 });

// Soft delete filtering
DiscussionSchema.index({ poolId: 1, deleted: 1, createdAt: -1 });

// Mentions lookup
DiscussionSchema.index({ mentions: 1, createdAt: -1 });

/**
 * Static method to get discussions for a pool with pagination
 */
DiscussionSchema.statics.getDiscussionsForPool = async function(
  poolId: string | Types.ObjectId,
  options: {
    limit?: number;
    skip?: number;
    before?: Date;
    type?: DiscussionType;
    includeReplies?: boolean;
  } = {}
) {
  const { limit = 20, skip = 0, before, type, includeReplies = false } = options;

  const query: any = {
    poolId: new mongoose.Types.ObjectId(poolId.toString()),
    deleted: false
  };

  // Only get top-level posts unless includeReplies is true
  if (!includeReplies) {
    query.parentId = { $exists: false };
  }

  if (type) {
    query.type = type;
  }

  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Static method to get replies for a discussion
 */
DiscussionSchema.statics.getReplies = async function(
  parentId: string | Types.ObjectId,
  options: { limit?: number; skip?: number } = {}
) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    parentId: new mongoose.Types.ObjectId(parentId.toString()),
    deleted: false
  })
    .sort({ createdAt: 1 }) // Oldest first for replies
    .skip(skip)
    .limit(limit)
    .lean();
};

// Create and export the model
export function getDiscussionModel(): Model<IDiscussion> {
  const modelName = 'Discussion';
  return mongoose.models[modelName] || mongoose.model<IDiscussion>(modelName, DiscussionSchema);
}

export const Discussion = getDiscussionModel();

export default Discussion;
