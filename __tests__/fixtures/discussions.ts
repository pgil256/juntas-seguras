import { faker } from '@faker-js/faker';
import { DiscussionType, ActivityType } from '../../lib/db/models/discussion';

/**
 * Discussion test fixture factory
 * Creates mock discussion data for testing purposes
 */

export interface TestDiscussion {
  poolId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  type: DiscussionType;
  activityType?: ActivityType;
  title?: string;
  content: string;
  parentId?: string;
  replyCount: number;
  mentions: string[];
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  activityMetadata?: {
    memberId?: number;
    memberName?: string;
    amount?: number;
    round?: number;
    paymentMethod?: string;
    transactionId?: string;
  };
  createdAt?: Date;
}

export interface TestDiscussionMention {
  discussionId: string;
  poolId: string;
  mentionedUserId: string;
  mentionedByUserId: string;
  mentionedByName: string;
  discussionType: string;
  discussionPreview: string;
  isRead: boolean;
  readAt?: Date;
  isNotified: boolean;
  notifiedAt?: Date;
}

export interface TestDiscussionReadReceipt {
  userId: string;
  poolId: string;
  discussionId?: string;
  readAt: Date;
}

/**
 * Creates a test discussion with optional overrides
 */
export const createTestDiscussion = (
  poolId: string,
  authorId: string,
  overrides: Partial<TestDiscussion> = {}
): TestDiscussion => ({
  poolId,
  authorId,
  authorName: faker.person.fullName(),
  authorAvatar: faker.image.avatar(),
  type: DiscussionType.POST,
  content: faker.lorem.paragraph(),
  replyCount: 0,
  mentions: [],
  isPinned: false,
  isEdited: false,
  deleted: false,
  createdAt: new Date(),
  ...overrides,
});

/**
 * Creates a test announcement (admin-only post)
 */
export const createTestAnnouncement = (
  poolId: string,
  authorId: string,
  overrides: Partial<TestDiscussion> = {}
): TestDiscussion =>
  createTestDiscussion(poolId, authorId, {
    type: DiscussionType.ANNOUNCEMENT,
    title: faker.lorem.sentence(),
    isPinned: true,
    ...overrides,
  });

/**
 * Creates a test reply to a discussion
 */
export const createTestReply = (
  poolId: string,
  authorId: string,
  parentId: string,
  overrides: Partial<TestDiscussion> = {}
): TestDiscussion =>
  createTestDiscussion(poolId, authorId, {
    type: DiscussionType.REPLY,
    parentId,
    ...overrides,
  });

/**
 * Creates a test activity post (auto-generated)
 */
export const createTestActivityPost = (
  poolId: string,
  authorId: string,
  activityType: ActivityType,
  overrides: Partial<TestDiscussion> = {}
): TestDiscussion =>
  createTestDiscussion(poolId, authorId, {
    type: DiscussionType.ACTIVITY,
    activityType,
    activityMetadata: {
      memberId: 1,
      memberName: faker.person.fullName(),
      amount: faker.number.int({ min: 10, max: 100 }),
      round: 1,
    },
    ...overrides,
  });

/**
 * Creates a test discussion with mentions
 */
export const createDiscussionWithMentions = (
  poolId: string,
  authorId: string,
  mentionedUserIds: string[],
  overrides: Partial<TestDiscussion> = {}
): TestDiscussion => {
  const mentionText = mentionedUserIds.map(() => '@user').join(' ');
  return createTestDiscussion(poolId, authorId, {
    content: `${faker.lorem.sentence()} ${mentionText}`,
    mentions: mentionedUserIds,
    ...overrides,
  });
};

/**
 * Creates a test discussion mention record
 */
export const createTestMention = (
  discussionId: string,
  poolId: string,
  mentionedUserId: string,
  mentionedByUserId: string,
  overrides: Partial<TestDiscussionMention> = {}
): TestDiscussionMention => ({
  discussionId,
  poolId,
  mentionedUserId,
  mentionedByUserId,
  mentionedByName: faker.person.fullName(),
  discussionType: DiscussionType.POST,
  discussionPreview: faker.lorem.sentence().substring(0, 100),
  isRead: false,
  isNotified: false,
  ...overrides,
});

