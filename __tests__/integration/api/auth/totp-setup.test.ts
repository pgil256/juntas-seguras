/**
 * @jest-environment node
 */

/**
 * TOTP Setup API Integration Tests
 *
 * Tests for the POST /api/auth/totp-setup endpoint
 * covering TOTP secret generation, QR code creation, and storage.
 */

import { NextRequest } from 'next/server';
import {
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  generateObjectId,
} from '../../../helpers/db.helpers';

// Mock nodemailer (imported transitively by auth helpers)
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

describe('POST /api/auth/totp-setup', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let getUserModel: () => any;
  const testUserId = generateObjectId();

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.clearAllMocks();

    // Import the route handler
    const totpModule = await import('@/app/api/auth/totp-setup/route');
    POST = totpModule.POST;

    const userModule = await import('@/lib/db/models/user');
    getUserModel = userModule.getUserModel;
  });

  describe('Authentication', () => {
    it('should return error when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        user: null,
        error: { message: 'Not authenticated', status: 401 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/totp-setup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Not authenticated');
    });
  });

  describe('Successful TOTP Setup', () => {
    let testUser: any;

    beforeEach(async () => {
      const UserModel = getUserModel();

      testUser = await UserModel.create({
        name: 'TOTP Test User',
        email: 'totp-test@example.com',
        hashedPassword: 'hashed-placeholder',
        provider: 'credentials',
        verificationMethod: 'email',
        twoFactorAuth: {
          enabled: true,
          method: 'email',
        },
      });

      mockGetCurrentUser.mockResolvedValue({
        user: testUser,
        error: null,
      });
    });

    it('should generate a TOTP secret and QR code for authenticated user', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/totp-setup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.secret).toBeDefined();
      expect(data.qrCode).toBeDefined();
    });

    it('should return a base32-encoded secret', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/totp-setup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Base32 alphabet: A-Z and 2-7
      expect(data.secret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it('should return a QR code as a data URL', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/totp-setup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should store pendingTotpSecret in the user document', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/totp-setup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify the pending secret was persisted
      const UserModel = getUserModel();
      const updatedUser = await UserModel.findById(testUser._id);

      expect(updatedUser.twoFactorAuth.pendingTotpSecret).toBe(data.secret);
      expect(updatedUser.twoFactorAuth.method).toBe('totp');
    });
  });
});
