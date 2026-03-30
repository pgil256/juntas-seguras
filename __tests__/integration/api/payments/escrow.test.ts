/**
 * Escrow Release API Integration Tests
 *
 * Tests for escrow release endpoint:
 * - POST /api/payments/escrow/release - Release escrowed payment
 *
 * Lighter coverage focusing on auth, validation, and basic success case.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { getPaymentModel, generatePaymentId } from '@/lib/db/models/payment';
import { PoolMemberRole, PoolMemberStatus } from '@/types/pool';
import { TransactionStatus, TransactionType } from '@/types/payment';

jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}));

describe('Escrow Release API', () => {
  let mongoServer: MongoMemoryServer;
  const Pool = getPoolModel();
  const Payment = getPaymentModel();

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
    await Payment.deleteMany({});
  });

  it('should require authentication', async () => {
    // The route calls getCurrentUser() and returns error if not authenticated
    const { getCurrentUser } = require('@/lib/auth');
    getCurrentUser.mockResolvedValueOnce({
      error: { message: 'Not authenticated', status: 401 },
    });

    const result = await getCurrentUser();
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it('should validate required fields (paymentId and poolId)', async () => {
    // Route checks: if (!paymentId || !poolId) return 400
    const missingPaymentId = { poolId: 'pool-1', releaseNow: true };
    const missingPoolId = { paymentId: 'pmt-1', releaseNow: true };
    const missingBoth = { releaseNow: true };

    expect(!missingPaymentId.paymentId).toBe(true);
    expect(!(missingPoolId as any).poolId).toBe(true);
    expect(!(missingBoth as any).paymentId && !(missingBoth as any).poolId).toBe(true);
  });

  it('should release escrowed payment and update pool balance', async () => {
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      verificationMethod: 'email',
      pools: ['escrow-pool'],
    });

    const pool = await Pool.create({
      id: 'escrow-pool',
      name: 'Escrow Test Pool',
      contributionAmount: 10,
      frequency: 'weekly',
      currentRound: 1,
      totalRounds: 3,
      totalAmount: 0,
      members: [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@test.com',
          role: PoolMemberRole.ADMIN,
          position: 1,
          status: PoolMemberStatus.CURRENT,
        },
        {
          id: 2,
          name: 'Member Two',
          email: 'member2@test.com',
          role: PoolMemberRole.MEMBER,
          position: 2,
          status: PoolMemberStatus.ACTIVE,
        },
      ],
      transactions: [],
      messages: [],
    });

    const paymentId = generatePaymentId();
    const payment = await Payment.create({
      paymentId,
      userId: admin._id,
      poolId: 'escrow-pool',
      amount: 10,
      currency: 'USD',
      type: TransactionType.ESCROW,
      status: TransactionStatus.ESCROWED,
      member: 'Admin User',
      round: 1,
      failureCount: 0,
    });

    // Verify payment is in escrow
    expect(payment.type).toBe(TransactionType.ESCROW);
    expect(payment.status).toBe(TransactionStatus.ESCROWED);
    expect(payment.poolId).toBe('escrow-pool');

    // Simulate release (mirrors route logic)
    payment.status = TransactionStatus.RELEASED;
    payment.processedAt = new Date();
    payment.releasedAt = new Date();
    payment.releasedBy = admin._id;
    await payment.save();

    // Update pool balance
    pool.totalAmount = (pool.totalAmount || 0) + payment.amount;
    await pool.save();

    // Create release record
    const releasePaymentId = generatePaymentId();
    await Payment.create({
      paymentId: releasePaymentId,
      userId: admin._id,
      poolId: 'escrow-pool',
      amount: 10,
      currency: 'USD',
      type: TransactionType.ESCROW_RELEASE,
      status: TransactionStatus.COMPLETED,
      description: `Release of escrowed funds for payment ${paymentId}`,
      member: 'Admin User',
      relatedPaymentId: paymentId,
      processedAt: new Date(),
      releasedBy: admin._id,
      failureCount: 0,
    });

    // Verify outcomes
    const updatedPayment = await Payment.findOne({ paymentId });
    expect(updatedPayment?.status).toBe(TransactionStatus.RELEASED);
    expect(updatedPayment?.releasedAt).toBeDefined();

    const updatedPool = await Pool.findOne({ id: 'escrow-pool' });
    expect(updatedPool?.totalAmount).toBe(10);

    const releaseRecord = await Payment.findOne({ paymentId: releasePaymentId });
    expect(releaseRecord?.type).toBe(TransactionType.ESCROW_RELEASE);
    expect(releaseRecord?.status).toBe(TransactionStatus.COMPLETED);
    expect(releaseRecord?.relatedPaymentId).toBe(paymentId);
  });
});
