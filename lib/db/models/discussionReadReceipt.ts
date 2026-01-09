/**
 * DiscussionReadReceipt Model - Tracks which discussions users have read
 *
 * This model provides efficient read tracking for discussions without
 * bloating the Discussion document with an array of reader IDs.
 *
 * Features:
 * 1. Track last read timestamp per user per pool
 * 2. Track individual discussion reads for accurate unread counts
 * 3. Support "mark all as read" functionality
 *
 * Performance Considerations:
 * - Uses a denormalized approach for efficient queries
 * - Stores both per-discussion reads and last-read-at timestamp
 * - The lastReadAt field allows "mark all as read" without creating many records
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// TypeScript interface for DiscussionReadReceipt document
export interface IDiscussionReadReceipt extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // The user who read
  poolId: Types.ObjectId;           // The pool (denormalized for queries)
  discussionId?: Types.ObjectId;    // Specific discussion (optional for bulk reads)
  readAt: Date;                     // When it was read

  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IDiscussionReadReceiptModel extends Model<IDiscussionReadReceipt> {
  markAsRead(
    userId: string | Types.ObjectId,
    poolId: string | Types.ObjectId,
    discussionId: string | Types.ObjectId
  ): Promise<IDiscussionReadReceipt>;
  markAllAsRead(
    userId: string | Types.ObjectId,
    poolId: string | Types.ObjectId
  ): Promise<IDiscussionReadReceipt>;
  hasRead(
    userId: string | Types.ObjectId,
    discussionId: string | Types.ObjectId,
    discussionCreatedAt: Date
  ): Promise<boolean>;
  getUnreadCount(
    userId: string | Types.ObjectId,
    poolId: string | Types.ObjectId
  ): Promise<number>;
  getReadDiscussionIds(
    userId: string | Types.ObjectId,
    poolId: string | Types.ObjectId
  ): Promise<Types.ObjectId[]>;
}

// DiscussionReadReceipt schema definition
const DiscussionReadReceiptSchema = new Schema<IDiscussionReadReceipt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    poolId: {
      type: Schema.Types.ObjectId,
      ref: 'Pool',
      required: [true, 'Pool ID is required'],
      index: true
    },
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
      index: true
    },
    readAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries

// Get read status for a user in a pool
DiscussionReadReceiptSchema.index({ userId: 1, poolId: 1 });

// Get read status for specific discussions
DiscussionReadReceiptSchema.index({ userId: 1, discussionId: 1 }, { unique: true, sparse: true });

// Compound index for checking if user has read a discussion
DiscussionReadReceiptSchema.index({ userId: 1, poolId: 1, discussionId: 1 });

// Note: discussionId field already has an index from index: true in schema definition

/**
 * Static method to mark a discussion as read
 */
DiscussionReadReceiptSchema.statics.markAsRead = async function(
  userId: string | Types.ObjectId,
  poolId: string | Types.ObjectId,
  discussionId: string | Types.ObjectId
) {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());
  const discussionObjectId = new mongoose.Types.ObjectId(discussionId.toString());

  return this.findOneAndUpdate(
    {
      userId: userObjectId,
      discussionId: discussionObjectId
    },
    {
      $set: {
        poolId: poolObjectId,
        readAt: new Date()
      },
      $setOnInsert: {
        userId: userObjectId,
        discussionId: discussionObjectId
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

/**
 * Static method to mark all discussions in a pool as read
 * This creates a special record without discussionId that acts as a "read before" marker
 */
DiscussionReadReceiptSchema.statics.markAllAsRead = async function(
  userId: string | Types.ObjectId,
  poolId: string | Types.ObjectId
) {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  return this.findOneAndUpdate(
    {
      userId: userObjectId,
      poolId: poolObjectId,
      discussionId: { $exists: false }
    },
    {
      $set: {
        readAt: new Date()
      },
      $setOnInsert: {
        userId: userObjectId,
        poolId: poolObjectId
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

/**
 * Static method to check if a user has read a discussion
 */
DiscussionReadReceiptSchema.statics.hasRead = async function(
  userId: string | Types.ObjectId,
  discussionId: string | Types.ObjectId,
  discussionCreatedAt: Date
): Promise<boolean> {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const discussionObjectId = new mongoose.Types.ObjectId(discussionId.toString());

  // Check for specific discussion read
  const specificRead = await this.findOne({
    userId: userObjectId,
    discussionId: discussionObjectId
  });

  if (specificRead) {
    return true;
  }

  // Check for "mark all as read" that happened after discussion was created
  const bulkRead = await this.findOne({
    userId: userObjectId,
    discussionId: { $exists: false },
    readAt: { $gte: discussionCreatedAt }
  });

  return !!bulkRead;
};

/**
 * Static method to get unread discussion count for a user in a pool
 */
DiscussionReadReceiptSchema.statics.getUnreadCount = async function(
  userId: string | Types.ObjectId,
  poolId: string | Types.ObjectId
): Promise<number> {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  // Get the "mark all as read" timestamp if it exists
  const bulkReadRecord = await this.findOne({
    userId: userObjectId,
    poolId: poolObjectId,
    discussionId: { $exists: false }
  });

  const bulkReadAt = bulkReadRecord?.readAt || new Date(0);

  // Get IDs of specifically read discussions
  const readDiscussionIds = await this.find({
    userId: userObjectId,
    poolId: poolObjectId,
    discussionId: { $exists: true }
  }).distinct('discussionId');

  // Import Discussion model to count unread
  const Discussion = mongoose.model('Discussion');

  return Discussion.countDocuments({
    poolId: poolObjectId,
    deleted: false,
    parentId: { $exists: false }, // Only count top-level posts
    createdAt: { $gt: bulkReadAt },
    _id: { $nin: readDiscussionIds }
  });
};

/**
 * Static method to get read discussion IDs for a user in a pool
 */
DiscussionReadReceiptSchema.statics.getReadDiscussionIds = async function(
  userId: string | Types.ObjectId,
  poolId: string | Types.ObjectId
): Promise<Types.ObjectId[]> {
  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const receipts = await this.find({
    userId: userObjectId,
    poolId: poolObjectId,
    discussionId: { $exists: true }
  }).distinct('discussionId');

  return receipts;
};

// Create and export the model
export function getDiscussionReadReceiptModel(): IDiscussionReadReceiptModel {
  const modelName = 'DiscussionReadReceipt';
  return (mongoose.models[modelName] || mongoose.model<IDiscussionReadReceipt, IDiscussionReadReceiptModel>(modelName, DiscussionReadReceiptSchema)) as IDiscussionReadReceiptModel;
}

export const DiscussionReadReceipt = getDiscussionReadReceiptModel();

export default DiscussionReadReceipt;
