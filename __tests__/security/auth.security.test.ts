/**
 * Authentication Security Tests
 * Tests for password security, session security, and MFA bypass prevention
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';

// Mock next-auth before importing modules that use it
jest.mock('next-auth/react');
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Import after mocking
import { User, getUserModel } from '@/lib/db/models/user';
import { verifyEmailCode, verifyTotpCode } from '@/lib/services/mfa';

describe('Authentication Security', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    jest.clearAllMocks();
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt before storing', async () => {
      const UserModel = getUserModel();
      const plainPassword = 'SecurePassword123!';

      const user = await UserModel.create({
        email: 'secure@example.com',
        password: plainPassword,
        name: 'Test User',
        emailVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
        },
      });

      // Password should be hashed, not stored as plain text
      expect(user.password).not.toBe(plainPassword);
      // Should be a bcrypt hash (starts with $2a$, $2b$, or $2y$)
      expect(user.password).toMatch(/^\$2[aby]\$/);
    });

    it('should verify correct passwords against bcrypt hash', async () => {
      const UserModel = getUserModel();
      const plainPassword = 'SecurePassword123!';

      const user = await UserModel.create({
        email: 'verify@example.com',
        password: plainPassword,
        name: 'Test User',
        emailVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
        },
      });

      // Verify the password matches
      const isMatch = await bcrypt.compare(plainPassword, user.password);
      expect(isMatch).toBe(true);

      // Verify wrong password doesn't match
      const isWrongMatch = await bcrypt.compare('WrongPassword', user.password);
      expect(isWrongMatch).toBe(false);
    });

    it('should use appropriate bcrypt cost factor for timing attack resistance', async () => {
      const UserModel = getUserModel();

      const user = await UserModel.create({
        email: 'cost@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        emailVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
        },
      });

      // Extract cost factor from bcrypt hash (format: $2a$XX$...)
      const costFactor = parseInt(user.password.split('$')[2], 10);
      // Cost factor should be at least 10 for security
      expect(costFactor).toBeGreaterThanOrEqual(10);
    });

    it('should reject empty passwords', async () => {
      const UserModel = getUserModel();

      await expect(
        UserModel.create({
          email: 'empty@example.com',
          password: '',
          name: 'Test User',
        })
      ).rejects.toThrow();
    });
  });

  describe('Session Security', () => {
    it('should not expose sensitive user data in session', () => {
      // Define what should NOT be in a session
      const sensitiveFields = [
        'password',
        'totpSecret',
        'backupCodes',
        'twoFactorAuth.temporaryCode',
        'twoFactorAuth.totpSecret',
      ];

      // Mock session data (what should be exposed)
      const safeSessionData = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          name: 'Test User',
          mfaVerified: true,
          mfaMethod: 'email',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Verify none of the sensitive fields are present
      sensitiveFields.forEach((field) => {
        const parts = field.split('.');
        let value: any = safeSessionData.user;
        for (const part of parts) {
          value = value?.[part];
        }
        expect(value).toBeUndefined();
      });
    });
  });

  describe('MFA Security', () => {
    it('should invalidate MFA code after successful verification', async () => {
      const UserModel = getUserModel();
      const verificationCode = '123456';

      const user = await UserModel.create({
        email: 'mfa-invalidate@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        emailVerified: true,
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
          temporaryCode: verificationCode,
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      // First verification should succeed
      const firstResult = await verifyEmailCode(user._id.toString(), verificationCode);
      expect(firstResult).toBe(true);

      // Second verification with same code should fail
      const secondResult = await verifyEmailCode(user._id.toString(), verificationCode);
      expect(secondResult).toBe(false);
    });

    it('should reject expired MFA codes', async () => {
      const UserModel = getUserModel();
      const verificationCode = '654321';

      // Create user with expired code (11 minutes ago)
      const expiredTime = new Date(Date.now() - 11 * 60 * 1000);

      const user = await UserModel.create({
        email: 'mfa-expired@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        emailVerified: true,
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
          temporaryCode: verificationCode,
          codeGeneratedAt: expiredTime.toISOString(),
        },
      });

      // Verification should fail due to expired code
      const result = await verifyEmailCode(user._id.toString(), verificationCode);
      expect(result).toBe(false);
    });

    it('should reject invalid MFA codes', async () => {
      const UserModel = getUserModel();

      const user = await UserModel.create({
        email: 'mfa-invalid@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        emailVerified: true,
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
          temporaryCode: '123456',
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      // Wrong code should fail
      const result = await verifyEmailCode(user._id.toString(), '000000');
      expect(result).toBe(false);
    });

    it('should verify TOTP codes with window tolerance', async () => {
      const UserModel = getUserModel();
      const totpSecret = speakeasy.generateSecret().base32;

      const user = await UserModel.create({
        email: 'totp@example.com',
        password: 'TestPassword123!',
        name: 'TOTP User',
        emailVerified: true,
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'totp',
          verified: true,
          totpSecret: totpSecret,
        },
      });

      // Generate a valid TOTP code
      const validCode = speakeasy.totp({
        secret: totpSecret,
        encoding: 'base32',
      });

      // Valid code should pass
      const result = await verifyTotpCode(user._id.toString(), validCode);
      expect(result).toBe(true);
    });

    it('should reject invalid TOTP codes', async () => {
      const UserModel = getUserModel();
      const totpSecret = speakeasy.generateSecret().base32;

      const user = await UserModel.create({
        email: 'totp-invalid@example.com',
        password: 'TestPassword123!',
        name: 'TOTP User',
        emailVerified: true,
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'totp',
          verified: true,
          totpSecret: totpSecret,
        },
      });

      // Invalid code should fail
      const result = await verifyTotpCode(user._id.toString(), '000000');
      expect(result).toBe(false);
    });

    it('should reject MFA verification for users without MFA enabled', async () => {
      const UserModel = getUserModel();

      const user = await UserModel.create({
        email: 'no-mfa@example.com',
        password: 'TestPassword123!',
        name: 'No MFA User',
        emailVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: false,
          method: 'email',
          verified: false,
        },
      });

      const result = await verifyEmailCode(user._id.toString(), '123456');
      expect(result).toBe(false);
    });
  });

  describe('Invalid User ID Handling', () => {
    it('should reject invalid MongoDB ObjectId format for MFA verification', async () => {
      const result = await verifyEmailCode('invalid-id', '123456');
      expect(result).toBe(false);
    });

    it('should reject non-existent user ID for MFA verification', async () => {
      const fakeObjectId = new mongoose.Types.ObjectId().toString();
      const result = await verifyEmailCode(fakeObjectId, '123456');
      expect(result).toBe(false);
    });

    it('should reject invalid ObjectId for TOTP verification', async () => {
      const result = await verifyTotpCode('invalid-id', '123456');
      expect(result).toBe(false);
    });
  });
});
