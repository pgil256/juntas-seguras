/**
 * Message Model - MongoDB schema for pool group messages
 *
 * This model handles messages that are sent to the entire pool (group chat).
 * Each message is associated with a pool and a sender, storing the content
 * and timestamp for display and historical purposes.
 *
 * Data Flow:
 * 1. User sends message via pool detail page Discussion tab
 * 2. Frontend hook calls POST /api/pools/[id]/messages
 * 3. API route creates Message document in MongoDB
 * 4. Message is returned to client and added to local state
 * 5. Messages persist across server restarts in MongoDB
 *
 * Performance Considerations:
 * - Compound index on (poolId, createdAt) for efficient message retrieval
 * - Messages are typically fetched in descending order for newest-first display
 * - Pagination support via skip/limit for large message histories
 * - Consider archiving old messages if pools have very long lifespans
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// TypeScript interface for Message document
export interface IMessage extends Document {
  _id: Types.ObjectId;
  poolId: Types.ObjectId;           // Reference to the Pool this message belongs to
  senderId: Types.ObjectId;         // Reference to the User who sent the message
  senderName: string;               // Cached sender name for display (avoids joins)
  content: string;                  // Message text content
  createdAt: Date;                  // When the message was sent
  updatedAt: Date;                  // When the message was last updated (if edited)
  readBy: Types.ObjectId[];         // Array of user IDs who have read this message (optional feature)
  deleted: boolean;                 // Soft delete flag
}

// Message schema definition
const MessageSchema = new Schema<IMessage>(
  {
    poolId: {
      type: Schema.Types.ObjectId,
      ref: 'Pool',
      required: [true, 'Pool ID is required'],
      index: true  // Index for filtering messages by pool
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true  // Index for filtering messages by user
    },
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true,
      maxlength: [100, 'Sender name cannot exceed 100 characters']
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    deleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,  // Automatically adds createdAt and updatedAt fields
    versionKey: false  // Disable __v field
  }
);

/**
 * Compound index for efficient message retrieval by pool
 * This is the primary query pattern: get messages for a pool, sorted by time
 * The index allows MongoDB to efficiently filter by poolId and sort by createdAt
 * in a single index scan without an additional sort operation
 */
MessageSchema.index({ poolId: 1, createdAt: -1 });

/**
 * Index for soft-deleted message filtering
 * Allows efficient queries that exclude deleted messages
 */
MessageSchema.index({ poolId: 1, deleted: 1, createdAt: -1 });

/**
 * Virtual property to get message ID as a number for backwards compatibility
 * The frontend expects numeric IDs, so we use the timestamp portion of ObjectId
 */
MessageSchema.virtual('numericId').get(function() {
  return this._id.getTimestamp().getTime();
});

// Ensure virtuals are included when converting to JSON
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });

/**
 * Static method to get messages for a pool with pagination
 *
 * @param poolId - The pool ID to fetch messages for
 * @param options - Pagination options (limit, skip, before timestamp)
 * @returns Array of messages sorted by createdAt descending
 */
MessageSchema.statics.getMessagesForPool = async function(
  poolId: string | Types.ObjectId,
  options: { limit?: number; skip?: number; before?: Date } = {}
) {
  const { limit = 50, skip = 0, before } = options;

  const query: any = {
    poolId: new mongoose.Types.ObjectId(poolId.toString()),
    deleted: false
  };

  // Optional: filter messages before a certain timestamp for infinite scroll
  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .sort({ createdAt: -1 })  // Newest first for pagination, reverse on client if needed
    .skip(skip)
    .limit(limit)
    .lean();  // Use lean() for better performance when we don't need Mongoose documents
};

// Create and export the model
export function getMessageModel(): Model<IMessage> {
  const modelName = 'Message';
  return mongoose.models[modelName] || mongoose.model<IMessage>(modelName, MessageSchema);
}

export const Message = getMessageModel();

export default Message;
