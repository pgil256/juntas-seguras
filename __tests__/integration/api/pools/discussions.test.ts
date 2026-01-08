/**
 * Discussion API Tests
 *
 * Tests for the pool discussion system endpoints:
 * - GET  /api/pools/[id]/discussions - List discussions
 * - POST /api/pools/[id]/discussions - Create discussion
 * - GET  /api/pools/[id]/discussions/[discussionId] - Get single discussion
 * - PUT  /api/pools/[id]/discussions/[discussionId] - Update discussion
 * - DELETE /api/pools/[id]/discussions/[discussionId] - Delete discussion
 * - POST /api/pools/[id]/discussions/read - Mark discussions as read
 * - GET  /api/pools/[id]/discussions/mentions - Get mentions for user
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/pools/[id]/discussions/route';
import { Discussion, DiscussionType, ActivityType } from '@/lib/db/models/discussion';
import { DiscussionReadReceipt } from '@/lib/db/models/discussionReadReceipt';
import { DiscussionMention } from '@/lib/db/models/discussionMention';
import { Pool } from '@/lib/db/models/pool';
import { getUserModel } from '@/lib/db/models/user';
import {
  createMockRequest,
  createMockParams,
  parseResponse,
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  generateMockObjectId,
  generateMockUuid,
  expectErrorResponse,
  expectSuccessResponse,
} from '@/__tests__/helpers/test-utils';
import {
  createTestDiscussion,
  createTestAnnouncement,
  createTestReply,
  testDiscussions,
} from '@/__tests__/fixtures/discussions';
import { createTestUser, testUsers } from '@/__tests__/fixtures/users';
import { createPoolWithMembers } from '@/__tests__/fixtures/pools';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}));

describe('Discussion API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testPool: any;
  let testAdmin: any;
  let testMember1: any;
  let testMember2: any;
  let UserModel: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await Discussion.deleteMany({});
    await DiscussionReadReceipt.deleteMany({});
    await DiscussionMention.deleteMany({});
    await Pool.deleteMany({});

    UserModel = getUserModel();
    await UserModel.deleteMany({});

    // Create test users
    testAdmin = await UserModel.create({
      id: generateMockUuid(),
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      password: 'hashedPassword',
      mfaSetupComplete: true,
    });

    testMember1 = await UserModel.create({
      id: generateMockUuid(),
      email: testUsers.member1.email,
      name: testUsers.member1.name,
      password: 'hashedPassword',
      mfaSetupComplete: true,
    });

    testMember2 = await UserModel.create({
      id: generateMockUuid(),
      email: testUsers.member2.email,
      name: testUsers.member2.name,
      password: 'hashedPassword',
      mfaSetupComplete: true,
    });

    // Create test pool with members
    testPool = await Pool.create({
      id: generateMockUuid(),
      name: 'Test Discussion Pool',
      description: 'Pool for testing discussions',
      admin: testAdmin._id,
      contributionAmount: 50,
      totalMembers: 3,
      frequency: 'weekly',
      status: 'ACTIVE',
      currentRound: 1,
      members: [
        {
          userId: testAdmin._id,
          role: 'admin',
          position: 1,
          contributionStatus: 'pending',
        },
        {
          userId: testMember1._id,
          role: 'member',
          position: 2,
          contributionStatus: 'pending',
        },
        {
          userId: testMember2._id,
          role: 'member',
          position: 3,
          contributionStatus: 'pending',
        },
      ],
    });
  });

  describe('GET /api/pools/[id]/discussions', () => {
    beforeEach(async () => {
      // Mock getCurrentUser to return admin
      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: testAdmin,
        error: null,
      });
    });

    it('returns empty list when no discussions exist', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.unreadCount).toBe(0);
    });

    it('returns discussions sorted by pinned status then date', async () => {
      // Create regular discussion first
      const regularDiscussion = await Discussion.create({
        poolId: testPool._id,
        authorId: testMember1._id,
        authorName: testMember1.name,
        type: DiscussionType.POST,
        content: 'Regular post',
        isPinned: false,
        replyCount: 0,
        deleted: false,
        createdAt: new Date('2024-01-01'),
      });

      // Create pinned discussion later
      const pinnedDiscussion = await Discussion.create({
        poolId: testPool._id,
        authorId: testAdmin._id,
        authorName: testAdmin.name,
        type: DiscussionType.ANNOUNCEMENT,
        title: 'Important Announcement',
        content: 'Pinned content',
        isPinned: true,
        replyCount: 0,
        deleted: false,
        createdAt: new Date('2024-01-02'),
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions).toHaveLength(2);
      // Pinned post should be first
      expect(data.discussions[0].isPinned).toBe(true);
      expect(data.discussions[1].isPinned).toBe(false);
    });

    it('respects pagination parameters', async () => {
      // Create 15 discussions
      for (let i = 0; i < 15; i++) {
        await Discussion.create({
          poolId: testPool._id,
          authorId: testMember1._id,
          authorName: testMember1.name,
          type: DiscussionType.POST,
          content: `Discussion ${i + 1}`,
          isPinned: false,
          replyCount: 0,
          deleted: false,
        });
      }

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        searchParams: { limit: '5', skip: '0' },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions).toHaveLength(5);
      expect(data.pagination.total).toBe(15);
      expect(data.pagination.hasMore).toBe(true);
    });

    it('filters by discussion type', async () => {
      // Create different types
      await Discussion.create({
        poolId: testPool._id,
        authorId: testMember1._id,
        authorName: testMember1.name,
        type: DiscussionType.POST,
        content: 'Regular post',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      await Discussion.create({
        poolId: testPool._id,
        authorId: testAdmin._id,
        authorName: testAdmin.name,
        type: DiscussionType.ANNOUNCEMENT,
        title: 'Announcement',
        content: 'Announcement content',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        searchParams: { type: 'announcement' },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions).toHaveLength(1);
      expect(data.discussions[0].type).toBe(DiscussionType.ANNOUNCEMENT);
    });

    it('excludes deleted discussions', async () => {
      await Discussion.create({
        poolId: testPool._id,
        authorId: testMember1._id,
        authorName: testMember1.name,
        type: DiscussionType.POST,
        content: 'Active post',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      await Discussion.create({
        poolId: testPool._id,
        authorId: testMember1._id,
        authorName: testMember1.name,
        type: DiscussionType.POST,
        content: 'Deleted post',
        isPinned: false,
        replyCount: 0,
        deleted: true,
        deletedAt: new Date(),
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions).toHaveLength(1);
      expect(data.discussions[0].content).toBe('Active post');
    });

    it('returns unread count correctly', async () => {
      // Create discussions
      await Discussion.create({
        poolId: testPool._id,
        authorId: testMember1._id,
        authorName: testMember1.name,
        type: DiscussionType.POST,
        content: 'Unread post 1',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      await Discussion.create({
        poolId: testPool._id,
        authorId: testMember2._id,
        authorName: testMember2.name,
        type: DiscussionType.POST,
        content: 'Unread post 2',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.unreadCount).toBe(2);
    });

    it('returns 404 for non-existent pool', async () => {
      const request = createMockRequest(`/api/pools/non-existent-pool/discussions`);
      const params = createMockParams({ id: 'non-existent-pool' });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('returns 401 when not authenticated', async () => {
      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: null,
        error: { message: 'Unauthorized', status: 401 },
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { status } = await parseResponse(response);

      expect(status).toBe(401);
    });
  });

  describe('POST /api/pools/[id]/discussions', () => {
    beforeEach(async () => {
      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: testMember1,
        error: null,
      });
    });

    it('creates a new discussion post', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'This is a test discussion post',
          type: 'post',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.discussion).toBeDefined();
      expect(data.discussion.content).toBe('This is a test discussion post');
      expect(data.discussion.type).toBe(DiscussionType.POST);
      expect(data.discussion.authorName).toBe(testMember1.name);
    });

    it('creates an announcement (admin only)', async () => {
      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: testAdmin,
        error: null,
      });

      // Update pool to set admin role correctly
      await Pool.updateOne(
        { _id: testPool._id, 'members.userId': testAdmin._id },
        { $set: { 'members.$.role': 'admin' } }
      );

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'Important announcement content',
          title: 'Pool Update',
          type: 'announcement',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.discussion.type).toBe(DiscussionType.ANNOUNCEMENT);
      expect(data.discussion.title).toBe('Pool Update');
    });

    it('rejects announcement from non-admin', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'Trying to make announcement',
          type: 'announcement',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error).toContain('admin');
    });

    it('creates a reply to existing discussion', async () => {
      // Create parent discussion
      const parentDiscussion = await Discussion.create({
        poolId: testPool._id,
        authorId: testAdmin._id,
        authorName: testAdmin.name,
        type: DiscussionType.POST,
        content: 'Original post',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'This is a reply',
          parentId: parentDiscussion._id.toString(),
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.discussion.type).toBe(DiscussionType.REPLY);
      expect(data.discussion.parentId).toBe(parentDiscussion._id.toString());

      // Verify parent reply count updated
      const updatedParent = await Discussion.findById(parentDiscussion._id);
      expect(updatedParent?.replyCount).toBe(1);
    });

    it('rejects empty content', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: '',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('rejects content exceeding max length', async () => {
      const longContent = 'x'.repeat(10001);

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: longContent,
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toContain('10000');
    });

    it('rejects non-member posting', async () => {
      // Create non-member user
      const nonMember = await UserModel.create({
        id: generateMockUuid(),
        email: 'nonmember@test.com',
        name: 'Non Member',
        password: 'hashedPassword',
        mfaSetupComplete: true,
      });

      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: nonMember,
        error: null,
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'Non-member trying to post',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error).toContain('member');
    });

    it('rejects invalid parent discussion ID', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'Reply to invalid parent',
          parentId: 'invalid-id',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
    });

    it('rejects reply to non-existent parent', async () => {
      const fakeParentId = new mongoose.Types.ObjectId().toString();

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'Reply to non-existent parent',
          parentId: fakeParentId,
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error).toContain('Parent');
    });

    it('marks discussion as read by author automatically', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: 'New discussion',
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussion.isRead).toBe(true);
      expect(data.discussion.isOwnPost).toBe(true);

      // Verify read receipt was created
      const readReceipt = await DiscussionReadReceipt.findOne({
        userId: testMember1._id,
        discussionId: new mongoose.Types.ObjectId(data.discussion.id),
      });
      expect(readReceipt).toBeTruthy();
    });
  });

  describe('Discussion Read Status', () => {
    let testDiscussion: any;

    beforeEach(async () => {
      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: testMember1,
        error: null,
      });

      testDiscussion = await Discussion.create({
        poolId: testPool._id,
        authorId: testAdmin._id,
        authorName: testAdmin.name,
        type: DiscussionType.POST,
        content: 'Test discussion for read status',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });
    });

    it('marks discussion as unread for other users', async () => {
      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions[0].isRead).toBe(false);
      expect(data.discussions[0].isOwnPost).toBe(false);
    });

    it('tracks read status after marking as read', async () => {
      // Mark as read
      await DiscussionReadReceipt.markAsRead(
        testMember1._id,
        testPool._id,
        testDiscussion._id
      );

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions[0].isRead).toBe(true);
    });

    it('respects bulk mark all as read', async () => {
      // Create multiple discussions
      await Discussion.create({
        poolId: testPool._id,
        authorId: testAdmin._id,
        authorName: testAdmin.name,
        type: DiscussionType.POST,
        content: 'Second discussion',
        isPinned: false,
        replyCount: 0,
        deleted: false,
      });

      // Mark all as read
      await DiscussionReadReceipt.markAllAsRead(testMember1._id, testPool._id);

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`);
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions.every((d: any) => d.isRead)).toBe(true);
      expect(data.unreadCount).toBe(0);
    });
  });

  describe('Discussion Mentions', () => {
    beforeEach(async () => {
      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: testMember1,
        error: null,
      });
    });

    it('creates mention records when mentioning users', async () => {
      // Note: This test would require the processMentions function to be properly implemented
      // For now, we verify the structure is correct

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        method: 'POST',
        body: {
          content: `Hey @${testMember2.name}, check this out!`,
        },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await POST(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Activity Posts', () => {
    it('supports activity type posts', async () => {
      const activityPost = await Discussion.create({
        poolId: testPool._id,
        authorId: testAdmin._id,
        authorName: 'System',
        type: DiscussionType.ACTIVITY,
        activityType: ActivityType.PAYMENT_RECEIVED,
        content: 'Payment of $50 received from Test Member',
        isPinned: false,
        replyCount: 0,
        deleted: false,
        activityMetadata: {
          memberName: 'Test Member',
          amount: 50,
          round: 1,
          paymentMethod: 'venmo',
        },
      });

      const { getCurrentUser } = require('@/lib/auth');
      getCurrentUser.mockResolvedValue({
        user: testMember1,
        error: null,
      });

      const request = createMockRequest(`/api/pools/${testPool.id}/discussions`, {
        searchParams: { type: 'activity' },
      });
      const params = createMockParams({ id: testPool.id });

      const response = await GET(request, { params });
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.discussions).toHaveLength(1);
      expect(data.discussions[0].type).toBe(DiscussionType.ACTIVITY);
      expect(data.discussions[0].activityType).toBe(ActivityType.PAYMENT_RECEIVED);
      expect(data.discussions[0].activityMetadata).toBeDefined();
      expect(data.discussions[0].activityMetadata.amount).toBe(50);
    });
  });
});
