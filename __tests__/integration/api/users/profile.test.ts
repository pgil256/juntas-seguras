/**
 * User Profile API Tests
 *
 * Tests for the user profile management endpoints:
 * - GET   /api/users/profile - Get current user profile
 * - PUT   /api/users/profile - Update user profile (full update)
 * - PATCH /api/users/profile - Partial update of user profile
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { GET, PUT, PATCH } from '@/app/api/users/profile/route';
import { getUserModel } from '@/lib/db/models/user';
import {
  createMockRequest,
  parseResponse,
  generateMockUuid,
  expectErrorResponse,
  expectSuccessResponse,
} from '@/__tests__/helpers/test-utils';
import { createTestUser, testUsers } from '@/__tests__/fixtures/users';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock the utils module for activity logging
jest.mock('@/lib/utils', () => ({
  logServerActivity: jest.fn(),
}));

describe('User Profile API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
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

    // Create test user
    testUser = await UserModel.create({
      id: generateMockUuid(),
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      password: 'hashedPassword',
      phone: '555-123-4567',
      avatar: 'https://example.com/avatar.jpg',
      mfaSetupComplete: true,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
    });

    // Mock authenticated session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  describe('GET /api/users/profile', () => {
    it('returns user profile for authenticated user', async () => {
      const request = createMockRequest('/api/users/profile');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe(testUser.id);
      expect(data.name).toBe(testUser.name);
      expect(data.email).toBe(testUser.email);
      expect(data.phone).toBe(testUser.phone);
      expect(data.avatar).toBe(testUser.avatar);
      expect(data.createdAt).toBeDefined();
    });

    it('does not return sensitive data like password', async () => {
      const request = createMockRequest('/api/users/profile');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.password).toBeUndefined();
      expect(data.totpSecret).toBeUndefined();
      expect(data.backupCodes).toBeUndefined();
    });

    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('/api/users/profile');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session has no email', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: testUser.id,
          name: testUser.name,
          // email is missing
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createMockRequest('/api/users/profile');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when user not found in database', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'non-existent-id',
          email: 'nonexistent@example.com',
          name: 'Non Existent',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createMockRequest('/api/users/profile');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('returns empty string for missing optional fields', async () => {
      // Create user without optional fields
      const userWithoutOptionals = await UserModel.create({
        id: generateMockUuid(),
        email: 'minimal@test.com',
        name: 'Minimal User',
        password: 'hashedPassword',
        mfaSetupComplete: true,
        createdAt: new Date(),
      });

      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: userWithoutOptionals.email,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createMockRequest('/api/users/profile');

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.phone).toBe('');
      expect(data.avatar).toBe('');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('updates user profile successfully', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
          phone: '555-999-8888',
          avatar: 'https://example.com/new-avatar.jpg',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.name).toBe('Updated Name');
      expect(data.phone).toBe('555-999-8888');
      expect(data.avatar).toBe('https://example.com/new-avatar.jpg');
    });

    it('requires name field', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          phone: '555-999-8888',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('preserves email (cannot be changed via profile update)', async () => {
      const originalEmail = testUser.email;

      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
          email: 'newemail@example.com', // Should be ignored
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.email).toBe(originalEmail);
    });

    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when user not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: 'nonexistent@example.com',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('updates only allowed fields', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
          phone: '555-111-2222',
          avatar: 'https://example.com/avatar2.jpg',
          password: 'newpassword123', // Should be ignored
          mfaSetupComplete: false, // Should be ignored
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      // Verify password and mfaSetupComplete were not changed
      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.password).toBe('hashedPassword');
      expect(updatedUser.mfaSetupComplete).toBe(true);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('partially updates user profile', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          name: 'Partially Updated Name',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify name was updated but other fields preserved
      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.name).toBe('Partially Updated Name');
      expect(updatedUser.phone).toBe(testUser.phone);
    });

    it('updates phone only', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          phone: '555-000-0000',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.phone).toBe('555-000-0000');
      expect(updatedUser.name).toBe(testUser.name);
    });

    it('updates avatar only', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          avatar: 'https://example.com/patched-avatar.jpg',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.avatar).toBe('https://example.com/patched-avatar.jpg');
    });

    it('updates MFA setup complete status', async () => {
      // First set mfaSetupComplete to false
      await UserModel.updateOne(
        { email: testUser.email },
        { mfaSetupComplete: false, pendingMfaVerification: true }
      );

      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          mfaSetupComplete: true,
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.mfaSetupComplete).toBe(true);
    });

    it('allows userId query parameter for setup flows', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        searchParams: { userId: testUser.id },
        body: {
          name: 'Setup Flow Name Update',
        },
      });

      // Don't require session for userId flow
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      const updatedUser = await UserModel.findOne({ id: testUser.id });
      expect(updatedUser.name).toBe('Setup Flow Name Update');
    });

    it('returns 401 when neither userId nor session provided', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          name: 'Update Without Auth',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 for non-existent userId', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        searchParams: { userId: 'non-existent-id' },
        body: {
          name: 'Update Non-Existent',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('sets 2FA verified when MFA setup completes', async () => {
      await UserModel.updateOne(
        { email: testUser.email },
        {
          mfaSetupComplete: false,
          pendingMfaVerification: true,
          'twoFactorAuth.enabled': true,
          'twoFactorAuth.verified': false,
        }
      );

      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          mfaSetupComplete: true,
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.mfaSetupComplete).toBe(true);
      expect(updatedUser.pendingMfaVerification).toBe(false);
      expect(updatedUser.twoFactorAuth?.verified).toBe(true);
      expect(updatedUser.twoFactorAuth?.enabled).toBe(true);
    });
  });

  describe('Profile Validation', () => {
    it('allows empty phone number', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          phone: '',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.phone).toBe('');
    });

    it('allows removing avatar', async () => {
      const request = createMockRequest('/api/users/profile', {
        method: 'PATCH',
        body: {
          avatar: '',
        },
      });

      const response = await PATCH(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);

      const updatedUser = await UserModel.findOne({ email: testUser.email });
      expect(updatedUser.avatar).toBe('');
    });
  });

  describe('Profile Data Integrity', () => {
    it('preserves createdAt timestamp after updates', async () => {
      const originalCreatedAt = testUser.createdAt;

      const request = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'New Name',
        },
      });

      const response = await PUT(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.createdAt).toBe(originalCreatedAt.toISOString());
    });

    it('returns consistent data format in GET and PUT responses', async () => {
      const getRequest = createMockRequest('/api/users/profile');
      const getResponse = await GET(getRequest);
      const { data: getData } = await parseResponse(getResponse);

      const putRequest = createMockRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          name: getData.name,
          phone: getData.phone,
          avatar: getData.avatar,
        },
      });
      const putResponse = await PUT(putRequest);
      const { data: putData } = await parseResponse(putResponse);

      // Both should have same fields
      expect(Object.keys(getData).sort()).toEqual(Object.keys(putData).sort());
    });
  });
});