/**
 * Creates a test read receipt
 */
export const createTestReadReceipt = (
  userId: string,
  poolId: string,
  discussionId?: string,
  overrides: Partial<TestDiscussionReadReceipt> = {}
): TestDiscussionReadReceipt => ({
  userId,
  poolId,
  discussionId,
  readAt: new Date(),
  ...overrides,
});

/**
 * Pre-defined test discussions for consistent testing
 */
export const testDiscussions = {
  generalPost: (poolId: string, authorId: string) =>
    createTestDiscussion(poolId, authorId, {
      content: 'This is a general discussion post for testing.',
    }),

  announcement: (poolId: string, authorId: string) =>
    createTestAnnouncement(poolId, authorId, {
      title: 'Important Pool Announcement',
      content: 'This is an important announcement that all members should read.',
    }),

  pinnedPost: (poolId: string, authorId: string) =>
    createTestDiscussion(poolId, authorId, {
      content: 'This is a pinned discussion post.',
      isPinned: true,
    }),

  editedPost: (poolId: string, authorId: string) =>
    createTestDiscussion(poolId, authorId, {
      content: 'This post has been edited.',
      isEdited: true,
      editedAt: new Date(),
    }),

  deletedPost: (poolId: string, authorId: string, deletedBy: string) =>
    createTestDiscussion(poolId, authorId, {
      content: 'This post has been deleted.',
      deleted: true,
      deletedAt: new Date(),
      deletedBy,
    }),

  paymentActivity: (poolId: string, authorId: string) =>
    createTestActivityPost(poolId, authorId, ActivityType.PAYMENT_RECEIVED, {
      content: 'Payment received from Test Member for Round 1.',
      activityMetadata: {
        memberName: 'Test Member',
        amount: 50,
        round: 1,
        paymentMethod: 'venmo',
      },
    }),

  payoutActivity: (poolId: string, authorId: string) =>
    createTestActivityPost(poolId, authorId, ActivityType.PAYOUT_COMPLETED, {
      content: 'Payout completed for Round 1.',
      activityMetadata: {
        memberName: 'Recipient Member',
        amount: 250,
        round: 1,
      },
    }),

  memberJoinedActivity: (poolId: string, authorId: string) =>
    createTestActivityPost(poolId, authorId, ActivityType.MEMBER_JOINED, {
      content: 'New member joined the pool.',
      activityMetadata: {
        memberName: 'New Member',
      },
    }),
};

/**
 * Generate multiple random test discussions
 */
export const generateTestDiscussions = (
  count: number,
  poolId: string,
  authorId: string
): TestDiscussion[] =>
  Array.from({ length: count }, () => createTestDiscussion(poolId, authorId));

/**
 * Generate a discussion thread (parent + replies)
 */
export const generateDiscussionThread = (
  poolId: string,
  authorId: string,
  replyAuthorIds: string[],
  parentId: string
): { parent: TestDiscussion; replies: TestDiscussion[] } => {
  const parent = createTestDiscussion(poolId, authorId, {
    replyCount: replyAuthorIds.length,
  });

  const replies = replyAuthorIds.map((replyAuthorId) =>
    createTestReply(poolId, replyAuthorId, parentId)
  );

  return { parent, replies };
};

/**
 * Activity type labels for display
 */
export const activityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.PAYMENT_RECEIVED]: 'Payment Received',
  [ActivityType.PAYMENT_CONFIRMED]: 'Payment Confirmed',
  [ActivityType.PAYOUT_SENT]: 'Payout Sent',
  [ActivityType.PAYOUT_COMPLETED]: 'Payout Completed',
  [ActivityType.MEMBER_JOINED]: 'Member Joined',
  [ActivityType.MEMBER_LEFT]: 'Member Left',
  [ActivityType.ROUND_STARTED]: 'Round Started',
  [ActivityType.ROUND_COMPLETED]: 'Round Completed',
  [ActivityType.POOL_CREATED]: 'Pool Created',
  [ActivityType.POOL_STATUS_CHANGED]: 'Pool Status Changed',
  [ActivityType.REMINDER_SENT]: 'Reminder Sent',
};
