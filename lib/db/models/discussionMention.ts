/**
 * DiscussionMention Model - Tracks @mentions in discussions
 *
 * This model provides a denormalized view of mentions for efficient querying.
 * While mentions are also stored in the Discussion document, this separate
 * collection allows for:
 * 1. Efficient "mentions of me" queries across all pools
 * 2. Read/unread tracking per mention
 * 3. Notification state management
 *
 * Data Flow:
 * 1. User creates a discussion with @mentions
 * 2. Mentions are parsed from content (lib/activity/mentions.ts)
 * 3. DiscussionMention records are created for each mentioned user
 * 4. User can query their mentions across all pools
 * 5. Mentions can be marked as read/notified
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// TypeScript interface for DiscussionMention document
export interface IDiscussionMention extends Document {
  _id: Types.ObjectId;
  discussionId: Types.ObjectId;     // Reference to the Discussion
  poolId: Types.ObjectId;           // Reference to the Pool (denormalized for queries)
  mentionedUserId: Types.ObjectId;  // The user who was mentioned
  mentionedByUserId: Types.ObjectId; // The user who made the mention
  mentionedByName: string;          // Cached name of mentioner

  // Context from the discussion
  discussionType: string;           // Type of the parent discussion
  discussionPreview: string;        // Preview of the discussion content

  // State tracking
  isRead: boolean;                  // Has the mentioned user seen this
  readAt?: Date;                    // When it was marked as read
  isNotified: boolean;              // Has a notification been sent
  notifiedAt?: Date;                // When notification was sent

  createdAt: Date;
  updatedAt: Date;
}

// DiscussionMention schema definition
const DiscussionMentionSchema = new Schema<IDiscussionMention>(
  {
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
      required: [true, 'Discussion ID is required'],
      index: true
    },
    poolId: {
      type: Schema.Types.ObjectId,
      ref: 'Pool',
      required: [true, 'Pool ID is required'],
      index: true
    },
    mentionedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentioned user ID is required'],
      index: true
    },
    mentionedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentioned by user ID is required']
    },
    mentionedByName: {
      type: String,
      required: [true, 'Mentioned by name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    discussionType: {
      type: String,
      required: true
    },
    discussionPreview: {
      type: String,
      required: true,
      maxlength: [200, 'Preview cannot exceed 200 characters']
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    isNotified: {
      type: Boolean,
      default: false
    },
    notifiedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries

// Get all mentions for a user (my mentions inbox)
DiscussionMentionSchema.index({ mentionedUserId: 1, createdAt: -1 });

// Get unread mentions for a user
DiscussionMentionSchema.index({ mentionedUserId: 1, isRead: 1, createdAt: -1 });

// Get mentions in a specific pool for a user
DiscussionMentionSchema.index({ mentionedUserId: 1, poolId: 1, createdAt: -1 });

// Get all mentions for a discussion (for cleanup on delete)
DiscussionMentionSchema.index({ discussionId: 1 });

// Compound index for finding if a mention already exists
DiscussionMentionSchema.index({ discussionId: 1, mentionedUserId: 1 }, { unique: true });

/**
 * Static method to get unread mention count for a user
 */
DiscussionMentionSchema.statics.getUnreadCount = async function(
  userId: string | Types.ObjectId,
  poolId?: string | Types.ObjectId
) {
  const query: any = {
    mentionedUserId: new mongoose.Types.ObjectId(userId.toString()),
    isRead: false
  };

  if (poolId) {
    query.poolId = new mongoose.Types.ObjectId(poolId.toString());
  }

  return this.countDocuments(query);
};

/**
 * Static method to mark mentions as read
 */
DiscussionMentionSchema.statics.markAsRead = async function(
  userId: string | Types.ObjectId,
  mentionIds?: (string | Types.ObjectId)[]
) {
  const query: any = {
    mentionedUserId: new mongoose.Types.ObjectId(userId.toString()),
    isRead: false
  };

  if (mentionIds && mentionIds.length > 0) {
    query._id = {
      $in: mentionIds.map(id => new mongoose.Types.ObjectId(id.toString()))
    };
  }

  return this.updateMany(query, {
    $set: {
      isRead: true,
      readAt: new Date()
    }
  });
};

/**
 * Static method to get mentions for a user with pagination
 */
DiscussionMentionSchema.statics.getMentionsForUser = async function(
  userId: string | Types.ObjectId,
  options: {
    limit?: number;
    skip?: number;
    poolId?: string | Types.ObjectId;
    unreadOnly?: boolean;
  } = {}
) {
  const { limit = 20, skip = 0, poolId, unreadOnly = false } = options;

  const query: any = {
    mentionedUserId: new mongoose.Types.ObjectId(userId.toString())
  };

  if (poolId) {
    query.poolId = new mongoose.Types.ObjectId(poolId.toString());
  }

  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('discussionId', 'content type title authorName')
    .lean();
};

// Create and export the model
export function getDiscussionMentionModel(): Model<IDiscussionMention> {
  const modelName = 'DiscussionMention';
  return mongoose.models[modelName] || mongoose.model<IDiscussionMention>(modelName, DiscussionMentionSchema);
}

export const DiscussionMention = getDiscussionMentionModel();

export default DiscussionMention;
