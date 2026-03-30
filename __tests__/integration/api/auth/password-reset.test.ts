/**
 * @jest-environment node
 */

/**
 * Password Reset API Integration Tests
 *
 * Tests for the forgot-password -> reset-password flow:
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  setupTestDb,
  teardownTestDb,
  clearTestDb,
} from '../../../helpers/db.helpers';

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({
  messageId: 'test-message-id',
  response: '250 OK',
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock database connection (used by reset-password route which uses Mongoose)
jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock mongodb MongoClient (used by forgot-password route which uses native driver)
const mockCollection = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
};

const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  db: jest.fn().mockReturnValue(mockDb),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(() => mockClient),
  ObjectId: jest.requireActual('mongoose').Types.ObjectId,
}));

describe('Password Reset Flow', () => {
  let forgotPasswordPOST: (req: Request) => Promise<Response>;
  let resetPasswordPOST: (req: Request) => Promise<Response>;
  let getUserModel: () => any;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.clearAllMocks();

    // Reset mock collection responses
    mockCollection.findOne.mockReset();
    mockCollection.updateOne.mockReset();

    // Dynamically import route handlers
    const forgotModule = await import(
      '@/app/api/auth/forgot-password/route'
    );
    forgotPasswordPOST = forgotModule.POST;

    const resetModule = await import(
      '@/app/api/auth/reset-password/route'
    );
    resetPasswordPOST = resetModule.POST;

    const userModule = await import('@/lib/db/models/user');
    getUserModel = userModule.getUserModel;
  });

  // ── POST /api/auth/forgot-password ──────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 when email is missing', async () => {
      const request = new Request(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      // MongoClient findOne returns null for unknown email
      mockCollection.findOne.mockResolvedValueOnce(null);

      const request = new Request(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@example.com' }),
        }
      );

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Email should NOT have been sent
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should generate a reset token and return success for valid email', async () => {
      const fakeUser = {
        _id: 'user-object-id-123',
        email: 'valid@example.com',
      };

      // First findOne: locate the user
      mockCollection.findOne
        .mockResolvedValueOnce(fakeUser)
        // Second findOne: verify update (return user with token)
        .mockResolvedValueOnce({
          ...fakeUser,
          resetToken: 'mocked-uuid-token',
          resetTokenExpiry: new Date(Date.now() + 3600000),
        });

      mockCollection.updateOne.mockResolvedValueOnce({
        modifiedCount: 1,
      });

      const request = new Request(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'valid@example.com' }),
        }
      );

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify updateOne was called with a token and expiry
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: fakeUser._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExpiry: expect.any(Date),
          }),
        })
      );

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('valid@example.com');
      expect(emailCall.subject).toContain('Reset');
    });
  });

  // ── POST /api/auth/reset-password ───────────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    it('should return 400 when token or password is missing', async () => {
      const noToken = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'NewPass123!' }),
        }
      );

      const res1 = await resetPasswordPOST(noToken);
      expect(res1.status).toBe(400);

      const noPassword = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'some-token' }),
        }
      );

      const res2 = await resetPasswordPOST(noPassword);
      expect(res2.status).toBe(400);
    });

    it('should return 400 for an invalid token', async () => {
      const request = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'non-existent-token',
            password: 'NewPass123!',
          }),
        }
      );

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should return 400 for an expired token', async () => {
      const UserModel = getUserModel();

      // Create user with an expired reset token
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      await UserModel.create({
        name: 'Expired Token User',
        email: 'expired@example.com',
        hashedPassword: await bcrypt.hash('OldPassword123!', 10),
        provider: 'credentials',
        verificationMethod: 'email',
        resetToken: 'expired-token-uuid',
        resetTokenExpiry: expiredDate,
        twoFactorAuth: { enabled: true, method: 'email' },
      });

      const request = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'expired-token-uuid',
            password: 'NewPass123!',
          }),
        }
      );

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('expired');
    });

    it('should reset password with a valid token', async () => {
      const UserModel = getUserModel();
      const oldPassword = 'OldPassword123!';
      const newPassword = 'BrandNewPass456!';

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const user = await UserModel.create({
        name: 'Reset User',
        email: 'reset@example.com',
        hashedPassword: await bcrypt.hash(oldPassword, 10),
        provider: 'credentials',
        verificationMethod: 'email',
        resetToken: 'valid-token-uuid',
        resetTokenExpiry: futureDate,
        twoFactorAuth: { enabled: true, method: 'email' },
      });

      const request = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'valid-token-uuid',
            password: newPassword,
          }),
        }
      );

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify the password was actually hashed and updated
      const updatedUser = await UserModel.findById(user._id);
      const passwordMatches = await bcrypt.compare(
        newPassword,
        updatedUser.hashedPassword
      );
      expect(passwordMatches).toBe(true);
    });

    it('should clear the reset token after successful use', async () => {
      const UserModel = getUserModel();

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const user = await UserModel.create({
        name: 'Token Clear User',
        email: 'tokenclear@example.com',
        hashedPassword: await bcrypt.hash('OldPassword123!', 10),
        provider: 'credentials',
        verificationMethod: 'email',
        resetToken: 'one-time-token-uuid',
        resetTokenExpiry: futureDate,
        twoFactorAuth: { enabled: true, method: 'email' },
      });

      const request = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'one-time-token-uuid',
            password: 'AnotherPass789!',
          }),
        }
      );

      await resetPasswordPOST(request);

      // Token fields should be cleared ($unset)
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.resetToken).toBeUndefined();
      expect(updatedUser.resetTokenExpiry).toBeUndefined();

      // Attempting to use the same token again should fail
      const retryRequest = new Request(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'one-time-token-uuid',
            password: 'YetAnotherPass000!',
          }),
        }
      );

      const retryResponse = await resetPasswordPOST(retryRequest);
      expect(retryResponse.status).toBe(400);
    });
  });
});
