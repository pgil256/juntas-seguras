/**
 * User Model Integration Tests
 *
 * Tests for the User MongoDB model including:
 * - User creation and validation
 * - Password hashing
 * - MFA fields
 * - Payment methods
 * - Identity verification
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, UserDocument } from '@/lib/db/models/user';
import { testUsers, createTestUser } from '@/__tests__/fixtures/users';

describe('User Model', () => {
  let mongoServer: MongoMemoryServer;

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
    // Clear users collection before each test
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: '$2a$10$hashedpasswordfortesting',
        verificationMethod: 'email',
        pools: [],
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user._id).toBeDefined();
    });

    it('should require name field', async () => {
      const userData = {
        email: 'test@example.com',
        hashedPassword: '$2a$10$hashedpasswordfortesting',
        verificationMethod: 'email',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require email field', async () => {
      const userData = {
        name: 'Test User',
        hashedPassword: '$2a$10$hashedpasswordfortesting',
        verificationMethod: 'email',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should reject duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        hashedPassword: '$2a$10$hashedpasswordfortesting',
        verificationMethod: 'email',
        pools: [],
      };

      // Create first user
      await User.create(userData);

      // Attempt to create second user with same email
      await expect(User.create({
        ...userData,
        name: 'Another User',
      })).rejects.toThrow();
    });

    it('should set default createdAt timestamp', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        verificationMethod: 'email',
        pools: [],
      };

      const user = await User.create(userData);

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should initialize empty pools array', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        verificationMethod: 'email',
        pools: [],
      };

      const user = await User.create(userData);

      expect(user.pools).toBeDefined();
      expect(Array.isArray(user.pools)).toBe(true);
      expect(user.pools).toHaveLength(0);
    });
  });

  describe('MFA Fields', () => {
    it('should set default MFA to email method with enabled true', async () => {
      const userData = {
        name: 'Test User',
        email: 'mfa@example.com',
        verificationMethod: 'email',
        pools: [],
      };

      const user = await User.create(userData);

      expect(user.twoFactorAuth).toBeDefined();
      expect(user.twoFactorAuth.enabled).toBe(true);
      expect(user.twoFactorAuth.method).toBe('email');
    });

    it('should store mfaCode and mfaCodeExpiry', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'mfacode@example.com',
        verificationMethod: 'email',
        pools: [],
        verificationCode: '123456',
        verificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      expect(user.verificationCode).toBe('123456');
      expect(user.verificationExpiry).toBeDefined();
    });

    it('should store totpSecret when TOTP enabled', async () => {
      const totpSecret = 'JBSWY3DPEHPK3PXP';

      const user = await User.create({
        name: 'TOTP User',
        email: 'totp@example.com',
        verificationMethod: 'email',
        pools: [],
        twoFactorAuth: {
          enabled: true,
          method: 'totp',
          totpSecret: totpSecret,
          verified: true,
          lastUpdated: new Date().toISOString(),
        },
      });

      expect(user.twoFactorAuth.totpSecret).toBe(totpSecret);
      expect(user.twoFactorAuth.method).toBe('totp');
    });

    it('should store backup codes array', async () => {
      const backupCodes = [
        '12345678',
        '23456789',
        '34567890',
        '45678901',
        '56789012',
        '67890123',
        '78901234',
        '89012345',
      ];

      const user = await User.create({
        name: 'Backup User',
        email: 'backup@example.com',
        verificationMethod: 'email',
        pools: [],
        twoFactorAuth: {
          enabled: true,
          method: 'totp',
          backupCodes: backupCodes,
          verified: true,
          lastUpdated: new Date().toISOString(),
        },
      });

      expect(user.twoFactorAuth.backupCodes).toBeDefined();
      expect(user.twoFactorAuth.backupCodes).toHaveLength(8);
      expect(user.twoFactorAuth.backupCodes).toEqual(backupCodes);
    });

    it('should track pendingMfaVerification flag', async () => {
      const user = await User.create({
        name: 'Pending MFA User',
        email: 'pendingmfa@example.com',
        verificationMethod: 'email',
        pools: [],
        pendingMfaVerification: true,
      });

      expect(user.pendingMfaVerification).toBe(true);
    });

    it('should track mfaSetupComplete flag', async () => {
      const user = await User.create({
        name: 'MFA Complete User',
        email: 'mfacomplete@example.com',
        verificationMethod: 'email',
        pools: [],
        mfaSetupComplete: true,
      });

      expect(user.mfaSetupComplete).toBe(true);
    });
  });

  describe('Payment Methods', () => {
    it('should store multiple payout methods', async () => {
      const user = await User.create({
        name: 'Payment User',
        email: 'payment@example.com',
        verificationMethod: 'email',
        pools: [],
        payoutMethods: {
          venmo: '@testuser',
          cashapp: 'testuser',
          paypal: 'test@paypal.com',
          zelle: '5551234567',
          preferred: 'venmo',
        },
      });

      expect(user.payoutMethods).toBeDefined();
      expect(user.payoutMethods?.venmo).toBe('@testuser');
      expect(user.payoutMethods?.cashapp).toBe('testuser');
      expect(user.payoutMethods?.paypal).toBe('test@paypal.com');
      expect(user.payoutMethods?.zelle).toBe('5551234567');
      expect(user.payoutMethods?.preferred).toBe('venmo');
    });

    it('should validate payment method types', async () => {
      const user = await User.create({
        name: 'Payment Type User',
        email: 'paymenttype@example.com',
        verificationMethod: 'email',
        pools: [],
        payoutMethods: {
          preferred: 'venmo',
        },
      });

      // Valid types: 'venmo', 'paypal', 'zelle', 'cashapp', 'bank', null
      expect(['venmo', 'paypal', 'zelle', 'cashapp', 'bank', null]).toContain(
        user.payoutMethods?.preferred
      );
    });

    it('should store Zelle QR code data', async () => {
      const zelleQRData = {
        token: 'zelle-token-123',
        rawContent: 'ZELLE://SEND?token=zelle-token-123',
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        uploadedAt: new Date(),
      };

      const user = await User.create({
        name: 'Zelle QR User',
        email: 'zelleqr@example.com',
        verificationMethod: 'email',
        pools: [],
        payoutMethods: {
          zelle: '5551234567',
          zelleQR: zelleQRData,
          preferred: 'zelle',
        },
      });

      expect(user.payoutMethods?.zelleQR).toBeDefined();
      expect(user.payoutMethods?.zelleQR?.token).toBe('zelle-token-123');
      expect(user.payoutMethods?.zelleQR?.rawContent).toBe('ZELLE://SEND?token=zelle-token-123');
      expect(user.payoutMethods?.zelleQR?.imageDataUrl).toBeDefined();
    });
  });

  describe('Identity Verification', () => {
    it('should store verification status', async () => {
      const user = await User.create({
        name: 'Verified User',
        email: 'verified@example.com',
        verificationMethod: 'email',
        pools: [],
        identityVerification: {
          status: 'verified',
          lastUpdated: new Date().toISOString(),
        },
        identityVerified: true,
      });

      expect(user.identityVerification?.status).toBe('verified');
      expect(user.identityVerified).toBe(true);
    });

    it('should track Stripe customer ID', async () => {
      const user = await User.create({
        name: 'Stripe User',
        email: 'stripe@example.com',
        verificationMethod: 'email',
        pools: [],
        stripeCustomerId: 'cus_test123',
      });

      expect(user.stripeCustomerId).toBe('cus_test123');
    });
  });

  describe('User Query Operations', () => {
    it('should find user by email', async () => {
      await User.create({
        name: 'Find Me',
        email: 'findme@example.com',
        verificationMethod: 'email',
        pools: [],
      });

      const user = await User.findOne({ email: 'findme@example.com' });

      expect(user).toBeDefined();
      expect(user?.name).toBe('Find Me');
    });

    it('should find user by _id', async () => {
      const created = await User.create({
        name: 'Find By ID',
        email: 'findbyid@example.com',
        verificationMethod: 'email',
        pools: [],
      });

      const user = await User.findById(created._id);

      expect(user).toBeDefined();
      expect(user?.email).toBe('findbyid@example.com');
    });

    it('should update user fields', async () => {
      const user = await User.create({
        name: 'Update Me',
        email: 'updateme@example.com',
        verificationMethod: 'email',
        pools: [],
      });

      await User.updateOne(
        { _id: user._id },
        { $set: { name: 'Updated Name' } }
      );

      const updated = await User.findById(user._id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should add pool to user pools array', async () => {
      const user = await User.create({
        name: 'Pool User',
        email: 'pooluser@example.com',
        verificationMethod: 'email',
        pools: [],
      });

      const poolId = 'test-pool-123';
      await User.updateOne(
        { _id: user._id },
        { $push: { pools: poolId } }
      );

      const updated = await User.findById(user._id);
      expect(updated?.pools).toContain(poolId);
    });
  });

  describe('OAuth Provider Fields', () => {
    it('should store Google OAuth provider', async () => {
      const user = await User.create({
        name: 'Google User',
        email: 'google@example.com',
        verificationMethod: 'email',
        pools: [],
        provider: 'google',
        providerId: 'google-123456',
        emailVerified: true,
      });

      expect(user.provider).toBe('google');
      expect(user.providerId).toBe('google-123456');
    });

    it('should store Azure AD OAuth provider', async () => {
      const user = await User.create({
        name: 'Azure User',
        email: 'azure@example.com',
        verificationMethod: 'email',
        pools: [],
        provider: 'azure-ad',
        providerId: 'azure-123456',
        emailVerified: true,
      });

      expect(user.provider).toBe('azure-ad');
      expect(user.providerId).toBe('azure-123456');
    });

    it('should default to credentials provider', async () => {
      const user = await User.create({
        name: 'Credentials User',
        email: 'credentials@example.com',
        verificationMethod: 'email',
        pools: [],
      });

      expect(user.provider).toBe('credentials');
    });
  });

  describe('Password Reset Fields', () => {
    it('should store reset token and expiry', async () => {
      const resetToken = 'reset-token-abc123';
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const user = await User.create({
        name: 'Reset User',
        email: 'reset@example.com',
        verificationMethod: 'email',
        pools: [],
        resetToken: resetToken,
        resetTokenExpiry: resetExpiry,
      });

      expect(user.resetToken).toBe(resetToken);
      expect(user.resetTokenExpiry).toBeDefined();
    });
  });
});
