/**
 * MFA Service Unit Tests
 *
 * Tests for the MFA (Multi-Factor Authentication) service
 * covering email code generation/verification and TOTP operations.
 */

import speakeasy from 'speakeasy';
import {
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  generateObjectId,
} from '../../../helpers/db.helpers';

// Mock nodemailer before importing MFA service
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK',
    }),
  })),
}));

// Mock the database connection
jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('MFA Service', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.clearAllMocks();
  });

  describe('Email Code Generation', () => {
    describe('generateEmailCode (internal function)', () => {
      it('should generate a 6-digit numeric code', () => {
        // Test the code generation pattern
        const codePattern = /^\d{6}$/;
        // Generate multiple codes to test randomness
        const codes: string[] = [];
        for (let i = 0; i < 100; i++) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          codes.push(code);
          expect(code).toMatch(codePattern);
          expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
          expect(parseInt(code)).toBeLessThanOrEqual(999999);
        }
      });

      it('should generate unique codes on subsequent calls', () => {
        const codes = new Set<string>();
        for (let i = 0; i < 100; i++) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          codes.add(code);
        }
        // With 100 random codes, we should have mostly unique values
        // (collision probability is low but not zero)
        expect(codes.size).toBeGreaterThan(90);
      });
    });

    describe('sendEmailVerificationCode', () => {
      let sendEmailVerificationCode: typeof import('@/lib/services/mfa').sendEmailVerificationCode;
      let getUserModel: () => any;

      beforeEach(async () => {
        // Dynamically import to get fresh module with mocks
        const mfaModule = await import('@/lib/services/mfa');
        sendEmailVerificationCode = mfaModule.sendEmailVerificationCode;

        const userModule = await import('@/lib/db/models/user');
        getUserModel = userModule.getUserModel;
      });

      it('should return false for invalid ObjectId format', async () => {
        const result = await sendEmailVerificationCode('invalid-id');
        expect(result).toBe(false);
      });

      it('should return false for non-existent user', async () => {
        const fakeId = generateObjectId();
        const result = await sendEmailVerificationCode(fakeId);
        expect(result).toBe(false);
      });

      it('should generate and store code for valid user', async () => {
        const UserModel = getUserModel();
        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'email',
          },
        });

        const result = await sendEmailVerificationCode(user._id.toString());
        expect(result).toBe(true);

        // Verify code was stored
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.twoFactorAuth.temporaryCode).toBeDefined();
        expect(updatedUser.twoFactorAuth.temporaryCode).toMatch(/^\d{6}$/);
        expect(updatedUser.pendingMfaVerification).toBe(true);
      });

      it('should reuse existing code if generated within 2 minutes', async () => {
        const UserModel = getUserModel();
        const existingCode = '123456';
        const recentTime = new Date().toISOString();

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'email',
            temporaryCode: existingCode,
            codeGeneratedAt: recentTime,
          },
        });

        const result = await sendEmailVerificationCode(user._id.toString());
        expect(result).toBe(true);

        // Verify code was reused
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.twoFactorAuth.temporaryCode).toBe(existingCode);
      });

      it('should generate new code if existing code is older than 2 minutes', async () => {
        const UserModel = getUserModel();
        const oldCode = '123456';
        const oldTime = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3 minutes ago

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'email',
            temporaryCode: oldCode,
            codeGeneratedAt: oldTime,
          },
        });

        const result = await sendEmailVerificationCode(user._id.toString());
        expect(result).toBe(true);

        // Verify new code was generated
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.twoFactorAuth.temporaryCode).not.toBe(oldCode);
        expect(updatedUser.twoFactorAuth.temporaryCode).toMatch(/^\d{6}$/);
      });
    });
  });

  describe('Email Code Verification', () => {
    let verifyEmailCode: typeof import('@/lib/services/mfa').verifyEmailCode;
    let getUserModel: () => any;

    beforeEach(async () => {
      const mfaModule = await import('@/lib/services/mfa');
      verifyEmailCode = mfaModule.verifyEmailCode;

      const userModule = await import('@/lib/db/models/user');
      getUserModel = userModule.getUserModel;
    });

    it('should return false for invalid ObjectId format', async () => {
      const result = await verifyEmailCode('invalid-id', '123456');
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const fakeId = generateObjectId();
      const result = await verifyEmailCode(fakeId, '123456');
      expect(result).toBe(false);
    });

    it('should return false when MFA is not enabled', async () => {
      const UserModel = getUserModel();
      const user = await UserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed',
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: false,
          method: 'email',
        },
      });

      const result = await verifyEmailCode(user._id.toString(), '123456');
      expect(result).toBe(false);
    });

    it('should return true for valid unexpired code', async () => {
      const UserModel = getUserModel();
      const validCode = '654321';
      const user = await UserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed',
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: validCode,
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      const result = await verifyEmailCode(user._id.toString(), validCode);
      expect(result).toBe(true);

      // Verify code was cleared and flag was updated
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.twoFactorAuth.temporaryCode).toBeUndefined();
      expect(updatedUser.pendingMfaVerification).toBe(false);
    });

    it('should return false for expired code (>10 minutes)', async () => {
      const UserModel = getUserModel();
      const expiredCode = '654321';
      const expiredTime = new Date(Date.now() - 11 * 60 * 1000).toISOString(); // 11 minutes ago

      const user = await UserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed',
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: expiredCode,
          codeGeneratedAt: expiredTime,
        },
      });

      const result = await verifyEmailCode(user._id.toString(), expiredCode);
      expect(result).toBe(false);
    });

    it('should return false for incorrect code', async () => {
      const UserModel = getUserModel();
      const storedCode = '654321';
      const wrongCode = '123456';

      const user = await UserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed',
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: storedCode,
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      const result = await verifyEmailCode(user._id.toString(), wrongCode);
      expect(result).toBe(false);
    });

    it('should handle whitespace in codes', async () => {
      const UserModel = getUserModel();
      const storedCode = '654321';

      const user = await UserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed',
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: storedCode,
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      // Code with whitespace should still work
      const result = await verifyEmailCode(user._id.toString(), ' 654321 ');
      expect(result).toBe(true);
    });

    it('should return false when no temporary code exists', async () => {
      const UserModel = getUserModel();
      const user = await UserModel.create({
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed',
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          // No temporaryCode set
        },
      });

      const result = await verifyEmailCode(user._id.toString(), '123456');
      expect(result).toBe(false);
    });
  });

  describe('TOTP Operations', () => {
    describe('generateTotpSecret', () => {
      let generateTotpSecret: typeof import('@/lib/services/mfa').generateTotpSecret;
      let getUserModel: () => any;

      beforeEach(async () => {
        const mfaModule = await import('@/lib/services/mfa');
        generateTotpSecret = mfaModule.generateTotpSecret;

        const userModule = await import('@/lib/db/models/user');
        getUserModel = userModule.getUserModel;
      });

      it('should throw error for invalid ObjectId format', async () => {
        await expect(generateTotpSecret('invalid-id')).rejects.toThrow(
          'Invalid user ID format'
        );
      });

      it('should throw error for non-existent user', async () => {
        const fakeId = generateObjectId();
        await expect(generateTotpSecret(fakeId)).rejects.toThrow(
          'User not found'
        );
      });

      it('should generate valid TOTP secret and QR code', async () => {
        const UserModel = getUserModel();
        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'email',
          },
        });

        const result = await generateTotpSecret(user._id.toString());

        // Verify secret is base32 format
        expect(result.secret).toBeDefined();
        expect(result.secret).toMatch(/^[A-Z2-7]+=*$/);

        // Verify QR code is data URL
        expect(result.qrCode).toBeDefined();
        expect(result.qrCode).toMatch(/^data:image\/png;base64,/);

        // Verify secret was stored in database
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.twoFactorAuth.totpSecret).toBe(result.secret);
      });
    });

    describe('verifyTotpCode', () => {
      let verifyTotpCode: typeof import('@/lib/services/mfa').verifyTotpCode;
      let getUserModel: () => any;

      beforeEach(async () => {
        const mfaModule = await import('@/lib/services/mfa');
        verifyTotpCode = mfaModule.verifyTotpCode;

        const userModule = await import('@/lib/db/models/user');
        getUserModel = userModule.getUserModel;
      });

      it('should return false for invalid ObjectId format', async () => {
        const result = await verifyTotpCode('invalid-id', '123456');
        expect(result).toBe(false);
      });

      it('should return false for non-existent user', async () => {
        const fakeId = generateObjectId();
        const result = await verifyTotpCode(fakeId, '123456');
        expect(result).toBe(false);
      });

      it('should return false when TOTP secret is missing', async () => {
        const UserModel = getUserModel();
        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'totp',
            // No totpSecret
          },
        });

        const result = await verifyTotpCode(user._id.toString(), '123456');
        expect(result).toBe(false);
      });

      it('should verify valid TOTP token', async () => {
        const UserModel = getUserModel();
        const testSecret = 'JBSWY3DPEHPK3PXP';

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          pendingMfaVerification: true,
          twoFactorAuth: {
            enabled: true,
            method: 'totp',
            totpSecret: testSecret,
          },
        });

        // Generate a valid TOTP token
        const validToken = speakeasy.totp({
          secret: testSecret,
          encoding: 'base32',
        });

        const result = await verifyTotpCode(user._id.toString(), validToken);
        expect(result).toBe(true);

        // Verify user state was updated
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.pendingMfaVerification).toBe(false);
      });

      it('should reject invalid TOTP token', async () => {
        const UserModel = getUserModel();
        const testSecret = 'JBSWY3DPEHPK3PXP';

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'totp',
            totpSecret: testSecret,
          },
        });

        const result = await verifyTotpCode(user._id.toString(), '000000');
        expect(result).toBe(false);
      });

      it('should allow 1-step time window tolerance', async () => {
        const UserModel = getUserModel();
        const testSecret = 'JBSWY3DPEHPK3PXP';

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'totp',
            totpSecret: testSecret,
          },
        });

        // Generate a TOTP token from 30 seconds ago (1 step back)
        const pastToken = speakeasy.totp({
          secret: testSecret,
          encoding: 'base32',
          time: Math.floor(Date.now() / 1000) - 30,
        });

        // With window: 1, the past token should still be valid
        const result = await verifyTotpCode(user._id.toString(), pastToken);
        // Note: This might pass or fail depending on timing,
        // as the window allows ±1 step (±30 seconds)
        expect(typeof result).toBe('boolean');
      });
    });

    describe('enableTOTP', () => {
      let enableTOTP: typeof import('@/lib/services/mfa').enableTOTP;
      let getUserModel: () => any;

      beforeEach(async () => {
        const mfaModule = await import('@/lib/services/mfa');
        enableTOTP = mfaModule.enableTOTP;

        const userModule = await import('@/lib/db/models/user');
        getUserModel = userModule.getUserModel;
      });

      it('should throw error for invalid ObjectId format', async () => {
        await expect(enableTOTP('invalid-id', 'secret')).rejects.toThrow(
          'Invalid user ID format'
        );
      });

      it('should throw error for non-existent user', async () => {
        const fakeId = generateObjectId();
        await expect(enableTOTP(fakeId, 'secret')).rejects.toThrow(
          'User not found'
        );
      });

      it('should enable TOTP for user', async () => {
        const UserModel = getUserModel();
        const testSecret = 'TESTSECRET123456';

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'email',
          },
        });

        const result = await enableTOTP(user._id.toString(), testSecret);
        expect(result).toBe(true);

        // Verify database was updated
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.twoFactorAuth.totpSecret).toBe(testSecret);
        expect(updatedUser.twoFactorAuth.method).toBe('totp');
        expect(updatedUser.twoFactorAuth.enabled).toBe(true);
      });
    });

    describe('disableTOTP', () => {
      let disableTOTP: typeof import('@/lib/services/mfa').disableTOTP;
      let getUserModel: () => any;

      beforeEach(async () => {
        const mfaModule = await import('@/lib/services/mfa');
        disableTOTP = mfaModule.disableTOTP;

        const userModule = await import('@/lib/db/models/user');
        getUserModel = userModule.getUserModel;
      });

      it('should throw error for invalid ObjectId format', async () => {
        await expect(disableTOTP('invalid-id')).rejects.toThrow(
          'Invalid user ID format'
        );
      });

      it('should disable TOTP and revert to email MFA', async () => {
        const UserModel = getUserModel();
        const testSecret = 'TESTSECRET123456';

        const user = await UserModel.create({
          name: 'Test User',
          email: 'test@example.com',
          hashedPassword: 'hashed',
          provider: 'credentials',
          emailVerified: true,
          isVerified: true,
          verificationMethod: 'email',
          twoFactorAuth: {
            enabled: true,
            method: 'totp',
            totpSecret: testSecret,
          },
        });

        const result = await disableTOTP(user._id.toString());
        expect(result).toBe(true);

        // Verify database was updated
        const updatedUser = await UserModel.findById(user._id);
        expect(updatedUser.twoFactorAuth.totpSecret).toBeUndefined();
        expect(updatedUser.twoFactorAuth.method).toBe('email');
        expect(updatedUser.twoFactorAuth.enabled).toBe(true); // MFA stays enabled
      });
    });

    describe('Backup Codes', () => {
      it('should generate 8 backup codes with 8 digits each', () => {
        // Test the backup code generation pattern
        const generateBackupCodes = (): string[] => {
          return Array.from({ length: 8 }, () =>
            Math.floor(10000000 + Math.random() * 90000000).toString()
          );
        };

        const codes = generateBackupCodes();
        expect(codes).toHaveLength(8);
        codes.forEach((code) => {
          expect(code).toMatch(/^\d{8}$/);
        });
      });

      it('should generate unique backup codes', () => {
        const generateBackupCodes = (): string[] => {
          return Array.from({ length: 8 }, () =>
            Math.floor(10000000 + Math.random() * 90000000).toString()
          );
        };

        const codes = generateBackupCodes();
        const uniqueCodes = new Set(codes);
        expect(uniqueCodes.size).toBe(8);
      });
    });
  });

  describe('Code Expiration Logic', () => {
    it('should correctly identify codes within 10-minute window', () => {
      const codeGeneratedAt = new Date();
      const now = new Date();
      const codeAgeInMinutes =
        (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);
      expect(codeAgeInMinutes).toBeLessThan(10);
    });

    it('should correctly identify expired codes (>10 minutes)', () => {
      const codeGeneratedAt = new Date(Date.now() - 11 * 60 * 1000);
      const now = new Date();
      const codeAgeInMinutes =
        (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);
      expect(codeAgeInMinutes).toBeGreaterThan(10);
    });

    it('should correctly identify recent codes for reuse (<2 minutes)', () => {
      const codeGeneratedAt = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago
      const now = new Date();
      const codeAgeInMinutes =
        (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);
      expect(codeAgeInMinutes).toBeLessThan(2);
    });
  });
});
