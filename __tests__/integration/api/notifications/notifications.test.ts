/**
 * Notification API Tests
 *
 * Tests for the notification system endpoints:
 * - GET  /api/notifications - Get user notifications
 * - POST /api/notifications - Perform notification actions (mark read, delete, preferences)
 * - PUT  /api/notifications - Create a new notification
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { GET, POST, PUT } from '@/app/api/notifications/route';
import { getUserModel } from '@/lib/db/models/user';
import {
  createMockRequest,
  parseResponse,
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  generateMockUuid,
  expectErrorResponse,
  expectSuccessResponse,
} from '@/__tests__/helpers/test-utils';
import {
  createTestNotification,
  createPaymentNotification,
  createTransactionNotification,
  createPoolNotification,
  defaultNotificationPreferences,
  generateMixedNotifications,
  testNotifications,
} from '@/__tests__/fixtures/notifications';
import { createTestUser, testUsers } from '@/__tests__/fixtures/users';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

describe('Notification API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testUser2: any;
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
    // Clear collections
    UserModel = getUserModel();
    await UserModel.deleteMany({});

    // Clear notifications collection
    const db = mongoose.connection.db;
    if (db) {
      try {
        await db.collection('notifications').deleteMany({});
      } catch (e) {
        // Collection might not exist yet
      }
    }

    // Create test users
    testUser = await UserModel.create({
      id: generateMockUuid(),
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      password: 'hashedPassword',
      mfaSetupComplete: true,
      notificationPreferences: defaultNotificationPreferences,
    });

    testUser2 = await UserModel.create({
      id: generateMockUuid(),
      email: testUsers.member1.email,
      name: testUsers.member1.name,
      password: 'hashedPassword',
      mfaSetupComplete: true,
    });

    // Mock authenticated session
    const { getServerSession } = require('next-auth/next');
    getServerSession.mockResolvedValue({
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  describe('GET /api/notifications', () => {
    it('returns empty notifications list for new user', async () => {
      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notifications).toEqual([]);
      expect(data.unreadCount).toBe(0);
      expect(data.preferences).toBeDefined();
    });

    it('returns notifications for authenticated user', async () => {
      // Insert test notifications
      const db = mongoose.connection.db;
      if (db) {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertMany([
          {
            id: 1,
            userId: testUser.id,
            message: 'Payment reminder',
            type: 'payment',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 2,
            userId: testUser.id,
            message: 'Transaction completed',
            type: 'transaction',
            date: new Date().toISOString(),
            read: true,
          },
        ]);
      }

      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(data.unreadCount).toBe(1); // Only one unread
    });

    it('returns correct unread count', async () => {
      // Insert multiple unread notifications
      const db = mongoose.connection.db;
      if (db) {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertMany([
          {
            id: 1,
            userId: testUser.id,
            message: 'Notification 1',
            type: 'payment',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 2,
            userId: testUser.id,
            message: 'Notification 2',
            type: 'pool',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 3,
            userId: testUser.id,
            message: 'Notification 3',
            type: 'system',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 4,
            userId: testUser.id,
            message: 'Notification 4',
            type: 'invite',
            date: new Date().toISOString(),
            read: true,
          },
        ]);
      }

      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notifications).toHaveLength(4);
      expect(data.unreadCount).toBe(3);
    });

    it('returns user notification preferences', async () => {
      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.preferences).toBeDefined();
      expect(data.preferences).toHaveLength(defaultNotificationPreferences.length);
      expect(data.preferences[0]).toHaveProperty('id');
      expect(data.preferences[0]).toHaveProperty('email');
      expect(data.preferences[0]).toHaveProperty('push');
    });

    it('returns default preferences if user has none', async () => {
      // Create user without preferences
      const userWithoutPrefs = await UserModel.create({
        id: generateMockUuid(),
        email: 'noprefs@test.com',
        name: 'No Prefs User',
        password: 'hashedPassword',
        mfaSetupComplete: true,
      });

      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: userWithoutPrefs.id,
          email: userWithoutPrefs.email,
          name: userWithoutPrefs.name,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.preferences).toBeDefined();
      expect(data.preferences.length).toBeGreaterThan(0);
    });

    it('returns 401 when not authenticated', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('only returns notifications for the authenticated user', async () => {
      // Insert notifications for different users
      const db = mongoose.connection.db;
      if (db) {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertMany([
          {
            id: 1,
            userId: testUser.id,
            message: 'My notification',
            type: 'payment',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 2,
            userId: testUser2.id,
            message: 'Other user notification',
            type: 'payment',
            date: new Date().toISOString(),
            read: false,
          },
        ]);
      }

      const request = createMockRequest('/api/notifications');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0].message).toBe('My notification');
    });
  });

  describe('POST /api/notifications - markAsRead', () => {
    beforeEach(async () => {
      // Insert a test notification
      const db = mongoose.connection.db;
      if (db) {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertOne({
          id: 1,
          userId: testUser.id,
          message: 'Test notification',
          type: 'payment',
          date: new Date().toISOString(),
          read: false,
        });
      }
    });

    it('marks a notification as read', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'markAsRead',
          id: 1,
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify notification was marked as read
      const db = mongoose.connection.db;
      if (db) {
        const notification = await db
          .collection('notifications')
          .findOne({ id: 1, userId: testUser.id });
        expect(notification?.read).toBe(true);
      }
    });

    it('returns error without notification id', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'markAsRead',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });
  });

  describe('POST /api/notifications - markAllAsRead', () => {
    beforeEach(async () => {
      // Insert multiple unread notifications
      const db = mongoose.connection.db;
      if (db) {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertMany([
          {
            id: 1,
            userId: testUser.id,
            message: 'Notification 1',
            type: 'payment',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 2,
            userId: testUser.id,
            message: 'Notification 2',
            type: 'pool',
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 3,
            userId: testUser.id,
            message: 'Notification 3',
            type: 'system',
            date: new Date().toISOString(),
            read: false,
          },
        ]);
      }
    });

    it('marks all notifications as read', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'markAllAsRead',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify all notifications are marked as read
      const db = mongoose.connection.db;
      if (db) {
        const unreadCount = await db
          .collection('notifications')
          .countDocuments({ userId: testUser.id, read: false });
        expect(unreadCount).toBe(0);
      }
    });
  });

  describe('POST /api/notifications - deleteNotification', () => {
    beforeEach(async () => {
      const db = mongoose.connection.db;
      if (db) {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.insertOne({
          id: 1,
          userId: testUser.id,
          message: 'Test notification to delete',
          type: 'system',
          date: new Date().toISOString(),
          read: false,
        });
      }
    });

    it('deletes a notification', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'deleteNotification',
          id: 1,
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify notification was deleted
      const db = mongoose.connection.db;
      if (db) {
        const notification = await db
          .collection('notifications')
          .findOne({ id: 1, userId: testUser.id });
        expect(notification).toBeNull();
      }
    });
  });

  describe('POST /api/notifications - togglePreference', () => {
    it('toggles email preference', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'togglePreference',
          id: 'email_payment',
          type: 'email',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('toggles push preference', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'togglePreference',
          id: 'email_pool',
          type: 'push',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns error without preference id or type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'togglePreference',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });
  });

  describe('POST /api/notifications - savePreferences', () => {
    it('saves notification preferences', async () => {
      const newPreferences = [
        {
          id: 'email_payment',
          label: 'Payment Reminders',
          description: 'Get notified before payments are due',
          email: false,
          push: true,
        },
        {
          id: 'email_transaction',
          label: 'Transactions',
          description: 'When members make deposits or receive payouts',
          email: false,
          push: false,
        },
      ];

      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'savePreferences',
          preferences: newPreferences,
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns error without preferences data', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'savePreferences',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });
  });

  describe('POST /api/notifications - invalid action', () => {
    it('returns error for invalid action', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          action: 'invalidAction',
        },
      });

      const response = await POST(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('PUT /api/notifications - Create notification', () => {
    it('creates a new notification', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'New test notification',
          type: 'payment',
          isImportant: true,
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notification).toBeDefined();
      expect(data.notification.message).toBe('New test notification');
      expect(data.notification.type).toBe('payment');
      expect(data.notification.isImportant).toBe(true);
      expect(data.notification.read).toBe(false);
      expect(data.notification.userId).toBe(testUser.id);
    });

    it('sets correct defaults for new notification', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'Simple notification',
          type: 'system',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.read).toBe(false);
      expect(data.notification.date).toBeDefined();
      expect(data.notification.id).toBeDefined();
    });

    it('returns 401 when not authenticated', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'Test notification',
          type: 'system',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Notification Types', () => {
    it('supports payment notification type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'Payment due tomorrow',
          type: 'payment',
          isImportant: true,
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.type).toBe('payment');
    });

    it('supports transaction notification type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'Payment received from John',
          type: 'transaction',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.type).toBe('transaction');
    });

    it('supports pool notification type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'Pool status changed',
          type: 'pool',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.type).toBe('pool');
    });

    it('supports invite notification type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'You have been invited to join a pool',
          type: 'invite',
          isImportant: true,
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.type).toBe('invite');
    });

    it('supports alert notification type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'Missed payment alert',
          type: 'alert',
          isImportant: true,
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.type).toBe('alert');
    });

    it('supports system notification type', async () => {
      const request = createMockRequest('/api/notifications', {
        method: 'PUT',
        body: {
          message: 'System maintenance scheduled',
          type: 'system',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.notification.type).toBe('system');
    });
  });
});
