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
import { getServerSession } from 'next-auth/next';
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

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn().mockResolvedValue({ messageId: 'local-mail' }) }),
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
    jest.mocked(getServerSession).mockResolvedValue(null);
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
    const user = await UserModel.create({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      hashedPassword: 'hashed',
      provider: 'credentials',
      emailVerified: true,
      isVerified: true,
      verificationMethod: 'email',
      ...overrides,
    });
    jest.mocked(getServerSession).mockResolvedValue({ user: { id: user._id.toString(), email: user.email } });
    return user;
  }

  // -- Setup Tests --

  describe('POST /api/security/two-factor/setup', () => {
    it('requires a signed-in user', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('should reject invalid authentication method', async () => {
      await createTestUser();
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'sms' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid authentication method');
    });

    it('requires the session account to exist', async () => {
      jest.mocked(getServerSession).mockResolvedValue({ user: { id: generateObjectId(), email: 'missing@example.test' } });
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(401);
    });

    it('should return QR code and secret for app (TOTP) setup', async () => {
      const user = await createTestUser({ email: 'totp@example.com' });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'app' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.secret).toBeDefined();
      expect(data.secret).toMatch(/^[A-Z2-7]+$/);
      expect(data.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
      expect(data.backupCodes).toBeDefined();
      expect(data.backupCodes).toHaveLength(10);

      // Verify user was updated in the database
      const UserModel = getUserModel();
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.twoFactorAuth.enabled).toBe(true);
      expect(updatedUser.twoFactorAuth.method).toBe('app');
      expect(updatedUser.twoFactorAuth.verified).toBe(false);
    });

    it('should return success message for email method setup', async () => {
      await createTestUser({ email: 'email2fa@example.com' });

      const request = new NextRequest('http://localhost:3000/api/security/two-factor/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      });

      const response = await setupPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('email');
      expect(data.backupCodes).toBeDefined();
      expect(data.backupCodes).toHaveLength(10);
      // Should not expose QR code URL for email method
      expect(data.qrCodeUrl).toBeUndefined();
    });
  });

  // -- Verify Tests --

  describe('POST /api/security/two-factor/verify', () => {
    it('requires a signed-in user', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('should require code or recovery code', async () => {
      await createTestUser();
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('code');
    });

    it('requires the session account to exist', async () => {
      jest.mocked(getServerSession).mockResolvedValue({ user: { id: generateObjectId(), email: 'missing@example.test' } });
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      });

      const response = await verifyPOST(request);
      expect(response.status).toBe(401);
    });

    it('should reject invalid code', async () => {
      await createTestUser({
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
        body: JSON.stringify({ code: '000000' }),
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
        body: JSON.stringify({ code: validCode }),
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
    it('requires a signed-in user', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('explains that an authenticator code is generated by the app', async () => {
      await createTestUser({ twoFactorAuth: { method: 'app', enabled: true } });
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'sms' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('cannot be resent');
    });

    it('requires the session account to exist', async () => {
      jest.mocked(getServerSession).mockResolvedValue({ user: { id: generateObjectId(), email: 'missing@example.test' } });
      const request = new NextRequest('http://localhost:3000/api/security/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      });

      const response = await resendPOST(request);
      expect(response.status).toBe(401);
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
        body: JSON.stringify({ method: 'email' }),
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
        body: JSON.stringify({ method: 'email' }),
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
