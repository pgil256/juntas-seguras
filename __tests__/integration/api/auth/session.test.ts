/**
 * @jest-environment node
 */

/**
 * Session Management API Integration Tests
 *
 * Tests for session-related endpoints:
 * - GET  /api/auth/check-token
 * - POST /api/auth/force-refresh
 * - POST /api/auth/session-update
 */

import { NextRequest } from 'next/server';
import {
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  generateObjectId,
} from '../../../helpers/db.helpers';

// Mock nodemailer (imported transitively)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK',
    }),
  })),
}));

// Mock database connection
jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock getCurrentUser from lib/auth
const mockGetCurrentUser = jest.fn();
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  getCurrentUser: () => mockGetCurrentUser(),
  getSession: jest.fn().mockResolvedValue(null),
  isAuthenticated: jest.fn().mockResolvedValue(false),
  getCurrentUserId: jest.fn().mockResolvedValue(undefined),
  getAuthToken: jest.fn().mockResolvedValue(null),
  verifyAuth: jest.fn().mockResolvedValue({ error: 'Unauthorized', status: 401 }),
  addAuthHeader: jest.fn(),
}));

describe('Session Management Endpoints', () => {
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

    const userModule = await import('@/lib/db/models/user');
    getUserModel = userModule.getUserModel;
  });

  // ── GET /api/auth/check-token ───────────────────────────────────────

  describe('GET /api/auth/check-token', () => {
    let checkTokenGET: (req: Request) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/auth/check-token/route');
      checkTokenGET = mod.GET;
    });

    it('should return 400 when no token query param is provided', async () => {
      const request = new Request(
        'http://localhost:3000/api/auth/check-token',
        { method: 'GET' }
      );

      const response = await checkTokenGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should report token as invalid when no user has it', async () => {
      const request = new Request(
        'http://localhost:3000/api/auth/check-token?token=nonexistent-token',
        { method: 'GET' }
      );

      const response = await checkTokenGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokenValidity).toBe('invalid');
      expect(data.userFoundByExactToken).toBe(false);
    });

    it('should report token as valid when a user has it', async () => {
      const UserModel = getUserModel();
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      await UserModel.create({
        name: 'Token User',
        email: 'tokenuser@example.com',
        hashedPassword: 'hashed-placeholder',
        provider: 'credentials',
        verificationMethod: 'email',
        resetToken: 'my-valid-token',
        resetTokenExpiry: futureDate,
        twoFactorAuth: { enabled: true, method: 'email' },
      });

      const request = new Request(
        'http://localhost:3000/api/auth/check-token?token=my-valid-token',
        { method: 'GET' }
      );

      const response = await checkTokenGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokenValidity).toBe('valid');
      expect(data.userFoundByExactToken).toBe(true);
      expect(data.userDetails).toBeDefined();
      expect(data.userDetails.email).toBe('tokenuser@example.com');
    });

    it('should report expired status for an expired token', async () => {
      const UserModel = getUserModel();
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);

      await UserModel.create({
        name: 'Expired User',
        email: 'expired@example.com',
        hashedPassword: 'hashed-placeholder',
        provider: 'credentials',
        verificationMethod: 'email',
        resetToken: 'expired-token-abc',
        resetTokenExpiry: pastDate,
        twoFactorAuth: { enabled: true, method: 'email' },
      });

      const request = new Request(
        'http://localhost:3000/api/auth/check-token?token=expired-token-abc',
        { method: 'GET' }
      );

      const response = await checkTokenGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokenValidity).toBe('valid'); // token exists, route reports valid
      expect(data.isExpired).toBe(true);
    });
  });

  // ── POST /api/auth/force-refresh ────────────────────────────────────

  describe('POST /api/auth/force-refresh', () => {
    let forceRefreshPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/auth/force-refresh/route');
      forceRefreshPOST = mod.POST;
    });

    it('should return success with refresh message', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/force-refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await forceRefreshPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('refresh');
    });
  });

  // ── POST /api/auth/session-update ───────────────────────────────────

  describe('POST /api/auth/session-update', () => {
    let sessionUpdatePOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/auth/session-update/route');
      sessionUpdatePOST = mod.POST;
    });

    it('should return error when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        user: null,
        error: { message: 'Not authenticated', status: 401 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/session-update',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await sessionUpdatePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Not authenticated');
    });

    it('should clear MFA flags for an authenticated user', async () => {
      const UserModel = getUserModel();

      const testUser = await UserModel.create({
        name: 'Session User',
        email: 'session@example.com',
        hashedPassword: 'hashed-placeholder',
        provider: 'credentials',
        verificationMethod: 'email',
        pendingMfaVerification: true,
        twoFactorAuth: { enabled: true, method: 'email' },
      });

      mockGetCurrentUser.mockResolvedValueOnce({
        user: testUser,
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/session-update',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await sessionUpdatePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify the MFA flag was cleared in the database
      const updatedUser = await UserModel.findById(testUser._id);
      expect(updatedUser.pendingMfaVerification).toBe(false);
    });
  });
});
