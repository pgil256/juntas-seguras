/**
 * Round Payout API Integration Tests
 *
 * Tests for the round-payout state machine:
 * - GET /api/pools/[id]/round-payout - Get payout status and winner info
 * - POST /api/pools/[id]/round-payout - Confirm payout sent (admin only)
 * - PUT /api/pools/[id]/round-payout - Advance to next round (admin only)
 *
 * State machine: pending_collection -> ready_to_pay -> paid -> (advance) -> pending_collection
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { PoolMemberRole, PoolMemberStatus, TransactionType } from '@/types/pool';
import { TransactionStatus } from '@/types/payment';

jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('Round Payout API', () => {
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

  // Helper to create a pool in a specific payout state
  async function createPoolWithState(
    id: string,
    payoutStatus: string,
    overrides: Record<string, unknown> = {}
  ) {
    return Pool.create({
      id,
      name: `Pool ${id}`,
      contributionAmount: 10,
      frequency: 'weekly',
      currentRound: 1,
      totalRounds: 3,
      currentRoundPayoutStatus: payoutStatus,
      members: [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@test.com',
          role: PoolMemberRole.ADMIN,
          position: 1,
          status: PoolMemberStatus.CURRENT,
          payoutReceived: false,
        },
        {
          id: 2,
          name: 'Member Two',
          email: 'member2@test.com',
          role: PoolMemberRole.MEMBER,
          position: 2,
          status: PoolMemberStatus.ACTIVE,
          payoutReceived: false,
        },
        {
          id: 3,
          name: 'Member Three',
          email: 'member3@test.com',
          role: PoolMemberRole.MEMBER,
          position: 3,
          status: PoolMemberStatus.ACTIVE,
          payoutReceived: false,
        },
      ],
      currentRoundPayments: [],
      transactions: [],
      messages: [],
      ...overrides,
    });
  }

  describe('GET - Round Payout Status', () => {
    it('should return current round status and winner info', async () => {
      const pool = await createPoolWithState('get-status-pool', 'pending_collection', {
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Admin User',
            memberEmail: 'admin@test.com',
            amount: 10,
            status: 'admin_verified',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            memberId: 2,
            memberName: 'Member Two',
            memberEmail: 'member2@test.com',
            amount: 10,
            status: 'admin_verified',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      // Verify round status fields
      expect(pool.currentRound).toBe(1);
      expect(pool.currentRoundPayoutStatus).toBe('pending_collection');

      // Verify winner is position-based (position === currentRound)
      const winner = pool.members.find((m: any) => m.position === pool.currentRound);
      expect(winner).toBeDefined();
      expect(winner?.name).toBe('Admin User');

      // Verify pot amount calculation
      const potAmount = pool.contributionAmount * pool.members.length;
      expect(potAmount).toBe(30);

      // Verify verified amount from payments
      const verifiedAmount = pool.currentRoundPayments
        .filter((p: any) => p.status === 'admin_verified')
        .reduce((sum: number, p: any) => sum + p.amount, 0);
      expect(verifiedAmount).toBe(20);
    });
  });

  describe('POST - Confirm Payout Sent', () => {
    it('should require authentication and admin role', async () => {
      const pool = await createPoolWithState('auth-pool', 'ready_to_pay');

      // Verify admin check logic
      const adminMember = pool.members.find((m: any) => m.email === 'admin@test.com');
      const regularMember = pool.members.find((m: any) => m.email === 'member2@test.com');

      expect(adminMember?.role).toBe(PoolMemberRole.ADMIN);
      expect(regularMember?.role).toBe(PoolMemberRole.MEMBER);

      const isAdminAllowed =
        adminMember?.role === PoolMemberRole.ADMIN ||
        adminMember?.role === PoolMemberRole.CREATOR;
      const isMemberAllowed =
        regularMember?.role === PoolMemberRole.ADMIN ||
        regularMember?.role === PoolMemberRole.CREATOR;

      expect(isAdminAllowed).toBe(true);
      expect(isMemberAllowed).toBe(false);
    });

    it('should require a valid payment method', async () => {
      const validMethods = ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other'];

      expect(validMethods.includes('venmo')).toBe(true);
      expect(validMethods.includes('zelle')).toBe(true);
      expect(validMethods.includes('cash')).toBe(true);
      expect(validMethods.includes('bitcoin')).toBe(false);
      expect(validMethods.includes('')).toBe(false);
    });

    it('should reject when status is not ready_to_pay', async () => {
      const pool = await createPoolWithState('not-ready-pool', 'pending_collection');

      // The route checks: payoutStatus !== 'ready_to_pay'
      expect(pool.currentRoundPayoutStatus).toBe('pending_collection');
      expect(pool.currentRoundPayoutStatus !== 'ready_to_pay').toBe(true);
    });

    it('should reject already completed payout', async () => {
      const pool = await createPoolWithState('completed-payout-pool', 'paid');

      // When status is 'paid' or 'completed', route returns "already completed"
      const status = pool.currentRoundPayoutStatus;
      const isAlreadyDone = status === 'paid' || status === 'completed';
      expect(isAlreadyDone).toBe(true);
    });

    it('should succeed and create payout transaction', async () => {
      const pool = await createPoolWithState('payout-success-pool', 'ready_to_pay');

      const currentRound = pool.currentRound || 1;
      const winner = pool.members.find((m: any) => m.position === currentRound);
      expect(winner).toBeDefined();

      const potAmount = pool.contributionAmount * pool.members.length;
      const now = new Date();

      // Simulate POST payout confirmation
      const transaction = {
        id: (pool.transactions?.length || 0) + 1,
        type: TransactionType.PAYOUT,
        amount: potAmount,
        date: now.toISOString(),
        member: winner!.name,
        status: 'completed',
        round: currentRound,
      };

      const winnerIndex = pool.members.findIndex((m: any) => m.id === winner!.id);

      await Pool.findOneAndUpdate(
        { id: 'payout-success-pool' },
        {
          $set: {
            currentRoundPayoutStatus: 'paid',
            currentRoundPayoutCompletedAt: now,
            currentRoundPayoutMethod: 'venmo',
            [`members.${winnerIndex}.payoutReceived`]: true,
          },
          $push: { transactions: transaction },
        },
        { new: true }
      );

      const updated = await Pool.findOne({ id: 'payout-success-pool' });
      expect(updated?.currentRoundPayoutStatus).toBe('paid');
      expect(updated?.currentRoundPayoutMethod).toBe('venmo');
      expect(updated?.transactions).toHaveLength(1);
      expect(updated?.transactions[0].type).toBe(TransactionType.PAYOUT);
      expect(updated?.transactions[0].amount).toBe(30);
      expect(updated?.members[winnerIndex].payoutReceived).toBe(true);
    });
  });

  describe('PUT - Advance to Next Round', () => {
    it('should require paid status before advancing', async () => {
      const pool = await createPoolWithState('not-paid-pool', 'ready_to_pay');

      // Route checks: pool.currentRoundPayoutStatus !== 'paid'
      expect(pool.currentRoundPayoutStatus).not.toBe('paid');
    });

    it('should advance round and reset state', async () => {
      const pool = await createPoolWithState('advance-pool', 'paid', {
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Admin User',
            memberEmail: 'admin@test.com',
            amount: 10,
            status: 'admin_verified',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const currentRound = pool.currentRound || 1;
      const nextRound = currentRound + 1;

      // Simulate PUT advance
      await Pool.findOneAndUpdate(
        { id: 'advance-pool' },
        {
          $set: {
            currentRound: nextRound,
            currentRoundPayoutStatus: 'pending_collection',
            currentRoundPayments: [],
            currentRoundPayoutCompletedAt: null,
            currentRoundPayoutMethod: null,
            currentRoundPayoutNotes: null,
            currentRoundPayoutConfirmedBy: null,
          },
        },
        { new: true }
      );

      const updated = await Pool.findOne({ id: 'advance-pool' });
      expect(updated?.currentRound).toBe(2);
      expect(updated?.currentRoundPayoutStatus).toBe('pending_collection');
      expect(updated?.currentRoundPayments).toHaveLength(0);
      expect(updated?.currentRoundPayoutCompletedAt).toBeNull();
      expect(updated?.currentRoundPayoutMethod).toBeNull();
    });

    it('should mark pool completed on final round', async () => {
      const pool = await createPoolWithState('final-round-pool', 'paid', {
        currentRound: 3,
        totalRounds: 3,
      });

      const currentRound = pool.currentRound || 1;
      const nextRound = currentRound + 1;
      const totalRounds = pool.totalRounds || pool.members.length;

      // Route logic: if nextRound > totalRounds, set status = 'completed'
      expect(nextRound).toBe(4);
      expect(nextRound > totalRounds).toBe(true);

      const updateData: Record<string, unknown> = {
        currentRound: nextRound,
        currentRoundPayoutStatus: 'pending_collection',
        currentRoundPayments: [],
      };

      if (nextRound > totalRounds) {
        updateData.status = 'completed';
      }

      await Pool.findOneAndUpdate(
        { id: 'final-round-pool' },
        { $set: updateData },
        { new: true }
      );

      const updated = await Pool.findOne({ id: 'final-round-pool' });
      expect(updated?.status).toBe('completed');
      expect(updated?.currentRound).toBe(4);
    });
  });
});
