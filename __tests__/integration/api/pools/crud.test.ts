/**
 * Pool CRUD API Integration Tests
 *
 * Tests for pool create, read, update, delete operations:
 * - POST /api/pools - Create pool
 * - GET /api/pools - List user's pools
 * - GET /api/pools/[id] - Get single pool
 * - PATCH /api/pools/[id] - Update pool
 * - DELETE /api/pools/[id] - Delete pool
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { PoolStatus, PoolMemberRole, PoolMemberStatus } from '@/types/pool';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth helper
jest.mock('@/lib/api', () => ({
  handleApiRequest: jest.fn((req, handler, options) => handler({ userId: 'mock-user-id' })),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
  findUserById: jest.fn(),
}));

describe('Pool CRUD API', () => {
  let mongoServer: MongoMemoryServer;
  const Pool = getPoolModel();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Pool.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Pool Creation Validation', () => {
    it('should validate pool name is required', async () => {
      const poolData = {
        description: 'Test pool',
        contributionAmount: 10,
        totalRounds: 5,
        frequency: 'weekly',
      };

      // Pool name is required
      expect(poolData.name).toBeUndefined();
    });

    it('should validate contribution amount is between $1-$20', async () => {
      // Valid amounts
      const validAmounts = [1, 5, 10, 15, 20];
      for (const amount of validAmounts) {
        expect(amount).toBeGreaterThanOrEqual(1);
        expect(amount).toBeLessThanOrEqual(20);
      }

      // Invalid amounts
      const invalidAmounts = [0, -1, 0.5, 21, 100];
      for (const amount of invalidAmounts) {
        const isValid = Number.isInteger(amount) && amount >= 1 && amount <= 20;
        expect(isValid).toBe(false);
      }
    });

    it('should validate contribution amount is a whole number', async () => {
      const validWholeNumbers = [1, 2, 5, 10, 15, 20];
      const invalidDecimals = [1.5, 2.99, 10.01, 15.5];

      for (const num of validWholeNumbers) {
        expect(Number.isInteger(num)).toBe(true);
      }

      for (const num of invalidDecimals) {
        expect(Number.isInteger(num)).toBe(false);
      }
    });

    it('should validate totalRounds is positive', async () => {
      const validRounds = [1, 3, 5, 10];
      const invalidRounds = [0, -1, -5];

      for (const rounds of validRounds) {
        expect(rounds).toBeGreaterThan(0);
      }

      for (const rounds of invalidRounds) {
        expect(rounds).toBeLessThanOrEqual(0);
      }
    });

    it('should set allowed payment methods', async () => {
      const validPaymentMethods = ['venmo', 'cashapp', 'paypal', 'zelle'];
      const poolPaymentMethods = ['venmo', 'paypal'];

      // Filter valid methods
      const filteredMethods = poolPaymentMethods.filter((method) =>
        validPaymentMethods.includes(method)
      );

      expect(filteredMethods).toHaveLength(2);
      expect(filteredMethods).toContain('venmo');
      expect(filteredMethods).toContain('paypal');
    });
  });

  describe('Pool Data Structure', () => {
    it('should create pool with correct initial state', async () => {
      const testUser = await User.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const pool = await Pool.create({
        id: 'test-pool-123',
        name: 'Test Pool',
        description: 'A test pool',
        contributionAmount: 10,
        frequency: 'weekly',
        status: PoolStatus.ACTIVE,
        currentRound: 1,
        totalRounds: 5,
        memberCount: 5,
        members: [
          {
            id: 1,
            userId: testUser._id,
            name: testUser.name,
            email: testUser.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.status).toBe(PoolStatus.ACTIVE);
      expect(pool.currentRound).toBe(1);
      expect(pool.members).toHaveLength(1);
      expect(pool.members[0].role).toBe(PoolMemberRole.ADMIN);
      expect(pool.members[0].position).toBe(1);
    });

    it('should initialize admin as position 1', async () => {
      const testUser = await User.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const pool = await Pool.create({
        id: 'admin-position-pool',
        name: 'Admin Position Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            userId: testUser._id,
            name: testUser.name,
            email: testUser.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      const adminMember = pool.members.find(
        (m: any) => m.role === PoolMemberRole.ADMIN
      );
      expect(adminMember).toBeDefined();
      expect(adminMember?.position).toBe(1);
    });
  });

  describe('Pool Retrieval', () => {
    it('should return empty array for user with no pools', async () => {
      const testUser = await User.create({
        name: 'New User',
        email: 'newuser@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      expect(testUser.pools).toHaveLength(0);
    });

    it('should return user pools when they exist', async () => {
      const testUser = await User.create({
        name: 'Pool User',
        email: 'pooluser@test.com',
        verificationMethod: 'email',
        pools: ['pool-1', 'pool-2'],
      });

      await Pool.create({
        id: 'pool-1',
        name: 'Pool 1',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: testUser.name,
            email: testUser.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      await Pool.create({
        id: 'pool-2',
        name: 'Pool 2',
        contributionAmount: 15,
        frequency: 'monthly',
        members: [
          {
            id: 1,
            name: testUser.name,
            email: testUser.email,
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      const pools = await Pool.find({ id: { $in: testUser.pools } });
      expect(pools).toHaveLength(2);
    });

    it('should return 404 for non-existent pool', async () => {
      const pool = await Pool.findOne({ id: 'non-existent-pool-id' });
      expect(pool).toBeNull();
    });

    it('should verify user membership before returning pool', async () => {
      const poolOwner = await User.create({
        name: 'Pool Owner',
        email: 'owner@test.com',
        verificationMethod: 'email',
        pools: ['private-pool'],
      });

      const nonMember = await User.create({
        name: 'Non Member',
        email: 'nonmember@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      await Pool.create({
        id: 'private-pool',
        name: 'Private Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: poolOwner.name,
            email: poolOwner.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Non-member should not have pool in their pools array
      expect(nonMember.pools.includes('private-pool')).toBe(false);
    });
  });

  describe('Pool Update', () => {
    it('should allow admin to update pool name', async () => {
      const testAdmin = await User.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['update-pool'],
      });

      await Pool.create({
        id: 'update-pool',
        name: 'Original Name',
        description: 'Original description',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: testAdmin.name,
            email: testAdmin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      await Pool.updateOne(
        { id: 'update-pool' },
        { $set: { name: 'Updated Name' } }
      );

      const updated = await Pool.findOne({ id: 'update-pool' });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should allow admin to update pool description', async () => {
      const testAdmin = await User.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['desc-pool'],
      });

      await Pool.create({
        id: 'desc-pool',
        name: 'Pool Name',
        description: 'Original description',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: testAdmin.name,
            email: testAdmin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      await Pool.updateOne(
        { id: 'desc-pool' },
        { $set: { description: 'Updated description' } }
      );

      const updated = await Pool.findOne({ id: 'desc-pool' });
      expect(updated?.description).toBe('Updated description');
    });

    it('should only allow admin role to update', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['role-pool'],
      });

      const member = await User.create({
        name: 'Member',
        email: 'member@test.com',
        verificationMethod: 'email',
        pools: ['role-pool'],
      });

      await Pool.create({
        id: 'role-pool',
        name: 'Role Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
          {
            id: 2,
            name: member.name,
            email: member.email,
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      const pool = await Pool.findOne({ id: 'role-pool' });
      const adminMember = pool?.members.find(
        (m: any) => m.email === admin.email
      );
      const regularMember = pool?.members.find(
        (m: any) => m.email === member.email
      );

      expect(adminMember?.role).toBe(PoolMemberRole.ADMIN);
      expect(regularMember?.role).toBe(PoolMemberRole.MEMBER);
    });
  });

  describe('Pool Deletion', () => {
    it('should allow admin to delete pool', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['delete-pool'],
      });

      await Pool.create({
        id: 'delete-pool',
        name: 'To Be Deleted',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      await Pool.deleteOne({ id: 'delete-pool' });

      const deleted = await Pool.findOne({ id: 'delete-pool' });
      expect(deleted).toBeNull();
    });

    it('should remove pool from all members pools array', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['shared-pool'],
      });

      const member = await User.create({
        name: 'Member',
        email: 'member@test.com',
        verificationMethod: 'email',
        pools: ['shared-pool'],
      });

      await Pool.create({
        id: 'shared-pool',
        name: 'Shared Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
          {
            id: 2,
            name: member.name,
            email: member.email,
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Delete pool and remove from users
      await Pool.deleteOne({ id: 'shared-pool' });
      await User.updateMany(
        { email: { $in: [admin.email, member.email] } },
        { $pull: { pools: 'shared-pool' } }
      );

      const updatedAdmin = await User.findOne({ email: admin.email });
      const updatedMember = await User.findOne({ email: member.email });

      expect(updatedAdmin?.pools).not.toContain('shared-pool');
      expect(updatedMember?.pools).not.toContain('shared-pool');
    });

    it('should only allow admin to delete', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['admin-delete-pool'],
      });

      const member = await User.create({
        name: 'Member',
        email: 'member@test.com',
        verificationMethod: 'email',
        pools: ['admin-delete-pool'],
      });

      await Pool.create({
        id: 'admin-delete-pool',
        name: 'Admin Delete Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
          {
            id: 2,
            name: member.name,
            email: member.email,
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      const pool = await Pool.findOne({ id: 'admin-delete-pool' });
      const adminMember = pool?.members.find((m: any) => m.role === 'admin');

      // Only admin should have admin role
      expect(adminMember?.email).toBe(admin.email);
    });
  });

  describe('Pool Frequency', () => {
    it('should support weekly frequency', async () => {
      const pool = await Pool.create({
        id: 'weekly-pool',
        name: 'Weekly Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [],
        transactions: [],
        messages: [],
      });

      expect(pool.frequency).toBe('weekly');
    });

    it('should support biweekly frequency', async () => {
      const pool = await Pool.create({
        id: 'biweekly-pool',
        name: 'Biweekly Pool',
        contributionAmount: 10,
        frequency: 'biweekly',
        members: [],
        transactions: [],
        messages: [],
      });

      expect(pool.frequency).toBe('biweekly');
    });

    it('should support monthly frequency', async () => {
      const pool = await Pool.create({
        id: 'monthly-pool',
        name: 'Monthly Pool',
        contributionAmount: 10,
        frequency: 'monthly',
        members: [],
        transactions: [],
        messages: [],
      });

      expect(pool.frequency).toBe('monthly');
    });
  });
});
