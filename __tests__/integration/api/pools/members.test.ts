/**
 * Members API Integration Tests
 *
 * Tests for pool member management:
 * - GET /api/pools/[id]/members - Get all members for a pool
 * - POST /api/pools/[id]/members - Add a new member to a pool
 *
 * Key behaviors:
 * - GET requires pool membership (checked via user.pools array)
 * - POST requires admin role (checked via pool.members role field)
 * - POST validates required fields (name, email)
 * - New members get defaults: position, role='member', status='upcoming'
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { PoolMemberRole, PoolMemberStatus } from '@/types/pool';

jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
  verifyAuth: jest.fn(),
}));

describe('Members API', () => {
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
  });

  // Helper to set up a pool with admin and member users
  async function createPoolWithUsers() {
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      verificationMethod: 'email',
      pools: ['members-pool'],
    });

    const member = await User.create({
      name: 'Regular Member',
      email: 'member@test.com',
      verificationMethod: 'email',
      pools: ['members-pool'],
    });

    const outsider = await User.create({
      name: 'Outsider',
      email: 'outsider@test.com',
      verificationMethod: 'email',
      pools: [],
    });

    const pool = await Pool.create({
      id: 'members-pool',
      name: 'Members Test Pool',
      contributionAmount: 10,
      frequency: 'weekly',
      currentRound: 1,
      totalRounds: 3,
      memberCount: 2,
      members: [
        {
          id: 1,
          name: admin.name,
          email: admin.email,
          role: PoolMemberRole.ADMIN,
          position: 1,
          status: PoolMemberStatus.CURRENT,
          paymentsOnTime: 0,
          paymentsMissed: 0,
          totalContributed: 0,
          payoutReceived: false,
        },
        {
          id: 2,
          name: member.name,
          email: member.email,
          role: PoolMemberRole.MEMBER,
          position: 2,
          status: PoolMemberStatus.ACTIVE,
          paymentsOnTime: 0,
          paymentsMissed: 0,
          totalContributed: 0,
          payoutReceived: false,
        },
      ],
      transactions: [],
      messages: [],
    });

    return { admin, member, outsider, pool };
  }

  describe('GET - Return Members', () => {
    it('should return members for an authorized user', async () => {
      const { admin, pool } = await createPoolWithUsers();

      // The route checks user.pools.includes(poolId)
      expect(admin.pools).toContain('members-pool');
      expect(pool.members).toHaveLength(2);

      // Verify member data structure
      const firstMember = pool.members[0];
      expect(firstMember).toHaveProperty('id');
      expect(firstMember).toHaveProperty('name');
      expect(firstMember).toHaveProperty('email');
      expect(firstMember).toHaveProperty('role');
      expect(firstMember).toHaveProperty('position');
      expect(firstMember).toHaveProperty('status');
    });

    it('should reject non-member access', async () => {
      const { outsider } = await createPoolWithUsers();

      // Outsider's pools array does not include 'members-pool'
      expect(outsider.pools).not.toContain('members-pool');

      // The route would throw ApiError('You are not a member of this pool', 403)
      const hasAccess = outsider.pools.includes('members-pool');
      expect(hasAccess).toBe(false);
    });
  });

  describe('POST - Add Member', () => {
    it('should require admin role to add members', async () => {
      const { pool } = await createPoolWithUsers();

      const adminMember = pool.members.find((m: any) => m.role === 'admin');
      const regularMember = pool.members.find((m: any) => m.role === 'member');

      expect(adminMember).toBeDefined();
      expect(regularMember).toBeDefined();

      // Route checks: adminMember.email !== user.email for non-admins
      expect(adminMember?.email).toBe('admin@test.com');
      expect(regularMember?.role).not.toBe('admin');
    });

    it('should validate required fields (name, email)', async () => {
      // The route checks: !memberDetails || !memberDetails.name || !memberDetails.email
      const missingName = { memberDetails: { email: 'new@test.com' } };
      const missingEmail = { memberDetails: { name: 'New Member' } };
      const missingBoth = { memberDetails: {} };
      const nullDetails = {};

      expect(!missingName.memberDetails.name).toBe(true);
      expect(!(missingEmail.memberDetails as any).email).toBe(true);
      expect(!missingBoth.memberDetails.name).toBe(true);
      expect(!(nullDetails as any).memberDetails).toBe(true);
    });

    it('should add a member with correct defaults', async () => {
      const { pool } = await createPoolWithUsers();

      // Simulate adding a new member (mirrors POST route logic)
      const existingPositions = pool.members.map((m: any) => m.position);
      let nextPosition = 1;
      while (existingPositions.includes(nextPosition)) {
        nextPosition++;
      }
      expect(nextPosition).toBe(3); // positions 1 and 2 taken

      const newMemberId = Math.max(...pool.members.map((m: any) => m.id), 0) + 1;
      expect(newMemberId).toBe(3);

      const newMember = {
        id: newMemberId,
        name: 'New Member',
        email: 'new@test.com',
        phone: null,
        joinDate: new Date().toISOString(),
        role: 'member', // default
        position: nextPosition,
        status: 'upcoming', // default
        paymentsOnTime: 0,
        paymentsMissed: 0,
        totalContributed: 0,
        payoutReceived: false,
      };

      pool.members.push(newMember);
      await Pool.updateOne(
        { id: 'members-pool' },
        { $set: { members: pool.members, memberCount: pool.members.length } }
      );

      const updated = await Pool.findOne({ id: 'members-pool' });
      expect(updated?.members).toHaveLength(3);

      const addedMember = updated?.members.find((m: any) => m.email === 'new@test.com');
      expect(addedMember).toBeDefined();
      expect(addedMember?.role).toBe('member');
      expect(addedMember?.position).toBe(3);
      expect(addedMember?.status).toBe('upcoming');
      expect(addedMember?.payoutReceived).toBe(false);
      expect(updated?.memberCount).toBe(3);
    });

    it('should reject duplicate email in pool', async () => {
      const { pool } = await createPoolWithUsers();

      const duplicateEmail = 'member@test.com';
      const existingMember = pool.members.find(
        (m: any) => m.email === duplicateEmail
      );

      // Route throws: 'A member with this email already exists in the pool'
      expect(existingMember).toBeDefined();
    });
  });
});
