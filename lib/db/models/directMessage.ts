/**
 * DirectMessage Model - MongoDB schema for one-on-one messages between pool members
 *
 * This model handles private messages between two members within a pool context.
 * Unlike pool messages (group chat), these are only visible to the two participants.
 *
 * Data Flow:
 * 1. User opens MemberMessageDialog from member management page
 * 2. Frontend hook calls POST /api/pools/[id]/members/messages
 * 3. API route creates DirectMessage document in MongoDB
 * 4. Message is returned to client and added to local state
 * 5. Messages persist across server restarts in MongoDB
 *
 * Key Design Decisions:
 * - Messages are scoped to a pool, so the same two users can have separate
 *   conversations in different pools
 * - participants array is stored sorted to ensure consistent querying
 *   regardless of who sends/receives
 * - senderId identifies who wrote each message within the conversation
 *
 * Performance Considerations:
 * - Compound index on (poolId, participants, createdAt) for efficient retrieval
 * - participants array is always sorted to ensure index hits
 * - Pagination support for long conversations
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// TypeScript interface for DirectMessage document
export interface IDirectMessage extends Document {
  _id: Types.ObjectId;
  poolId: Types.ObjectId;           // Reference to the Pool (context for the conversation)
  participants: Types.ObjectId[];   // Sorted array of two user IDs in this conversation
  senderId: Types.ObjectId;         // Reference to the User who sent this specific message
  senderName: string;               // Cached sender name for display
  content: string;                  // Message text content
  createdAt: Date;                  // When the message was sent
  updatedAt: Date;                  // When the message was last updated
  readAt: Date | null;              // When the recipient read the message (optional)
  deleted: boolean;                 // Soft delete flag
}

// DirectMessage schema definition
const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    poolId: {
      type: Schema.Types.ObjectId,
      ref: 'Pool',
      required: [true, 'Pool ID is required'],
      index: true
    },
    participants: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }],
      required: [true, 'Participants are required'],
      validate: {
        validator: function(v: Types.ObjectId[]) {
          return v.length === 2;
        },
        message: 'Direct messages must have exactly 2 participants'
      }
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required']
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
    readAt: {
      type: Date,
      default: null
    },
    deleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/**
 * Compound index for efficient conversation retrieval
 * Query pattern: get all messages between two users in a pool, sorted by time
 *
 * Note: The participants array must be sorted before saving to ensure
 * consistent index usage regardless of who initiates the query
 */
DirectMessageSchema.index({ poolId: 1, participants: 1, createdAt: -1 });

/**
 * Index for finding unread messages for a user
 */
DirectMessageSchema.index({ poolId: 1, participants: 1, readAt: 1 });

/**
 * Pre-save hook to ensure participants array is always sorted
 * This ensures consistent querying - [userA, userB] and [userB, userA]
 * will always be stored as the same sorted array
 */
DirectMessageSchema.pre('save', function(next) {
  if (this.participants && this.participants.length === 2) {
    // Sort participants by their string representation for consistent ordering
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

/**
 * Virtual property to get message ID as a number for backwards compatibility
 */
DirectMessageSchema.virtual('numericId').get(function() {
  return this._id.getTimestamp().getTime();
});

// Ensure virtuals are included when converting to JSON
DirectMessageSchema.set('toJSON', { virtuals: true });
DirectMessageSchema.set('toObject', { virtuals: true });

/**
 * Helper function to create sorted participants array
 * Use this when querying to ensure you hit the index correctly
 *
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Sorted array of ObjectIds
 */
export function getSortedParticipants(
  userId1: string | Types.ObjectId,
  userId2: string | Types.ObjectId
): Types.ObjectId[] {
  const id1 = new mongoose.Types.ObjectId(userId1.toString());
  const id2 = new mongoose.Types.ObjectId(userId2.toString());
  return [id1, id2].sort((a, b) => a.toString().localeCompare(b.toString()));
}

/**
 * Static method to get messages between two users in a pool
 *
 * @param poolId - The pool ID (conversation context)
 * @param userId1 - First participant's user ID
 * @param userId2 - Second participant's user ID
 * @param options - Pagination options
 * @returns Array of messages sorted by createdAt descending
 */
DirectMessageSchema.statics.getConversation = async function(
  poolId: string | Types.ObjectId,
  userId1: string | Types.ObjectId,
  userId2: string | Types.ObjectId,
  options: { limit?: number; skip?: number; before?: Date } = {}
) {
  const { limit = 50, skip = 0, before } = options;
  const sortedParticipants = getSortedParticipants(userId1, userId2);

  const query: any = {
    poolId: new mongoose.Types.ObjectId(poolId.toString()),
    participants: { $all: sortedParticipants },
    deleted: false
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Static method to mark messages as read
 *
 * @param poolId - The pool ID
 * @param readerId - The user ID marking messages as read
 * @param otherUserId - The other participant in the conversation
 * @returns Update result
 */
DirectMessageSchema.statics.markAsRead = async function(
  poolId: string | Types.ObjectId,
  readerId: string | Types.ObjectId,
  otherUserId: string | Types.ObjectId
) {
  const sortedParticipants = getSortedParticipants(readerId, otherUserId);
  const readerObjectId = new mongoose.Types.ObjectId(readerId.toString());

  // Only mark messages as read if they were sent by the other user
  return this.updateMany(
    {
      poolId: new mongoose.Types.ObjectId(poolId.toString()),
      participants: { $all: sortedParticipants },
      senderId: { $ne: readerObjectId },  // Don't mark own messages
      readAt: null,
      deleted: false
    },
    {
      $set: { readAt: new Date() }
    }
  );
};

// Create and export the model
export function getDirectMessageModel(): Model<IDirectMessage> {
  const modelName = 'DirectMessage';
  return mongoose.models[modelName] || mongoose.model<IDirectMessage>(modelName, DirectMessageSchema);
}

export const DirectMessage = getDirectMessageModel();

export default DirectMessage;
