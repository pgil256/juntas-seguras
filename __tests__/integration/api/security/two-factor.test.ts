/**
 * Two-Factor Authentication API Integration Tests
 *
 * Tests for the 2FA setup/verify/resend endpoints:
 * - POST /api/security/two-factor/setup
 * - POST /api/security/two-factor/verify
 * - POST /api/security/two-factor/resend
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  generateObjectId,
} from '../../../helpers/db.helpers';

// Mock database connection
jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock logServerActivity
jest.mock('@/lib/utils', () => ({
  logServerActivity: jest.fn(),
}));

// Mock generateVerificationCode
jest.mock('@/lib/utils/verification', () => ({
  generateVerificationCode: jest.fn().mockReturnValue('987654'),
}));

describe('Two-Factor Authentication API', () => {
  let setupPOST: (req: NextRequest) => Promise<Response>;
  let verifyPOST: (req: NextRequest) => Promise<Response>;
  let resendPOST: (req: NextRequest) => Promise<Response>;
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

    // Dynamically import route handlers after mocks are in place
    const setupModule = await import('@/app/api/security/two-factor/setup/route');
    setupPOST = setupModule.POST;

    const verifyModule = await import('@/app/api/security/two-factor/verify/route');
    verifyPOST = verifyModule.POST;

    const resendModule = await import('@/app/api/security/two-factor/resend/route');
    resendPOST = resendModule.POST;

    const userModule = await import('@/lib/db/models/user');
    getUserModel = userModule.getUserModel;
  });

  /** Helper to create a test user with required fields */
  async function createTestUser(overrides: Record<string, unknown> = {}) {
    const UserModel = getUserModel();
    return UserModel.create({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      hashedPassword: 'hashed',
      provider: 'credentials',
      emailVerified: true,
      isVerified: true,
      verificationMethod: 'email',
      ...overrides,
    });
  }

  // -- Setup Tests --

  describe('POST /api/security/two-factor/setup', () => {
    it('should require userId and method', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject invalid authentication method', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generateObjectId(), method: 'sms' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid authentication method');
    });

    it('should return 404 when user not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generateObjectId(), method: 'email' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(404);
    });

    it('should return QR code and secret for app (TOTP) setup', async () => {
      const user = await createTestUser({ email: 'totp@example.com' });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id.toString(), method: 'app' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.secret).toBeDefined();
      expect(data.secret).toHaveLength(16);
      expect(data.qrCodeUrl).toContain('otpauth://totp/');
      expect(data.qrCodeUrl).toContain('totp@example.com');
      expect(data.backupCodes).toBeDefined();
      expect(data.backupCodes).toHaveLength(8);

      // Verify user was updated in the database
      const UserModel = getUserModel();
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.twoFactorAuth.enabled).toBe(true);
      expect(updatedUser.twoFactorAuth.method).toBe('app');
      expect(updatedUser.twoFactorAuth.verified).toBe(false);
    });

    it('should return success message for email method setup', async () => {
      const user = await createTestUser({ email: 'email2fa@example.com' });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id.toString(), method: 'email' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('email');
      expect(data.backupCodes).toBeDefined();
      expect(data.backupCodes).toHaveLength(8);
      // Should not expose QR code URL for email method
      expect(data.qrCodeUrl).toBeUndefined();
    });
  });

  // -- Verify Tests --

  describe('POST /api/security/two-factor/verify', () => {
    it('should require userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('User ID is required');
    });

    it('should require code or recovery code', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generateObjectId() }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('code');
    });

    it('should return 404 when user not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generateObjectId(), code: '123456' }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(404);
    });

    it('should reject invalid code', async () => {
      const user = await createTestUser({
        email: 'verify-invalid@example.com',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: '654321',
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id.toString(), code: '000000' }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(401);
    });

    it('should successfully verify a valid temporary code', async () => {
      const validCode = '654321';
      const user = await createTestUser({
        email: 'verify-success@example.com',
        pendingMfaVerification: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: validCode,
          codeGeneratedAt: new Date().toISOString(),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id.toString(), code: validCode }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify user state was updated
      const UserModel = getUserModel();
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.pendingMfaVerification).toBe(false);
      expect(updatedUser.twoFactorAuth.verified).toBe(true);
      expect(updatedUser.mfaSetupComplete).toBe(true);
    });
  });

  // -- Resend Tests --

  describe('POST /api/security/two-factor/resend', () => {
    it('should require userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('User ID is required');
    });

    it('should require valid method', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generateObjectId(), method: 'sms' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('authentication method');
    });

    it('should return 404 when user not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generateObjectId(), method: 'email' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(404);
    });

    it('should send new verification code successfully', async () => {
      const user = await createTestUser({
        email: 'resend@example.com',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          temporaryCode: '111111',
          codeGeneratedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id.toString(), method: 'email' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('Verification code sent');
      expect(data.sentTo).toBe('resend@example.com');

      // Verify the temporary code was updated in the database
      const UserModel = getUserModel();
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.twoFactorAuth.temporaryCode).toBeDefined();
      expect(updatedUser.twoFactorAuth.codeGeneratedAt).toBeDefined();
    });

    it('should initialize twoFactorAuth if not present', async () => {
      const user = await createTestUser({ email: 'newmfa@example.com' });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id.toString(), method: 'email' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify twoFactorAuth was initialized
      const UserModel = getUserModel();
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.twoFactorAuth).toBeDefined();
      expect(updatedUser.twoFactorAuth.method).toBe('email');
      expect(updatedUser.twoFactorAuth.temporaryCode).toBeDefined();
    });
  });
});
