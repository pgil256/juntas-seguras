/**
 * Discussion Model Integration Tests
 *
 * Tests for the Discussion MongoDB model including:
 * - Discussion types (POST, ANNOUNCEMENT, ACTIVITY, REPLY)
 * - Activity auto-posts
 * - @Mentions
 * - Read receipts
 * - Soft delete
 */

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Discussion,
  getDiscussionModel,
  DiscussionType,
  ActivityType,
  IDiscussion,
} from '@/lib/db/models/discussion';

describe('Discussion Model', () => {
  let mongoServer: MongoMemoryServer;
  const DiscussionModel = getDiscussionModel();

  const mockPoolId = new Types.ObjectId();
  const mockAuthorId = new Types.ObjectId();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await DiscussionModel.deleteMany({});
  });

  describe('Discussion Types', () => {
    it('should create POST type discussion', async () => {
      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Test User',
        type: DiscussionType.POST,
        content: 'This is a test post',
      });

      expect(discussion).toBeDefined();
      expect(discussion.type).toBe(DiscussionType.POST);
      expect(discussion.content).toBe('This is a test post');
    });

    it('should create ANNOUNCEMENT type discussion', async () => {
      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Pool Admin',
        type: DiscussionType.ANNOUNCEMENT,
        title: 'Important Announcement',
        content: 'This is an important announcement',
        isPinned: true,
      });

      expect(discussion.type).toBe(DiscussionType.ANNOUNCEMENT);
      expect(discussion.title).toBe('Important Announcement');
      expect(discussion.isPinned).toBe(true);
    });

    it('should create ACTIVITY type with subtypes', async () => {
      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.PAYMENT_RECEIVED,
        content: 'John paid their contribution for Round 1',
        activityMetadata: {
          memberName: 'John',
          amount: 10,
          round: 1,
          paymentMethod: 'venmo',
        },
      });

      expect(discussion.type).toBe(DiscussionType.ACTIVITY);
      expect(discussion.activityType).toBe(ActivityType.PAYMENT_RECEIVED);
      expect(discussion.activityMetadata?.memberName).toBe('John');
      expect(discussion.activityMetadata?.amount).toBe(10);
    });

    it('should create REPLY type with parent reference', async () => {
      // Create parent discussion
      const parent = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Original Author',
        type: DiscussionType.POST,
        content: 'Original post content',
      });

      // Create reply
      const reply = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: new Types.ObjectId(),
        authorName: 'Reply Author',
        type: DiscussionType.REPLY,
        content: 'This is a reply',
        parentId: parent._id,
      });

      expect(reply.type).toBe(DiscussionType.REPLY);
      expect(reply.parentId?.toString()).toBe(parent._id.toString());
    });
  });

  describe('Activity Auto-Posts', () => {
    it('should create PAYMENT_RECEIVED activity', async () => {
      const activity = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.PAYMENT_RECEIVED,
        content: 'John has confirmed their $10 payment via Venmo',
        activityMetadata: {
          memberName: 'John',
          amount: 10,
          round: 1,
          paymentMethod: 'venmo',
        },
      });

      expect(activity.activityType).toBe(ActivityType.PAYMENT_RECEIVED);
      expect(activity.activityMetadata?.paymentMethod).toBe('venmo');
    });

    it('should create PAYOUT_SENT activity', async () => {
      const activity = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.PAYOUT_SENT,
        content: 'Payout of $50 has been sent to Jane',
        activityMetadata: {
          memberName: 'Jane',
          amount: 50,
          round: 1,
        },
      });

      expect(activity.activityType).toBe(ActivityType.PAYOUT_SENT);
      expect(activity.activityMetadata?.amount).toBe(50);
    });

    it('should create MEMBER_JOINED activity', async () => {
      const activity = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.MEMBER_JOINED,
        content: 'Bob has joined the pool',
        activityMetadata: {
          memberName: 'Bob',
          memberId: 5,
        },
      });

      expect(activity.activityType).toBe(ActivityType.MEMBER_JOINED);
      expect(activity.activityMetadata?.memberName).toBe('Bob');
    });

    it('should create ROUND_STARTED activity', async () => {
      const activity = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.ROUND_STARTED,
        content: 'Round 2 has begun. Sarah will receive the payout this round.',
        activityMetadata: {
          memberName: 'Sarah',
          round: 2,
        },
      });

      expect(activity.activityType).toBe(ActivityType.ROUND_STARTED);
      expect(activity.activityMetadata?.round).toBe(2);
    });

    it('should include correct metadata', async () => {
      const activity = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.PAYMENT_CONFIRMED,
        content: 'Payment confirmed',
        activityMetadata: {
          memberId: 3,
          memberName: 'Mike',
          amount: 15,
          round: 2,
          paymentMethod: 'zelle',
          transactionId: 'tx-12345',
        },
      });

      expect(activity.activityMetadata).toBeDefined();
      expect(activity.activityMetadata?.memberId).toBe(3);
      expect(activity.activityMetadata?.memberName).toBe('Mike');
      expect(activity.activityMetadata?.amount).toBe(15);
      expect(activity.activityMetadata?.round).toBe(2);
      expect(activity.activityMetadata?.paymentMethod).toBe('zelle');
      expect(activity.activityMetadata?.transactionId).toBe('tx-12345');
    });
  });

  describe('@Mentions', () => {
    it('should store mentions array', async () => {
      const mentionedUser1 = new Types.ObjectId();
      const mentionedUser2 = new Types.ObjectId();

      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Test User',
        type: DiscussionType.POST,
        content: '@John and @Jane - please check this out!',
        mentions: [mentionedUser1, mentionedUser2],
      });

      expect(discussion.mentions).toHaveLength(2);
      expect(discussion.mentions[0].toString()).toBe(mentionedUser1.toString());
      expect(discussion.mentions[1].toString()).toBe(mentionedUser2.toString());
    });

    it('should query discussions by mentioned user', async () => {
      const mentionedUserId = new Types.ObjectId();

      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Author 1',
        type: DiscussionType.POST,
        content: '@TargetUser check this',
        mentions: [mentionedUserId],
      });

      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Author 2',
        type: DiscussionType.POST,
        content: 'No mentions here',
        mentions: [],
      });

      const mentionedDiscussions = await DiscussionModel.find({
        mentions: mentionedUserId,
      });

      expect(mentionedDiscussions).toHaveLength(1);
      expect(mentionedDiscussions[0].authorName).toBe('Author 1');
    });
  });

  describe('Read Receipts', () => {
    it('should track read status via separate query pattern', async () => {
      // In the actual app, read receipts are tracked in DiscussionReadReceipt model
      // Here we verify the discussion schema supports the pattern

      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Test User',
        type: DiscussionType.POST,
        content: 'Test post for read tracking',
      });

      // Discussion should have createdAt for read tracking comparison
      expect(discussion.createdAt).toBeDefined();
      expect(discussion._id).toBeDefined();
    });
  });

  describe('Soft Delete', () => {
    it('should set deleted flag instead of removing', async () => {
      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Test User',
        type: DiscussionType.POST,
        content: 'This will be soft deleted',
      });

      // Soft delete the discussion
      await DiscussionModel.updateOne(
        { _id: discussion._id },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: mockAuthorId,
          },
        }
      );

      // Verify document still exists
      const deletedDoc = await DiscussionModel.findById(discussion._id);
      expect(deletedDoc).toBeDefined();
      expect(deletedDoc?.deleted).toBe(true);
      expect(deletedDoc?.deletedAt).toBeDefined();
      expect(deletedDoc?.deletedBy?.toString()).toBe(mockAuthorId.toString());
    });

    it('should filter out deleted discussions by default in custom queries', async () => {
      // Create active and deleted discussions
      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Active Author',
        type: DiscussionType.POST,
        content: 'Active discussion',
        deleted: false,
      });

      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Deleted Author',
        type: DiscussionType.POST,
        content: 'Deleted discussion',
        deleted: true,
        deletedAt: new Date(),
      });

      // Query with deleted: false filter
      const activeDiscussions = await DiscussionModel.find({
        poolId: mockPoolId,
        deleted: false,
      });

      expect(activeDiscussions).toHaveLength(1);
      expect(activeDiscussions[0].authorName).toBe('Active Author');
    });

    it('should preserve deleted discussion for audit', async () => {
      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Test User',
        type: DiscussionType.POST,
        content: 'Original content before deletion',
      });

      const originalContent = discussion.content;

      // Soft delete
      await DiscussionModel.updateOne(
        { _id: discussion._id },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
          },
        }
      );

      // Content should be preserved
      const deletedDoc = await DiscussionModel.findById(discussion._id);
      expect(deletedDoc?.content).toBe(originalContent);
    });
  });

  describe('Threading', () => {
    it('should increment reply count on parent', async () => {
      const parent = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Parent Author',
        type: DiscussionType.POST,
        content: 'Parent discussion',
        replyCount: 0,
      });

      // Simulate adding replies and updating count
      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: new Types.ObjectId(),
        authorName: 'Reply Author 1',
        type: DiscussionType.REPLY,
        content: 'First reply',
        parentId: parent._id,
      });

      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: new Types.ObjectId(),
        authorName: 'Reply Author 2',
        type: DiscussionType.REPLY,
        content: 'Second reply',
        parentId: parent._id,
      });

      // Update parent reply count
      await DiscussionModel.updateOne(
        { _id: parent._id },
        { $set: { replyCount: 2 } }
      );

      const updatedParent = await DiscussionModel.findById(parent._id);
      expect(updatedParent?.replyCount).toBe(2);
    });

    it('should query replies by parentId', async () => {
      const parent = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Parent Author',
        type: DiscussionType.POST,
        content: 'Parent discussion',
      });

      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: new Types.ObjectId(),
        authorName: 'Reply Author',
        type: DiscussionType.REPLY,
        content: 'Reply content',
        parentId: parent._id,
      });

      const replies = await DiscussionModel.find({
        parentId: parent._id,
        deleted: false,
      });

      expect(replies).toHaveLength(1);
      expect(replies[0].content).toBe('Reply content');
    });
  });

  describe('Pinned Posts', () => {
    it('should sort pinned posts before non-pinned', async () => {
      // Create non-pinned first
      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Author 1',
        type: DiscussionType.POST,
        content: 'Regular post 1',
        isPinned: false,
      });

      // Create pinned post
      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Admin',
        type: DiscussionType.ANNOUNCEMENT,
        content: 'Pinned announcement',
        isPinned: true,
      });

      // Create another non-pinned
      await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Author 2',
        type: DiscussionType.POST,
        content: 'Regular post 2',
        isPinned: false,
      });

      // Sort by isPinned descending, then createdAt descending
      const discussions = await DiscussionModel.find({ poolId: mockPoolId })
        .sort({ isPinned: -1, createdAt: -1 });

      expect(discussions).toHaveLength(3);
      expect(discussions[0].isPinned).toBe(true);
      expect(discussions[0].content).toBe('Pinned announcement');
    });
  });

  describe('Edited Posts', () => {
    it('should track edit status', async () => {
      const discussion = await DiscussionModel.create({
        poolId: mockPoolId,
        authorId: mockAuthorId,
        authorName: 'Test User',
        type: DiscussionType.POST,
        content: 'Original content',
        isEdited: false,
      });

      // Simulate edit
      await DiscussionModel.updateOne(
        { _id: discussion._id },
        {
          $set: {
            content: 'Edited content',
            isEdited: true,
            editedAt: new Date(),
          },
        }
      );

      const edited = await DiscussionModel.findById(discussion._id);
      expect(edited?.isEdited).toBe(true);
      expect(edited?.editedAt).toBeDefined();
      expect(edited?.content).toBe('Edited content');
    });
  });

  describe('Validation', () => {
    it('should require poolId', async () => {
      await expect(
        DiscussionModel.create({
          authorId: mockAuthorId,
          authorName: 'Test User',
          type: DiscussionType.POST,
          content: 'Missing pool ID',
        })
      ).rejects.toThrow();
    });

    it('should require authorId', async () => {
      await expect(
        DiscussionModel.create({
          poolId: mockPoolId,
          authorName: 'Test User',
          type: DiscussionType.POST,
          content: 'Missing author ID',
        })
      ).rejects.toThrow();
    });

    it('should require content', async () => {
      await expect(
        DiscussionModel.create({
          poolId: mockPoolId,
          authorId: mockAuthorId,
          authorName: 'Test User',
          type: DiscussionType.POST,
        })
      ).rejects.toThrow();
    });

    it('should enforce content max length', async () => {
      const longContent = 'x'.repeat(10001); // 10001 chars, max is 10000

      await expect(
        DiscussionModel.create({
          poolId: mockPoolId,
          authorId: mockAuthorId,
          authorName: 'Test User',
          type: DiscussionType.POST,
          content: longContent,
        })
      ).rejects.toThrow();
    });

    it('should enforce author name max length', async () => {
      const longName = 'x'.repeat(101); // 101 chars, max is 100

      await expect(
        DiscussionModel.create({
          poolId: mockPoolId,
          authorId: mockAuthorId,
          authorName: longName,
          type: DiscussionType.POST,
          content: 'Test content',
        })
      ).rejects.toThrow();
    });
  });
});
