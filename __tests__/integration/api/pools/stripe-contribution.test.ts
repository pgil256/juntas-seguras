/**
 * Stripe contribution → webhook → escrow integration test.
 *
 * Uses mongodb-memory-server and exercises the DB-facing webhook core
 * (handleCheckoutSessionCompleted / handlePaymentIntentFailed) — the same logic
 * the HTTP route delegates to — verifying the full state transition:
 *   pending Payment → COMPLETED, pool round payment recorded, and the round
 *   advancing to escrow-held (ready_to_pay) once every member has contributed.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { getPaymentModel, generatePaymentId } from '@/lib/db/models/payment';
import { PoolMemberRole, PoolMemberStatus } from '@/types/pool';
import { TransactionStatus, TransactionType } from '@/types/payment';

// db/connect becomes a no-op; the real connection is the in-memory server below.
jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

import {
  handleCheckoutSessionCompleted,
  handlePaymentIntentFailed,
} from '@/lib/payments/webhook';

describe('Stripe contribution → webhook → escrow', () => {
  let mongoServer: MongoMemoryServer;
  const Pool = getPoolModel();
  const Payment = getPaymentModel();

  const ALICE = { id: 1, name: 'Alice Admin', email: 'alice@test.com' };
  const BOB = { id: 2, name: 'Bob Member', email: 'bob@test.com' };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
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

  async function seedPool() {
    return Pool.create({
      id: 'stripe-pool',
      name: 'Stripe Pool',
      contributionAmount: 10,
      frequency: 'weekly',
      currentRound: 1,
      totalRounds: 2,
      currentRoundPayoutStatus: 'pending_collection',
      members: [
        {
          id: ALICE.id,
          name: ALICE.name,
          email: ALICE.email,
          role: PoolMemberRole.ADMIN,
          position: 1,
          status: PoolMemberStatus.CURRENT,
        },
        {
          id: BOB.id,
          name: BOB.name,
          email: BOB.email,
          role: PoolMemberRole.MEMBER,
          position: 2,
          status: PoolMemberStatus.ACTIVE,
        },
      ],
      currentRoundPayments: [],
      transactions: [],
      messages: [],
    });
  }

  async function seedPendingPayment(member: { id: number; name: string }) {
    const paymentId = generatePaymentId();
    await Payment.create({
      paymentId,
      userId: new mongoose.Types.ObjectId(),
      poolId: 'stripe-pool',
      amount: 10,
      currency: 'USD',
      type: TransactionType.CONTRIBUTION,
      status: TransactionStatus.PENDING,
      member: member.name,
      round: 1,
      stripeSessionId: `cs_test_${member.id}`,
      failureCount: 0,
    });
    return paymentId;
  }

  function sessionFor(member: { id: number }, paymentRef: string) {
    return {
      id: `cs_test_${member.id}`,
      object: 'checkout.session',
      payment_intent: `pi_test_${member.id}`,
      livemode: false,
      metadata: {
        poolId: 'stripe-pool',
        memberId: String(member.id),
        round: '1',
        paymentRef,
      },
    } as any;
  }

  it('confirms a contribution: Payment COMPLETED + pool round payment recorded', async () => {
    await seedPool();
    const paymentId = await seedPendingPayment(BOB);

    const result = await handleCheckoutSessionCompleted(sessionFor(BOB, paymentId));
    expect(result.outcome).toBe('contribution_confirmed');

    const payment = await Payment.findOne({ paymentId });
    expect(payment?.status).toBe(TransactionStatus.COMPLETED);
    expect(payment?.stripePaymentIntentId).toBe('pi_test_2');

    const pool = await Pool.findOne({ id: 'stripe-pool' });
    const roundPayment = pool?.currentRoundPayments.find((p: any) => p.memberId === BOB.id);
    expect(roundPayment?.status).toBe('admin_verified');
    expect(roundPayment?.memberConfirmedVia).toBe('stripe');

    const txn = pool?.transactions.find((t: any) => t.stripePaymentIntentId === 'pi_test_2');
    expect(txn).toBeDefined();
    expect(txn.type).toBe(TransactionType.CONTRIBUTION);
    expect(txn.round).toBe(1);
  });

  it('is idempotent when the same event is delivered more than once', async () => {
    await seedPool();
    const paymentId = await seedPendingPayment(BOB);

    await handleCheckoutSessionCompleted(sessionFor(BOB, paymentId));
    const second = await handleCheckoutSessionCompleted(sessionFor(BOB, paymentId));

    expect(second.outcome).toBe('contribution_already_confirmed');

    const pool = await Pool.findOne({ id: 'stripe-pool' });
    const txns = pool?.transactions.filter((t: any) => t.stripePaymentIntentId === 'pi_test_2');
    expect(txns).toHaveLength(1);
  });

  it('holds funds in escrow (ready_to_pay) once ALL members have contributed', async () => {
    await seedPool();

    // First member contributes → not everyone yet.
    const bobPayment = await seedPendingPayment(BOB);
    const r1 = await handleCheckoutSessionCompleted(sessionFor(BOB, bobPayment));
    expect(r1.escrowReady).toBe(false);
    let pool = await Pool.findOne({ id: 'stripe-pool' });
    expect(pool?.currentRoundPayoutStatus).toBe('pending_collection');

    // Second (final) member contributes → escrow held, ready to pay out.
    const alicePayment = await seedPendingPayment(ALICE);
    const r2 = await handleCheckoutSessionCompleted(sessionFor(ALICE, alicePayment));
    expect(r2.escrowReady).toBe(true);
    pool = await Pool.findOne({ id: 'stripe-pool' });
    expect(pool?.currentRoundPayoutStatus).toBe('ready_to_pay');
  });

  it('marks the Payment FAILED on payment_intent.payment_failed', async () => {
    await seedPool();
    const paymentId = await seedPendingPayment(BOB);

    const intent = {
      id: 'pi_test_2',
      object: 'payment_intent',
      livemode: false,
      last_payment_error: { message: 'Your card was declined.' },
      metadata: {
        poolId: 'stripe-pool',
        memberId: String(BOB.id),
        round: '1',
        paymentRef: paymentId,
      },
    } as any;

    const result = await handlePaymentIntentFailed(intent);
    expect(result.outcome).toBe('contribution_failed');

    const payment = await Payment.findOne({ paymentId });
    expect(payment?.status).toBe(TransactionStatus.FAILED);
    expect(payment?.failureReason).toMatch(/declined/i);
  });
});
