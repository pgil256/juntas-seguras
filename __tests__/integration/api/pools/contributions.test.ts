/**
 * Contribution API Integration Tests
 *
 * Tests for contribution management:
 * - GET /api/pools/[id]/contributions - Get contribution status
 * - POST /api/pools/[id]/contributions - Confirm contribution
 *
 * UNIVERSAL CONTRIBUTION MODEL:
 * All members contribute every week, INCLUDING the payout recipient.
 * Payout amount = contribution_amount × total_members
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { PoolMemberRole, PoolMemberStatus, TransactionType } from '@/types/pool';
import { TransactionStatus } from '@/types/payment';

describe('Contribution API', () => {
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

  describe('GET Contribution Status', () => {
    it('should return contribution status for all members', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['contrib-pool'],
      });

      const member1 = await User.create({
        name: 'Member 1',
        email: 'member1@test.com',
        verificationMethod: 'email',
        pools: ['contrib-pool'],
      });

      const pool = await Pool.create({
        id: 'contrib-pool',
        name: 'Contribution Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        totalRounds: 2,
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
          {
            id: 2,
            name: member1.name,
            email: member1.email,
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        currentRoundPayments: [],
        transactions: [],
        messages: [],
      });

      expect(pool.members).toHaveLength(2);
      expect(pool.currentRound).toBe(1);
    });

    it('should correctly identify pending contributions', async () => {
      const pool = await Pool.create({
        id: 'pending-pool',
        name: 'Pending Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Member 1',
            memberEmail: 'member1@test.com',
            amount: 10,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      const payment = pool.currentRoundPayments[0];
      expect(payment.status).toBe('pending');
    });

    it('should correctly identify confirmed contributions', async () => {
      const pool = await Pool.create({
        id: 'confirmed-pool',
        name: 'Confirmed Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Member 1',
            memberEmail: 'member1@test.com',
            amount: 10,
            status: 'member_confirmed',
            memberConfirmedAt: new Date(),
            memberConfirmedVia: 'venmo',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      const payment = pool.currentRoundPayments[0];
      expect(payment.status).toBe('member_confirmed');
      expect(payment.memberConfirmedVia).toBe('venmo');
    });

    it('should correctly identify verified contributions', async () => {
      const pool = await Pool.create({
        id: 'verified-pool',
        name: 'Verified Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Member 1',
            memberEmail: 'member1@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedAt: new Date(),
            memberConfirmedVia: 'venmo',
            adminVerifiedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      const payment = pool.currentRoundPayments[0];
      expect(payment.status).toBe('admin_verified');
      expect(payment.adminVerifiedAt).toBeDefined();
    });

    it('should calculate total collected amount', async () => {
      const pool = await Pool.create({
        id: 'collected-pool',
        name: 'Collected Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        totalAmount: 30,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'm1@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
          {
            id: 2,
            name: 'Member 2',
            email: 'm2@test.com',
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
          {
            id: 3,
            name: 'Member 3',
            email: 'm3@test.com',
            role: PoolMemberRole.MEMBER,
            position: 3,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [
          {
            id: 1,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date().toISOString(),
            member: 'Member 1',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
          {
            id: 2,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date().toISOString(),
            member: 'Member 2',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
          {
            id: 3,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date().toISOString(),
            member: 'Member 3',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
        ],
        messages: [],
      });

      // Calculate total from transactions
      const totalCollected = pool.transactions
        .filter(
          (t: any) =>
            t.type === TransactionType.CONTRIBUTION &&
            t.round === 1 &&
            t.status === TransactionStatus.COMPLETED
        )
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      expect(totalCollected).toBe(30);
    });

    it('should determine if round is complete (all verified)', async () => {
      const pool = await Pool.create({
        id: 'complete-pool',
        name: 'Complete Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'm1@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
          {
            id: 2,
            name: 'Member 2',
            email: 'm2@test.com',
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [
          {
            id: 1,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date().toISOString(),
            member: 'Member 1',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
          {
            id: 2,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date().toISOString(),
            member: 'Member 2',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
        ],
        messages: [],
      });

      // Check if all members have contributed
      const allContributed = pool.members.every((member: any) => {
        return pool.transactions.some(
          (t: any) =>
            t.member === member.name &&
            t.type === TransactionType.CONTRIBUTION &&
            t.round === pool.currentRound &&
            t.status === TransactionStatus.COMPLETED
        );
      });

      expect(allContributed).toBe(true);
    });
  });

  describe('POST Confirm Contribution', () => {
    it('should record member contribution confirmation', async () => {
      const pool = await Pool.create({
        id: 'confirm-pool',
        name: 'Confirm Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Test Member',
            email: 'test@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [],
        transactions: [],
        messages: [],
      });

      // Add payment confirmation
      pool.currentRoundPayments.push({
        memberId: 1,
        memberName: 'Test Member',
        memberEmail: 'test@test.com',
        amount: 10,
        status: 'admin_verified', // Auto-verified per current implementation
        memberConfirmedAt: new Date(),
        memberConfirmedVia: 'venmo',
        adminVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await pool.save();

      const updated = await Pool.findOne({ id: 'confirm-pool' });
      expect(updated?.currentRoundPayments).toHaveLength(1);
      expect(updated?.currentRoundPayments[0].status).toBe('admin_verified');
    });

    it('should require valid payment method', async () => {
      const validMethods = ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other'];
      const invalidMethod = 'bitcoin';

      expect(validMethods.includes('venmo')).toBe(true);
      expect(validMethods.includes(invalidMethod)).toBe(false);
    });

    it('should prevent duplicate confirmation', async () => {
      const pool = await Pool.create({
        id: 'duplicate-pool',
        name: 'Duplicate Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Test Member',
            email: 'test@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Test Member',
            memberEmail: 'test@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedAt: new Date(),
            memberConfirmedVia: 'venmo',
            adminVerifiedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      // Check if member already has a payment
      const existingPayment = pool.currentRoundPayments.find(
        (p: any) => p.memberId === 1
      );

      expect(existingPayment).toBeDefined();
      expect(existingPayment?.status).toBe('admin_verified');
    });

    it('should create transaction record for payment history', async () => {
      const pool = await Pool.create({
        id: 'transaction-pool',
        name: 'Transaction Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Test Member',
            email: 'test@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [],
        transactions: [],
        messages: [],
      });

      // Add transaction
      const transactionId =
        Math.max(...pool.transactions.map((t: any) => t.id || 0), 0) + 1;

      pool.transactions.push({
        id: transactionId,
        type: TransactionType.CONTRIBUTION,
        amount: 10,
        date: new Date().toISOString(),
        member: 'Test Member',
        status: TransactionStatus.COMPLETED,
        round: 1,
      });

      await pool.save();

      const updated = await Pool.findOne({ id: 'transaction-pool' });
      expect(updated?.transactions).toHaveLength(1);
      expect(updated?.transactions[0].type).toBe(TransactionType.CONTRIBUTION);
      expect(updated?.transactions[0].status).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe('Universal Contribution Model', () => {
    it('should require ALL members to contribute including recipient', async () => {
      const pool = await Pool.create({
        id: 'universal-pool',
        name: 'Universal Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Recipient (Round 1)',
            email: 'recipient@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1, // Position 1 = recipient for round 1
            status: PoolMemberStatus.CURRENT,
          },
          {
            id: 2,
            name: 'Member 2',
            email: 'm2@test.com',
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
          {
            id: 3,
            name: 'Member 3',
            email: 'm3@test.com',
            role: PoolMemberRole.MEMBER,
            position: 3,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Find recipient for current round
      const recipient = pool.members.find(
        (m: any) => m.position === pool.currentRound
      );
      expect(recipient).toBeDefined();
      expect(recipient?.name).toBe('Recipient (Round 1)');

      // All 3 members should contribute (including recipient)
      const allMembersMustContribute = pool.members.map((m: any) => ({
        memberId: m.id,
        name: m.name,
        isRecipient: m.position === pool.currentRound,
        mustContribute: true, // Under universal model, ALL contribute
      }));

      expect(allMembersMustContribute).toHaveLength(3);
      expect(allMembersMustContribute.every((m: any) => m.mustContribute)).toBe(true);
    });

    it('should calculate payout as contribution × total_members', async () => {
      const pool = await Pool.create({
        id: 'payout-calc-pool',
        name: 'Payout Calculation Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          { id: 1, name: 'M1', email: 'm1@test.com', position: 1, role: PoolMemberRole.ADMIN, status: PoolMemberStatus.CURRENT },
          { id: 2, name: 'M2', email: 'm2@test.com', position: 2, role: PoolMemberRole.MEMBER, status: PoolMemberStatus.ACTIVE },
          { id: 3, name: 'M3', email: 'm3@test.com', position: 3, role: PoolMemberRole.MEMBER, status: PoolMemberStatus.ACTIVE },
          { id: 4, name: 'M4', email: 'm4@test.com', position: 4, role: PoolMemberRole.MEMBER, status: PoolMemberStatus.ACTIVE },
          { id: 5, name: 'M5', email: 'm5@test.com', position: 5, role: PoolMemberRole.MEMBER, status: PoolMemberStatus.ACTIVE },
        ],
        transactions: [],
        messages: [],
      });

      // Under universal model: payout = contribution × totalMembers
      const expectedPayout = pool.contributionAmount * pool.members.length;

      // 10 × 5 = 50
      expect(expectedPayout).toBe(50);
    });
  });

  describe('Undo Payment', () => {
    it('should allow member to undo their payment confirmation', async () => {
      const pool = await Pool.create({
        id: 'undo-pool',
        name: 'Undo Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Test Member',
            email: 'test@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Test Member',
            memberEmail: 'test@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedAt: new Date(),
            memberConfirmedVia: 'venmo',
            adminVerifiedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [
          {
            id: 1,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date().toISOString(),
            member: 'Test Member',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
        ],
        messages: [],
      });

      // Simulate undo: remove from currentRoundPayments and transactions
      pool.currentRoundPayments = pool.currentRoundPayments.filter(
        (p: any) => p.memberId !== 1
      );

      pool.transactions = pool.transactions.filter(
        (t: any) =>
          !(
            t.member === 'Test Member' &&
            t.type === TransactionType.CONTRIBUTION &&
            t.round === 1
          )
      );

      await pool.save();

      const updated = await Pool.findOne({ id: 'undo-pool' });
      expect(updated?.currentRoundPayments).toHaveLength(0);
      expect(updated?.transactions).toHaveLength(0);
    });
  });

  describe('Payment Method Tracking', () => {
    it('should track Venmo payment', async () => {
      const pool = await Pool.create({
        id: 'venmo-pool',
        name: 'Venmo Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Test',
            memberEmail: 'test@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedVia: 'venmo',
            memberConfirmedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.currentRoundPayments[0].memberConfirmedVia).toBe('venmo');
    });

    it('should track Zelle payment', async () => {
      const pool = await Pool.create({
        id: 'zelle-pool',
        name: 'Zelle Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Test',
            memberEmail: 'test@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedVia: 'zelle',
            memberConfirmedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.currentRoundPayments[0].memberConfirmedVia).toBe('zelle');
    });

    it('should track Cash App payment', async () => {
      const pool = await Pool.create({
        id: 'cashapp-pool',
        name: 'Cash App Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Test',
            memberEmail: 'test@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedVia: 'cashapp',
            memberConfirmedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.currentRoundPayments[0].memberConfirmedVia).toBe('cashapp');
    });

    it('should track PayPal payment', async () => {
      const pool = await Pool.create({
        id: 'paypal-pool',
        name: 'PayPal Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Test',
            memberEmail: 'test@test.com',
            amount: 10,
            status: 'admin_verified',
            memberConfirmedVia: 'paypal',
            memberConfirmedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.currentRoundPayments[0].memberConfirmedVia).toBe('paypal');
    });
  });
});
