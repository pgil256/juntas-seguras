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
    const regularUser = await seedTestUser(TEST_USERS.regular);
    const adminUser = await seedTestUser(TEST_USERS.admin);
    await seedTestPool(regularUser, adminUser);

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
    throw error;
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

  return await UserModel.findOneAndUpdate(
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

async function seedTestPool(regularUser: any, adminUser: any) {
  const { getUserModel } = require('../lib/db/models/user');
  const { getPoolModel } = require('../lib/db/models/pool');
  const UserModel = getUserModel();
  const PoolModel = getPoolModel();

  const poolId = 'e2e-pool-0001';
  const e2eUserIds = [regularUser._id, adminUser._id];
  const e2eUserEmails = [regularUser.email, adminUser.email];
  const stalePools = await PoolModel.find({
    $and: [
      {
        $or: [
          { id: poolId },
          { name: /^Test Pool \d+$/ },
          { description: 'A test pool for E2E testing' },
          { description: 'Seeded pool for authenticated E2E portfolio checks' },
        ],
      },
      {
        $or: [
          { id: poolId },
          { creatorId: { $in: e2eUserIds } },
          { 'members.email': { $in: e2eUserEmails } },
        ],
      },
    ],
  }).select('id');
  const stalePoolIds = stalePools.map((pool: any) => pool.id).filter(Boolean);

  if (stalePoolIds.length > 0) {
    await PoolModel.deleteMany({ id: { $in: stalePoolIds } });
    await UserModel.updateMany(
      { _id: { $in: e2eUserIds } },
      { $pull: { pools: { $in: stalePoolIds } } }
    );
  }

  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const contributionAmount = 20;
  const members = [
    {
      id: 1,
      userId: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      joinDate: daysAgo(35).toISOString(),
      joinedDate: daysAgo(35),
      role: 'admin',
      position: 1,
      status: 'active',
      paymentsOnTime: 2,
      paymentsMissed: 0,
      missedPayments: 0,
      totalContributed: contributionAmount * 2,
      payoutReceived: true,
      hasReceivedPayout: true,
      payoutDate: daysAgo(21).toISOString(),
      contributionAmount,
      payoutMethods: { venmo: '@e2e-admin', preferred: 'venmo' },
    },
    {
      id: 2,
      userId: regularUser._id,
      name: regularUser.name,
      email: regularUser.email,
      joinDate: daysAgo(35).toISOString(),
      joinedDate: daysAgo(35),
      role: 'member',
      position: 2,
      status: 'active',
      paymentsOnTime: 1,
      paymentsMissed: 0,
      missedPayments: 0,
      totalContributed: contributionAmount,
      payoutReceived: false,
      hasReceivedPayout: false,
      payoutDate: '',
      contributionAmount,
      payoutMethods: { venmo: '@e2e-user', preferred: 'venmo' },
    },
    {
      id: 3,
      name: 'E2E Member Three',
      email: 'e2e-member-three@example.com',
      joinDate: daysAgo(35).toISOString(),
      joinedDate: daysAgo(35),
      role: 'member',
      position: 3,
      status: 'active',
      paymentsOnTime: 2,
      paymentsMissed: 0,
      missedPayments: 0,
      totalContributed: contributionAmount * 2,
      payoutReceived: false,
      hasReceivedPayout: false,
      payoutDate: '',
      contributionAmount,
      payoutMethods: { venmo: '@e2e-three', preferred: 'venmo' },
    },
    {
      id: 4,
      name: 'E2E Member Four',
      email: 'e2e-member-four@example.com',
      joinDate: daysAgo(35).toISOString(),
      joinedDate: daysAgo(35),
      role: 'member',
      position: 4,
      status: 'active',
      paymentsOnTime: 1,
      paymentsMissed: 0,
      missedPayments: 0,
      totalContributed: contributionAmount,
      payoutReceived: false,
      hasReceivedPayout: false,
      payoutDate: '',
      contributionAmount,
      payoutMethods: { venmo: '@e2e-four', preferred: 'venmo' },
    },
  ];

  await PoolModel.create({
    id: poolId,
    name: 'E2E Savings Circle',
    description: 'Seeded pool for authenticated E2E portfolio checks',
    createdAt: daysAgo(35).toISOString(),
    creatorId: adminUser._id,
    status: 'active',
    totalAmount: contributionAmount * members.length,
    contributionAmount,
    frequency: 'weekly',
    startDate: daysAgo(35),
    currentRound: 2,
    currentCycle: 1,
    totalRounds: members.length,
    totalCycles: 1,
    nextPayoutDate: daysFromNow(5).toISOString(),
    memberCount: members.length,
    maxMembers: 8,
    members,
    transactions: [
      ...members.map((member, index) => ({
        id: index + 1,
        type: 'contribution',
        amount: contributionAmount,
        date: daysAgo(28).toISOString(),
        member: member.name,
        status: 'completed',
        round: 1,
      })),
      {
        id: members.length + 1,
        type: 'payout',
        amount: contributionAmount * members.length,
        date: daysAgo(21).toISOString(),
        member: adminUser.name,
        status: 'completed',
        round: 1,
      },
      {
        id: members.length + 2,
        type: 'contribution',
        amount: contributionAmount,
        date: daysAgo(2).toISOString(),
        member: adminUser.name,
        status: 'completed',
        round: 2,
      },
      {
        id: members.length + 3,
        type: 'contribution',
        amount: contributionAmount,
        date: daysAgo(2).toISOString(),
        member: 'E2E Member Three',
        status: 'completed',
        round: 2,
      },
    ],
    messages: [
      {
        id: 1,
        author: adminUser.name,
        content: 'Welcome to the E2E savings circle.',
        date: daysAgo(35).toISOString(),
      },
    ],
    allowedPaymentMethods: ['venmo', 'paypal', 'zelle'],
    adminPaymentMethods: {
      venmo: '@e2e-admin',
      paypal: 'e2e-admin',
      zelle: adminUser.email,
      preferred: 'venmo',
      updatedAt: now,
    },
    currentRoundPayments: [
      {
        memberId: 1,
        memberName: adminUser.name,
        memberEmail: adminUser.email,
        amount: contributionAmount,
        status: 'admin_verified',
        memberConfirmedAt: daysAgo(2),
        memberConfirmedVia: 'venmo',
        adminVerifiedAt: daysAgo(1),
        adminVerifiedBy: adminUser._id,
        dueDate: daysFromNow(4),
        reminderCount: 0,
        createdAt: daysAgo(7),
        updatedAt: now,
      },
      {
        memberId: 2,
        memberName: regularUser.name,
        memberEmail: regularUser.email,
        amount: contributionAmount,
        status: 'pending',
        dueDate: daysFromNow(4),
        reminderCount: 0,
        createdAt: daysAgo(7),
        updatedAt: now,
      },
      {
        memberId: 3,
        memberName: 'E2E Member Three',
        memberEmail: 'e2e-member-three@example.com',
        amount: contributionAmount,
        status: 'admin_verified',
        memberConfirmedAt: daysAgo(2),
        memberConfirmedVia: 'paypal',
        adminVerifiedAt: daysAgo(1),
        adminVerifiedBy: adminUser._id,
        dueDate: daysFromNow(4),
        reminderCount: 0,
        createdAt: daysAgo(7),
        updatedAt: now,
      },
      {
        memberId: 4,
        memberName: 'E2E Member Four',
        memberEmail: 'e2e-member-four@example.com',
        amount: contributionAmount,
        status: 'member_confirmed',
        memberConfirmedAt: daysAgo(1),
        memberConfirmedVia: 'zelle',
        dueDate: daysFromNow(4),
        reminderCount: 0,
        createdAt: daysAgo(7),
        updatedAt: now,
      },
    ],
    currentRoundPayoutStatus: 'pending_collection',
  });

  await UserModel.updateMany(
    { _id: { $in: [regularUser._id, adminUser._id] } },
    {
      $addToSet: { pools: poolId },
      $set: {
        payoutMethods: {
          venmo: '@e2e-user',
          paypal: 'e2e-user',
          zelle: regularUser.email,
          preferred: 'venmo',
          updatedAt: now,
        },
      },
    }
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
    await page.waitForURL(/\/(mfa\/verify|dashboard|pools)/, { timeout: 30000 });

    // Handle MFA if required
    if (page.url().includes('/mfa/verify')) {
      const codeInput = page.locator('#code');
      await codeInput.waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForFunction(() => {
        const input = document.querySelector<HTMLInputElement>('#code');
        return Boolean(input && !input.disabled);
      }, undefined, { timeout: 30000 });

      // Fill in MFA code
      await codeInput.fill(getTestMfaCode());
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL(/\/(dashboard|pools)/, { timeout: 30000 });
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
