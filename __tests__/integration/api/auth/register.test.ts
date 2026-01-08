/**
 * Registration API Integration Tests
 *
 * Tests for the POST /api/auth/register endpoint
 * covering user registration flow with email and TOTP verification methods.
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

// Mock database connection
jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('POST /api/auth/register', () => {
  let POST: (req: NextRequest) => Promise<Response>;
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

    // Dynamically import the route handler
    const registerModule = await import('@/app/api/auth/register/route');
    POST = registerModule.POST;

    const userModule = await import('@/lib/db/models/user');
    getUserModel = userModule.getUserModel;
  });

  describe('Input Validation', () => {
    it('should reject request with missing name', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with missing email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with missing password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject request with missing verification method', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Successful Registration', () => {
    it('should register user with email verification method', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.userId).toBeDefined();
      expect(data.user.mfaMethod).toBe('email');
      expect(data.user.isTemporary).toBe(true);

      // Verify user was created in database
      const UserModel = getUserModel();
      const user = await UserModel.findOne({ email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.isTemporary).toBe(true);
      expect(user.twoFactorAuth.method).toBe('email');
    });

    it('should register user with TOTP verification method', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'TOTP User',
          email: 'totp@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'app',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.mfaMethod).toBe('app');
      expect(data.mfaSetup).toBeDefined();
      expect(data.mfaSetup.totpSecret).toBeDefined();
      expect(data.mfaSetup.totpUrl).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const plainPassword = 'SecurePass123!';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'hash@example.com',
          password: plainPassword,
          verificationMethod: 'email',
        }),
      });

      await POST(request);

      const UserModel = getUserModel();
      const user = await UserModel.findOne({ email: 'hash@example.com' });

      // Password should not be stored in plain text
      expect(user.hashedPassword).not.toBe(plainPassword);

      // Password should be verifiable with bcrypt
      const isMatch = await bcrypt.compare(plainPassword, user.hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should generate 6-digit verification code', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'code@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      await POST(request);

      const UserModel = getUserModel();
      const user = await UserModel.findOne({ email: 'code@example.com' });

      expect(user.twoFactorAuth.temporaryCode).toBeDefined();
      expect(user.twoFactorAuth.temporaryCode).toMatch(/^\d{6}$/);
      expect(user.twoFactorAuth.codeGeneratedAt).toBeDefined();
    });

    it('should send verification email for email method', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'verify@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      await POST(request);

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalled();
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('verify@example.com');
      expect(emailCall.subject).toContain('Verification');
    });

    it('should not return password in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'secure@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user.password).toBeUndefined();
      expect(data.user.hashedPassword).toBeUndefined();
    });

    it('should set user as temporary during registration', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'temp@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user.isTemporary).toBe(true);

      const UserModel = getUserModel();
      const user = await UserModel.findOne({ email: 'temp@example.com' });
      expect(user.isTemporary).toBe(true);
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('Duplicate Email Handling', () => {
    it('should reject duplicate email for verified user', async () => {
      const UserModel = getUserModel();

      // Create existing verified user
      await UserModel.create({
        name: 'Existing User',
        email: 'existing@example.com',
        hashedPassword: await bcrypt.hash('password123', 10),
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        isTemporary: false,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'existing@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already exists');
    });

    it('should clean up temporary unverified users before new registration', async () => {
      const UserModel = getUserModel();

      // Create existing temporary user
      await UserModel.create({
        name: 'Temp User',
        email: 'cleanup@example.com',
        hashedPassword: await bcrypt.hash('password123', 10),
        provider: 'credentials',
        emailVerified: false,
        isVerified: false,
        isTemporary: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'cleanup@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Verify only one user exists
      const users = await UserModel.find({ email: 'cleanup@example.com' });
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('New User');
    });
  });

  describe('Email Normalization', () => {
    it('should normalize email to lowercase', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'TEST@EXAMPLE.COM',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      await POST(request);

      const UserModel = getUserModel();
      const user = await UserModel.findOne({ email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('MFA Setup', () => {
    it('should set pendingMfaVerification to true', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'mfa@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      await POST(request);

      const UserModel = getUserModel();
      const user = await UserModel.findOne({ email: 'mfa@example.com' });
      expect(user.pendingMfaVerification).toBe(true);
      expect(user.mfaSetupComplete).toBe(false);
    });

    it('should set correct MFA method based on verification method', async () => {
      // Email method
      const emailRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Email User',
          email: 'method-email@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      await POST(emailRequest);

      const UserModel = getUserModel();
      const emailUser = await UserModel.findOne({ email: 'method-email@example.com' });
      expect(emailUser.twoFactorAuth.method).toBe('email');

      // App method
      const appRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'App User',
          email: 'method-app@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'app',
        }),
      });

      await POST(appRequest);

      const appUser = await UserModel.findOne({ email: 'method-app@example.com' });
      expect(appUser.twoFactorAuth.method).toBe('app');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle email sending failure gracefully', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'fail@example.com',
          password: 'SecurePass123!',
          verificationMethod: 'email',
        }),
      });

      const response = await POST(request);
      // The implementation should either:
      // 1. Return 500 and clean up the temp user
      // 2. Return success but log the email failure
      expect([201, 500]).toContain(response.status);
    });
  });
});
