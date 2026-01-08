import { faker } from '@faker-js/faker';

/**
 * Pool test fixture factory
 * Creates mock pool data for testing purposes
 */

export type ContributionStatus = 'pending' | 'confirmed' | 'verified';
export type MemberRole = 'ADMIN' | 'MEMBER';
export type PoolStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type PoolFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface TestPoolMember {
  userId: string;
  role: MemberRole;
  position: number;
  contributionStatus: ContributionStatus;
  contributionConfirmedAt?: Date;
  paymentMethod?: string;
}

export interface TestPool {
  name: string;
  description: string;
  contributionAmount: number;
  totalMembers: number;
  frequency: PoolFrequency;
  status: PoolStatus;
  currentRound: number;
  totalRounds: number;
  members: TestPoolMember[];
  paymentMethods: {
    venmo?: { enabled: boolean; username?: string };
    paypal?: { enabled: boolean; email?: string };
    cashapp?: { enabled: boolean; cashtag?: string };
    zelle?: { enabled: boolean; phone?: string; email?: string };
  };
  startDate?: Date;
  nextPayoutDate?: Date;
}

/**
 * Creates a test pool with optional overrides
 */
export const createTestPool = (
  adminId: string,
  overrides: Partial<TestPool> = {}
): TestPool => {
  const totalMembers = overrides.totalMembers || 5;

  return {
    name: faker.company.name() + ' Pool',
    description: faker.lorem.sentence(),
    contributionAmount: 10,
    totalMembers,
    frequency: 'weekly',
    status: 'ACTIVE',
    currentRound: 1,
    totalRounds: totalMembers,
    members: [
      {
        userId: adminId,
        role: 'ADMIN',
        position: 1,
        contributionStatus: 'pending',
      },
    ],
    paymentMethods: {
      venmo: { enabled: true, username: '@pooladmin' },
      paypal: { enabled: true, email: 'pool@paypal.com' },
    },
    startDate: new Date(),
    ...overrides,
  };
};

/**
 * Creates a pool with multiple members
 */
export const createPoolWithMembers = (
  adminId: string,
  memberIds: string[],
  overrides: Partial<TestPool> = {}
): TestPool => {
  const pool = createTestPool(adminId, {
    totalMembers: memberIds.length + 1,
    ...overrides,
  });

  memberIds.forEach((memberId, index) => {
    pool.members.push({
      userId: memberId,
      role: 'MEMBER',
      position: index + 2,
      contributionStatus: 'pending',
    });
  });

  pool.totalRounds = pool.members.length;
  return pool;
};

/**
 * Creates a pool with all contributions in a specific status
 */
export const createPoolWithContributions = (
  adminId: string,
  memberIds: string[],
  contributionStatus: ContributionStatus,
  overrides: Partial<TestPool> = {}
): TestPool => {
  const pool = createPoolWithMembers(adminId, memberIds, overrides);

  pool.members = pool.members.map((member) => ({
    ...member,
    contributionStatus,
    contributionConfirmedAt:
      contributionStatus !== 'pending' ? new Date() : undefined,
    paymentMethod: contributionStatus !== 'pending' ? 'venmo' : undefined,
  }));

  return pool;
};

/**
 * Creates a pool ready for payout (all contributions verified)
 */
export const createPoolReadyForPayout = (
  adminId: string,
  memberIds: string[],
  overrides: Partial<TestPool> = {}
): TestPool =>
  createPoolWithContributions(adminId, memberIds, 'verified', overrides);

/**
 * Creates a completed pool
 */
export const createCompletedPool = (
  adminId: string,
  memberIds: string[],
  overrides: Partial<TestPool> = {}
): TestPool => {
  const totalMembers = memberIds.length + 1;
  return createPoolWithMembers(adminId, memberIds, {
    status: 'COMPLETED',
    currentRound: totalMembers,
    totalRounds: totalMembers,
    ...overrides,
  });
};

/**
 * Pre-defined test pools for consistent testing
 */
export const testPools = {
  standard: (adminId: string) =>
    createTestPool(adminId, {
      name: 'Standard Test Pool',
      contributionAmount: 10,
      totalMembers: 5,
    }),

  minContribution: (adminId: string) =>
    createTestPool(adminId, {
      name: 'Minimum Contribution Pool',
      contributionAmount: 1,
      totalMembers: 3,
    }),

  maxContribution: (adminId: string) =>
    createTestPool(adminId, {
      name: 'Maximum Contribution Pool',
      contributionAmount: 20,
      totalMembers: 10,
    }),

  monthly: (adminId: string) =>
    createTestPool(adminId, {
      name: 'Monthly Pool',
      frequency: 'monthly',
      contributionAmount: 15,
      totalMembers: 4,
    }),

  paused: (adminId: string) =>
    createTestPool(adminId, {
      name: 'Paused Pool',
      status: 'PAUSED',
    }),
};

/**
 * Calculate expected payout amount
 */
export const calculatePayoutAmount = (pool: TestPool): number =>
  pool.contributionAmount * pool.members.length;

/**
 * Get current round recipient
 */
export const getCurrentRecipient = (pool: TestPool): TestPoolMember | undefined =>
  pool.members.find((m) => m.position === pool.currentRound);
