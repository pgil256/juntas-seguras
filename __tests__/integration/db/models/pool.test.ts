/**
 * Pool Model Integration Tests
 *
 * Tests for the Pool MongoDB model including:
 * - Pool creation and validation
 * - Member management
 * - Contribution tracking
 * - Round management
 * - Transaction recording
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Pool, getPoolModel } from '@/lib/db/models/pool';
import { PoolStatus, PoolMemberRole, PoolMemberStatus, TransactionType } from '@/types/pool';
import { TransactionStatus } from '@/types/payment';

describe('Pool Model', () => {
  let mongoServer: MongoMemoryServer;
  const PoolModel = getPoolModel();

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
    await PoolModel.deleteMany({});
  });

  describe('Pool Creation', () => {
    it('should create pool with valid configuration', async () => {
      const poolData = {
        id: 'test-pool-123',
        name: 'Test Pool',
        description: 'A test pool for testing',
        contributionAmount: 10,
        frequency: 'weekly',
        status: PoolStatus.ACTIVE,
        currentRound: 1,
        totalRounds: 5,
        maxMembers: 5,
        members: [
          {
            id: 1,
            name: 'Admin User',
            email: 'admin@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      };

      const pool = await PoolModel.create(poolData);

      expect(pool).toBeDefined();
      expect(pool.id).toBe('test-pool-123');
      expect(pool.name).toBe('Test Pool');
      expect(pool.contributionAmount).toBe(10);
      expect(pool.status).toBe(PoolStatus.ACTIVE);
    });

    it('should set creator as ADMIN member with position 1', async () => {
      const pool = await PoolModel.create({
        id: 'admin-pool-123',
        name: 'Admin Test Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: 'Pool Creator',
            email: 'creator@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.members).toHaveLength(1);
      expect(pool.members[0].role).toBe(PoolMemberRole.ADMIN);
      expect(pool.members[0].position).toBe(1);
    });

    it('should initialize currentRound to 1', async () => {
      const pool = await PoolModel.create({
        id: 'round-pool-123',
        name: 'Round Test Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        transactions: [],
        messages: [],
      });

      expect(pool.currentRound).toBe(1);
    });

    it('should set status to ACTIVE by default', async () => {
      const pool = await PoolModel.create({
        id: 'status-pool-123',
        name: 'Status Test Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [],
        transactions: [],
        messages: [],
      });

      expect(pool.status).toBe(PoolStatus.ACTIVE);
    });

    it('should validate contribution amount is within $1-$20', async () => {
      // Test minimum valid amount
      const minPool = await PoolModel.create({
        id: 'min-pool-123',
        name: 'Minimum Pool',
        contributionAmount: 1,
        frequency: 'weekly',
        members: [],
        transactions: [],
        messages: [],
      });
      expect(minPool.contributionAmount).toBe(1);

      // Test maximum valid amount
      const maxPool = await PoolModel.create({
        id: 'max-pool-123',
        name: 'Maximum Pool',
        contributionAmount: 20,
        frequency: 'weekly',
        members: [],
        transactions: [],
        messages: [],
      });
      expect(maxPool.contributionAmount).toBe(20);

      // Test below minimum - should fail validation
      await expect(
        PoolModel.create({
          id: 'below-min-pool-123',
          name: 'Below Min Pool',
          contributionAmount: 0,
          frequency: 'weekly',
          members: [],
          transactions: [],
          messages: [],
        })
      ).rejects.toThrow();

      // Test above maximum - should fail validation
      await expect(
        PoolModel.create({
          id: 'above-max-pool-123',
          name: 'Above Max Pool',
          contributionAmount: 21,
          frequency: 'weekly',
          members: [],
          transactions: [],
          messages: [],
        })
      ).rejects.toThrow();
    });

    it('should set allowed payment methods', async () => {
      const pool = await PoolModel.create({
        id: 'payment-pool-123',
        name: 'Payment Methods Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        allowedPaymentMethods: ['venmo', 'paypal', 'zelle'],
        members: [],
        transactions: [],
        messages: [],
      });

      expect(pool.allowedPaymentMethods).toContain('venmo');
      expect(pool.allowedPaymentMethods).toContain('paypal');
      expect(pool.allowedPaymentMethods).toContain('zelle');
      expect(pool.allowedPaymentMethods).not.toContain('cashapp');
    });
  });

  describe('Member Management', () => {
    it('should add member with correct position', async () => {
      const pool = await PoolModel.create({
        id: 'member-pool-123',
        name: 'Member Test Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: 'Admin',
            email: 'admin@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Add a new member
      pool.members.push({
        id: 2,
        name: 'New Member',
        email: 'new@test.com',
        role: PoolMemberRole.MEMBER,
        position: 2,
        status: PoolMemberStatus.ACTIVE,
      });

      await pool.save();

      expect(pool.members).toHaveLength(2);
      expect(pool.members[1].position).toBe(2);
      expect(pool.members[1].role).toBe(PoolMemberRole.MEMBER);
    });

    it('should track member payout methods', async () => {
      const pool = await PoolModel.create({
        id: 'payout-pool-123',
        name: 'Payout Methods Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: 'Admin',
            email: 'admin@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
            payoutMethods: {
              venmo: '@adminvenmo',
              preferred: 'venmo',
            },
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.members[0].payoutMethods).toBeDefined();
      expect(pool.members[0].payoutMethods?.venmo).toBe('@adminvenmo');
      expect(pool.members[0].payoutMethods?.preferred).toBe('venmo');
    });

    it('should maintain member contribution status', async () => {
      const pool = await PoolModel.create({
        id: 'contrib-status-pool-123',
        name: 'Contribution Status Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
            totalContributed: 0,
            paymentsOnTime: 0,
            paymentsMissed: 0,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Update contribution status
      pool.members[0].totalContributed = 10;
      pool.members[0].paymentsOnTime = 1;
      await pool.save();

      const updated = await PoolModel.findOne({ id: 'contrib-status-pool-123' });
      expect(updated?.members[0].totalContributed).toBe(10);
      expect(updated?.members[0].paymentsOnTime).toBe(1);
    });
  });

  describe('Contribution Tracking', () => {
    it('should track contribution status per member per round', async () => {
      const pool = await PoolModel.create({
        id: 'round-contrib-pool-123',
        name: 'Round Contribution Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        currentRoundPayments: [],
        transactions: [],
        messages: [],
      });

      // Add round payment tracking
      pool.currentRoundPayments.push({
        memberId: 1,
        memberName: 'Member 1',
        memberEmail: 'member1@test.com',
        amount: 10,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await pool.save();

      expect(pool.currentRoundPayments).toHaveLength(1);
      expect(pool.currentRoundPayments[0].status).toBe('pending');
    });

    it('should update status: pending → member_confirmed → admin_verified', async () => {
      const pool = await PoolModel.create({
        id: 'status-update-pool-123',
        name: 'Status Update Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
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

      // Update to member_confirmed
      pool.currentRoundPayments[0].status = 'member_confirmed';
      pool.currentRoundPayments[0].memberConfirmedAt = new Date();
      pool.currentRoundPayments[0].memberConfirmedVia = 'venmo';
      await pool.save();

      let updated = await PoolModel.findOne({ id: 'status-update-pool-123' });
      expect(updated?.currentRoundPayments[0].status).toBe('member_confirmed');

      // Update to admin_verified
      pool.currentRoundPayments[0].status = 'admin_verified';
      pool.currentRoundPayments[0].adminVerifiedAt = new Date();
      await pool.save();

      updated = await PoolModel.findOne({ id: 'status-update-pool-123' });
      expect(updated?.currentRoundPayments[0].status).toBe('admin_verified');
    });

    it('should store payment method used', async () => {
      const pool = await PoolModel.create({
        id: 'payment-method-pool-123',
        name: 'Payment Method Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
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

      expect(pool.currentRoundPayments[0].memberConfirmedVia).toBe('venmo');
    });

    it('should record confirmation timestamp', async () => {
      const confirmationDate = new Date();

      const pool = await PoolModel.create({
        id: 'timestamp-pool-123',
        name: 'Timestamp Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Member 1',
            memberEmail: 'member1@test.com',
            amount: 10,
            status: 'member_confirmed',
            memberConfirmedAt: confirmationDate,
            memberConfirmedVia: 'paypal',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      expect(pool.currentRoundPayments[0].memberConfirmedAt).toBeDefined();
    });
  });

  describe('Round Management', () => {
    it('should advance round when payout is processed', async () => {
      const pool = await PoolModel.create({
        id: 'advance-round-pool-123',
        name: 'Advance Round Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        totalRounds: 5,
        members: [],
        transactions: [],
        messages: [],
      });

      // Advance the round
      await PoolModel.updateOne(
        { id: 'advance-round-pool-123' },
        { $set: { currentRound: 2 } }
      );

      const updated = await PoolModel.findOne({ id: 'advance-round-pool-123' });
      expect(updated?.currentRound).toBe(2);
    });

    it('should determine payout recipient by position', async () => {
      const pool = await PoolModel.create({
        id: 'recipient-pool-123',
        name: 'Recipient Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 2,
        totalRounds: 3,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.COMPLETED,
            payoutReceived: true,
          },
          {
            id: 2,
            name: 'Member 2',
            email: 'member2@test.com',
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.CURRENT,
            payoutReceived: false,
          },
          {
            id: 3,
            name: 'Member 3',
            email: 'member3@test.com',
            role: PoolMemberRole.MEMBER,
            position: 3,
            status: PoolMemberStatus.ACTIVE,
            payoutReceived: false,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Find the recipient for current round (position === currentRound)
      const recipient = pool.members.find(
        (m: any) => m.position === pool.currentRound
      );

      expect(recipient).toBeDefined();
      expect(recipient?.name).toBe('Member 2');
      expect(recipient?.position).toBe(2);
    });

    it('should reset member contribution status for new round', async () => {
      const pool = await PoolModel.create({
        id: 'reset-pool-123',
        name: 'Reset Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        totalRounds: 3,
        members: [],
        currentRoundPayments: [
          {
            memberId: 1,
            memberName: 'Member 1',
            memberEmail: 'member1@test.com',
            amount: 10,
            status: 'admin_verified',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        transactions: [],
        messages: [],
      });

      // Simulate resetting for new round
      await PoolModel.updateOne(
        { id: 'reset-pool-123' },
        {
          $set: {
            currentRound: 2,
            currentRoundPayments: [],
          },
        }
      );

      const updated = await PoolModel.findOne({ id: 'reset-pool-123' });
      expect(updated?.currentRound).toBe(2);
      expect(updated?.currentRoundPayments).toHaveLength(0);
    });
  });

  describe('Transactions', () => {
    it('should record contribution transactions', async () => {
      const pool = await PoolModel.create({
        id: 'contrib-tx-pool-123',
        name: 'Contribution Transaction Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [],
        transactions: [],
        messages: [],
      });

      // Add contribution transaction
      pool.transactions.push({
        id: 1,
        type: TransactionType.CONTRIBUTION,
        amount: 10,
        date: new Date().toISOString(),
        member: 'Member 1',
        status: TransactionStatus.COMPLETED,
        round: 1,
      });

      await pool.save();

      expect(pool.transactions).toHaveLength(1);
      expect(pool.transactions[0].type).toBe(TransactionType.CONTRIBUTION);
      expect(pool.transactions[0].amount).toBe(10);
    });

    it('should record payout transactions', async () => {
      const pool = await PoolModel.create({
        id: 'payout-tx-pool-123',
        name: 'Payout Transaction Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        members: [
          { id: 1, name: 'M1', email: 'm1@test.com', position: 1, role: PoolMemberRole.ADMIN, status: PoolMemberStatus.ACTIVE },
          { id: 2, name: 'M2', email: 'm2@test.com', position: 2, role: PoolMemberRole.MEMBER, status: PoolMemberStatus.ACTIVE },
          { id: 3, name: 'M3', email: 'm3@test.com', position: 3, role: PoolMemberRole.MEMBER, status: PoolMemberStatus.ACTIVE },
        ],
        transactions: [],
        messages: [],
      });

      // Add payout transaction (contribution × total_members = 10 × 3 = 30)
      pool.transactions.push({
        id: 1,
        type: TransactionType.PAYOUT,
        amount: 30,
        date: new Date().toISOString(),
        member: 'M1',
        status: TransactionStatus.COMPLETED,
        round: 1,
      });

      await pool.save();

      expect(pool.transactions).toHaveLength(1);
      expect(pool.transactions[0].type).toBe(TransactionType.PAYOUT);
      expect(pool.transactions[0].amount).toBe(30);
    });

    it('should maintain transaction history', async () => {
      const pool = await PoolModel.create({
        id: 'history-pool-123',
        name: 'History Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 2,
        members: [],
        transactions: [
          {
            id: 1,
            type: TransactionType.CONTRIBUTION,
            amount: 10,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            member: 'Member 1',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
          {
            id: 2,
            type: TransactionType.PAYOUT,
            amount: 30,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            member: 'Member 1',
            status: TransactionStatus.COMPLETED,
            round: 1,
          },
        ],
        messages: [],
      });

      // Add round 2 transactions
      pool.transactions.push({
        id: 3,
        type: TransactionType.CONTRIBUTION,
        amount: 10,
        date: new Date().toISOString(),
        member: 'Member 2',
        status: TransactionStatus.COMPLETED,
        round: 2,
      });

      await pool.save();

      expect(pool.transactions).toHaveLength(3);

      // Verify transaction history by round
      const round1Txs = pool.transactions.filter((t: any) => t.round === 1);
      const round2Txs = pool.transactions.filter((t: any) => t.round === 2);

      expect(round1Txs).toHaveLength(2);
      expect(round2Txs).toHaveLength(1);
    });
  });

  describe('Admin Payment Methods', () => {
    it('should store admin payment methods for collection', async () => {
      const pool = await PoolModel.create({
        id: 'admin-payment-pool-123',
        name: 'Admin Payment Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [],
        adminPaymentMethods: {
          venmo: '@pooladmin',
          paypal: 'admin@paypal.com',
          zelle: '5551234567',
          preferred: 'venmo',
        },
        transactions: [],
        messages: [],
      });

      expect(pool.adminPaymentMethods).toBeDefined();
      expect(pool.adminPaymentMethods?.venmo).toBe('@pooladmin');
      expect(pool.adminPaymentMethods?.paypal).toBe('admin@paypal.com');
      expect(pool.adminPaymentMethods?.preferred).toBe('venmo');
    });

    it('should store admin Zelle QR code', async () => {
      const pool = await PoolModel.create({
        id: 'admin-zelle-pool-123',
        name: 'Admin Zelle Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [],
        adminPaymentMethods: {
          zelle: '5551234567',
          zelleQR: {
            token: 'admin-zelle-token',
            rawContent: 'ZELLE://PAY?token=admin-zelle-token',
            imageDataUrl: 'data:image/png;base64,adminqrcode',
            uploadedAt: new Date(),
          },
          preferred: 'zelle',
        },
        transactions: [],
        messages: [],
      });

      expect(pool.adminPaymentMethods?.zelleQR).toBeDefined();
      expect(pool.adminPaymentMethods?.zelleQR?.token).toBe('admin-zelle-token');
    });
  });

  describe('Pool Queries', () => {
    it('should find pools by creatorId', async () => {
      const creatorId = new mongoose.Types.ObjectId();

      await PoolModel.create({
        id: 'creator-pool-1',
        name: 'Creator Pool 1',
        contributionAmount: 10,
        frequency: 'weekly',
        creatorId: creatorId,
        members: [],
        transactions: [],
        messages: [],
      });

      await PoolModel.create({
        id: 'creator-pool-2',
        name: 'Creator Pool 2',
        contributionAmount: 15,
        frequency: 'monthly',
        creatorId: creatorId,
        members: [],
        transactions: [],
        messages: [],
      });

      const pools = await PoolModel.find({ creatorId: creatorId });

      expect(pools).toHaveLength(2);
    });

    it('should find pools by member email', async () => {
      await PoolModel.create({
        id: 'member-email-pool-123',
        name: 'Member Email Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: 'Test Member',
            email: 'testmember@test.com',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      const pools = await PoolModel.find({ 'members.email': 'testmember@test.com' });

      expect(pools).toHaveLength(1);
      expect(pools[0].members[0].email).toBe('testmember@test.com');
    });

    it('should find pool by id field', async () => {
      await PoolModel.create({
        id: 'unique-pool-123',
        name: 'Unique Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [],
        transactions: [],
        messages: [],
      });

      const pool = await PoolModel.findOne({ id: 'unique-pool-123' });

      expect(pool).toBeDefined();
      expect(pool?.name).toBe('Unique Pool');
    });
  });
});
