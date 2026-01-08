import { faker } from '@faker-js/faker';

/**
 * User test fixture factory
 * Creates mock user data for testing purposes
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  mfaMethod: 'email' | 'totp';
  mfaSetupComplete: boolean;
  pendingMfaVerification: boolean;
  emailVerified?: boolean;
  totpSecret?: string;
  backupCodes?: string[];
  payoutMethods?: Array<{
    type: string;
    value: string;
    isPrimary: boolean;
  }>;
}

/**
 * Creates a test user with optional overrides
 */
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  email: faker.internet.email().toLowerCase(),
  password: 'SecurePass123!',
  name: faker.person.fullName(),
  mfaMethod: 'email',
  mfaSetupComplete: true,
  pendingMfaVerification: false,
  emailVerified: true,
  ...overrides,
});

/**
 * Creates a test user with TOTP MFA enabled
 */
export const createTotpUser = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({
    mfaMethod: 'totp',
    totpSecret: 'JBSWY3DPEHPK3PXP', // Test secret
    backupCodes: [
      '12345678',
      '23456789',
      '34567890',
      '45678901',
      '56789012',
      '67890123',
      '78901234',
      '89012345',
    ],
    ...overrides,
  });

/**
 * Creates an unverified test user
 */
export const createUnverifiedUser = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({
    emailVerified: false,
    mfaSetupComplete: false,
    pendingMfaVerification: true,
    ...overrides,
  });

/**
 * Pre-defined test users for consistent testing
 */
export const testUsers = {
  admin: createTestUser({
    email: 'admin@test.com',
    name: 'Test Admin',
  }),
  member1: createTestUser({
    email: 'member1@test.com',
    name: 'Test Member 1',
  }),
  member2: createTestUser({
    email: 'member2@test.com',
    name: 'Test Member 2',
  }),
  member3: createTestUser({
    email: 'member3@test.com',
    name: 'Test Member 3',
  }),
  member4: createTestUser({
    email: 'member4@test.com',
    name: 'Test Member 4',
  }),
  unverified: createUnverifiedUser({
    email: 'unverified@test.com',
    name: 'Unverified User',
  }),
  totpUser: createTotpUser({
    email: 'totp@test.com',
    name: 'TOTP User',
  }),
};

/**
 * Generate multiple random test users
 */
export const generateTestUsers = (count: number): TestUser[] =>
  Array.from({ length: count }, () => createTestUser());

/**
 * Create a user with payment methods
 */
export const createUserWithPaymentMethods = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({
    payoutMethods: [
      { type: 'venmo', value: '@testuser', isPrimary: true },
      { type: 'paypal', value: 'test@paypal.com', isPrimary: false },
      { type: 'cashapp', value: '$testuser', isPrimary: false },
      { type: 'zelle', value: '5551234567', isPrimary: false },
    ],
    ...overrides,
  });
