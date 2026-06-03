/**
 * Global E2E Test Setup
 *
 * This file runs before all tests to set up:
 * - Authentication state for test users
 * - Test environment configuration
 *
 * Usage: This is configured as a setup project in playwright.config.ts
 */

import { chromium, FullConfig } from '@playwright/test';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import speakeasy from 'speakeasy';

[
  '.env.development.local',
  '.env.local',
  '.env.development',
  '.env',
].forEach((file) => {
  dotenv.config({ path: path.join(process.cwd(), file) });
});

// Storage state paths for different user types
export const AUTH_STATE_PATH = path.join(__dirname, '.auth');
export const USER_AUTH_FILE = path.join(AUTH_STATE_PATH, 'user.json');
export const ADMIN_AUTH_FILE = path.join(AUTH_STATE_PATH, 'admin.json');

// Test user credentials
export const TEST_USERS = {
  regular: {
    email: process.env.E2E_TEST_USER_EMAIL || 'e2e-test@example.com',
    password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
    name: 'E2E Test User',
  },
  admin: {
    email: process.env.E2E_TEST_ADMIN_EMAIL || 'e2e-admin@example.com',
    password: process.env.E2E_TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    name: 'E2E Admin User',
  },
};

// Test MFA code (should be accepted in test mode)
export const TEST_TOTP_SECRET = process.env.E2E_TEST_TOTP_SECRET || 'JBSWY3DPEHPK3PXP';

export function getTestMfaCode() {
  return speakeasy.totp({
    secret: TEST_TOTP_SECRET,
    encoding: 'base32',
  });
}

async function globalSetup(config: FullConfig) {
  // Create auth directory if it doesn't exist
  const fs = await import('fs');
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    fs.mkdirSync(AUTH_STATE_PATH, { recursive: true });
  }

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  // Skip auth setup if we're just running quick tests or if auth files exist
  const skipAuth = process.env.E2E_SKIP_AUTH === 'true';
  if (skipAuth) {
    console.log('Skipping auth setup (E2E_SKIP_AUTH=true)');
    return;
  }

  // Check if we should re-use existing auth state
  const reuseAuth = process.env.E2E_REUSE_AUTH === 'true';
  if (reuseAuth && fs.existsSync(USER_AUTH_FILE)) {
    console.log('Reusing existing auth state');
    return;
  }

  console.log('Setting up authentication state for E2E tests...');

  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1'
      ? { channel: 'chrome' }
      : undefined
  );

  try {
    await seedTestUser(TEST_USERS.regular);
    await seedTestUser(TEST_USERS.admin);

    // Set up regular user auth state
    await setupUserAuth(browser, baseURL, TEST_USERS.regular, USER_AUTH_FILE);
    console.log('Regular user auth state saved');

    // Set up admin user auth state (if different)
    if (TEST_USERS.admin.email !== TEST_USERS.regular.email) {
      await setupUserAuth(browser, baseURL, TEST_USERS.admin, ADMIN_AUTH_FILE);
      console.log('Admin user auth state saved');
    }
  } catch (error) {
    console.error('Error during auth setup:', error);
    // Create empty auth files to prevent test failures
    fs.writeFileSync(USER_AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    console.log('Created empty auth state files');
  } finally {
    await browser.close();
  }
}

async function seedTestUser(user: { email: string; password: string; name: string }) {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to seed E2E users');
  }

  const { default: connectToDatabase } = require('../lib/db/connect');
  const { getUserModel } = require('../lib/db/models/user');

  await connectToDatabase();
  const UserModel = getUserModel();
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const now = new Date();

  await UserModel.findOneAndUpdate(
    { email: user.email.toLowerCase() },
    {
      $set: {
        name: user.name,
        email: user.email.toLowerCase(),
        hashedPassword,
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        isTemporary: false,
        verificationMethod: 'email',
        pendingMfaVerification: false,
        mfaSetupComplete: true,
        lastLogin: now,
        twoFactorAuth: {
          enabled: true,
          method: 'app',
          verified: true,
          totpSecret: TEST_TOTP_SECRET,
          backupCodes: [],
          lastUpdated: now.toISOString(),
        },
        metadata: {
          mfaFailedAttempts: '0',
        },
      },
      $setOnInsert: {
        createdAt: now,
        pools: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function setupUserAuth(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
  baseURL: string,
  user: { email: string; password: string },
  authFile: string
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to sign-in page
    await page.goto(`${baseURL}/auth/signin`);

    // Fill in credentials
    await page.fill('input[name="email"], input[type="email"]', user.email);
    await page.fill('input[name="password"], input[type="password"]', user.password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation - could go to MFA or dashboard
    await page.waitForURL(/\/(mfa\/verify|dashboard|pools)/, { timeout: 10000 });

    // Handle MFA if required
    if (page.url().includes('/mfa/verify')) {
      // Fill in MFA code
      await page.fill('input[name="code"], input[type="text"]', getTestMfaCode());
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL(/\/(dashboard|pools)/, { timeout: 10000 });
    }

    // Save authentication state
    await context.storageState({ path: authFile });
  } catch (error) {
    console.error(`Failed to authenticate user ${user.email}:`, error);
    throw error;
  } finally {
    await context.close();
  }
}

export default globalSetup;
