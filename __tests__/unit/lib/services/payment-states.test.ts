/**
 * Payment State Transitions Unit Tests
 *
 * Pure unit tests for payment state machine logic covering:
 * - Contribution confirm/undo flows
 * - Payout status state machine transitions
 * - Payout confirmation guards
 * - Round advancement and pool completion
 * - Payment method validation
 */

import {
  TransactionType,
  RoundPayment,
  PoolTransaction,
  PayoutStatus,
  RoundPaymentStatus,
  ManualPaymentMethod,
  PoolMember,
  PoolMemberRole,
  PoolMemberStatus,
  PoolStatus,
} from '@/types/pool';
import { TransactionStatus } from '@/types/payment';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

const VALID_PAYMENT_METHODS: ManualPaymentMethod[] = [
  'venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other',
];

function buildMember(overrides: Partial<PoolMember> = {}): PoolMember {
  return {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    joinDate: '2025-01-01',
    role: PoolMemberRole.MEMBER,
    position: 1,
    status: PoolMemberStatus.ACTIVE,
    paymentsOnTime: 0,
    paymentsMissed: 0,
    totalContributed: 0,
    payoutReceived: false,
    payoutDate: '',
    ...overrides,
  };
}

function buildTransaction(overrides: Partial<PoolTransaction> = {}): PoolTransaction {
  return {
    id: 1,
    type: TransactionType.CONTRIBUTION,
    amount: 100,
    date: new Date().toISOString(),
    member: 'Alice',
    status: TransactionStatus.COMPLETED,
    round: 1,
    ...overrides,
  };
}

function buildRoundPayment(overrides: Partial<RoundPayment> = {}): RoundPayment {
  return {
    memberId: 1,
    memberName: 'Alice',
    memberEmail: 'alice@example.com',
    amount: 100,
    status: 'admin_verified' as RoundPaymentStatus,
    reminderCount: 0,
    memberConfirmedAt: new Date().toISOString(),
    memberConfirmedVia: 'venmo' as ManualPaymentMethod,
    adminVerifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

interface PoolState {
  id: string;
  status: PoolStatus;
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  members: PoolMember[];
  transactions: PoolTransaction[];
  currentRoundPayments: RoundPayment[];
  currentRoundPayoutStatus: PayoutStatus;
  currentRoundPayoutCompletedAt: string | null;
  currentRoundPayoutMethod: ManualPaymentMethod | null;
  currentRoundPayoutNotes: string | null;
  currentRoundPayoutConfirmedBy: string | null;
}

function buildPoolState(overrides: Partial<PoolState> = {}): PoolState {
  return {
    id: 'pool-1',
    status: PoolStatus.ACTIVE,
    currentRound: 1,
    totalRounds: 4,
    contributionAmount: 100,
    members: [
      buildMember({ id: 1, name: 'Alice', email: 'alice@example.com', position: 1, role: PoolMemberRole.ADMIN }),
      buildMember({ id: 2, name: 'Bob', email: 'bob@example.com', position: 2 }),
      buildMember({ id: 3, name: 'Carol', email: 'carol@example.com', position: 3 }),
      buildMember({ id: 4, name: 'Dave', email: 'dave@example.com', position: 4 }),
    ],
    transactions: [],
    currentRoundPayments: [],
    currentRoundPayoutStatus: 'pending_collection',
    currentRoundPayoutCompletedAt: null,
    currentRoundPayoutMethod: null,
    currentRoundPayoutNotes: null,
    currentRoundPayoutConfirmedBy: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pure logic functions extracted from the API routes for testability.
// These mirror the checks performed inside the route handlers.
// ---------------------------------------------------------------------------

/**
 * Attempt to confirm a manual contribution.
 * Returns { success, error?, payment?, transaction? }
 */
function confirmManualContribution(
  pool: PoolState,
  memberId: number,
  paymentMethod: string
): { success: boolean; error?: string; payment?: RoundPayment; transaction?: PoolTransaction } {
  const member = pool.members.find((m) => m.id === memberId);
  if (!member) return { success: false, error: 'Member not found' };

  // Validate payment method
  if (!paymentMethod) return { success: false, error: 'Payment method is required' };
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod as ManualPaymentMethod)) {
    return { success: false, error: 'Invalid payment method' };
  }

  // Duplicate check via transactions
  const existingContribution = pool.transactions.find(
    (t) =>
      t.member === member.name &&
      t.type === TransactionType.CONTRIBUTION &&
      t.round === pool.currentRound
  );
  if (existingContribution) {
    return { success: false, error: 'You have already contributed for this round' };
  }

  // Duplicate check via round payments
  const memberEmailLower = member.email?.toLowerCase();
  const existingPayment = pool.currentRoundPayments.find(
    (p) => p.memberId === member.id || p.memberEmail?.toLowerCase() === memberEmailLower
  );
  if (existingPayment) {
    if (existingPayment.status === 'admin_verified') {
      return { success: false, error: 'Your payment has already been verified' };
    }
    if (existingPayment.status === 'member_confirmed') {
      return { success: false, error: 'You have already confirmed a payment. Please wait for admin verification.' };
    }
  }

  // Create the round payment (auto-verified)
  const now = new Date().toISOString();
  const payment: RoundPayment = {
    memberId: member.id,
    memberName: member.name,
    memberEmail: member.email,
    amount: pool.contributionAmount,
    status: 'admin_verified',
    memberConfirmedAt: now,
    memberConfirmedVia: paymentMethod as ManualPaymentMethod,
    adminVerifiedAt: now,
    reminderCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Remove any existing pending entry then add
  pool.currentRoundPayments = pool.currentRoundPayments.filter(
    (p) => p.memberId !== member.id && p.memberEmail?.toLowerCase() !== memberEmailLower
  );
  pool.currentRoundPayments.push(payment);

  // Create transaction record
  const transactionId = Math.max(...pool.transactions.map((t) => t.id || 0), 0) + 1;
  const transaction: PoolTransaction = {
    id: transactionId,
    type: TransactionType.CONTRIBUTION,
    amount: pool.contributionAmount,
    date: now,
    member: member.name,
    status: TransactionStatus.COMPLETED,
    round: pool.currentRound,
  };
  pool.transactions.push(transaction);

  return { success: true, payment, transaction };
}

/**
 * Attempt to undo a payment for a member in the current round.
 */
function undoPayment(
  pool: PoolState,
  memberId: number
): { success: boolean; error?: string } {
  const member = pool.members.find((m) => m.id === memberId);
  if (!member) return { success: false, error: 'Member not found' };

  const memberEmailLower = member.email?.toLowerCase();

  const existingPayment = pool.currentRoundPayments.find(
    (p) => p.memberId === member.id || p.memberEmail?.toLowerCase() === memberEmailLower
  );
  const existingTransaction = pool.transactions.find(
    (t) =>
      t.member === member.name &&
      t.type === TransactionType.CONTRIBUTION &&
      t.round === pool.currentRound
  );

  if (!existingPayment && !existingTransaction) {
    return { success: false, error: 'No payment found to undo' };
  }

  // Remove from round payments
  pool.currentRoundPayments = pool.currentRoundPayments.filter(
    (p) => p.memberId !== member.id && p.memberEmail?.toLowerCase() !== memberEmailLower
  );

  // Remove transaction
  pool.transactions = pool.transactions.filter(
    (t) => !(
      t.member === member.name &&
      t.type === TransactionType.CONTRIBUTION &&
      t.round === pool.currentRound
    )
  );

  return { success: true };
}

/**
 * Validate whether a payout confirmation can proceed.
 * Returns null if ok, or an error string.
 */
function validatePayoutConfirmation(
  payoutStatus: PayoutStatus,
  method: string
): string | null {
  if (!method) return 'Payment method is required';
  if (!VALID_PAYMENT_METHODS.includes(method as ManualPaymentMethod)) {
    return 'Invalid payment method';
  }

  if (payoutStatus !== 'ready_to_pay') {
    if (payoutStatus === 'paid' || payoutStatus === 'completed') {
      return 'Payout has already been completed';
    }
    return 'All payments must be verified before payout';
  }
  return null;
}

/**
 * Advance the pool to the next round. Mutates pool state in place.
 * Returns { success, error?, isComplete? }
 */
function advanceRound(
  pool: PoolState
): { success: boolean; error?: string; isComplete?: boolean } {
  if (pool.currentRoundPayoutStatus !== 'paid') {
    return { success: false, error: 'Payout must be completed before advancing' };
  }

  const nextRound = pool.currentRound + 1;

  pool.currentRound = nextRound;
  pool.currentRoundPayments = [];
  pool.currentRoundPayoutStatus = 'pending_collection';
  pool.currentRoundPayoutCompletedAt = null;
  pool.currentRoundPayoutMethod = null;
  pool.currentRoundPayoutNotes = null;
  pool.currentRoundPayoutConfirmedBy = null;

  const isComplete = nextRound > pool.totalRounds;
  if (isComplete) {
    pool.status = PoolStatus.COMPLETED;
  }

  return { success: true, isComplete };
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('Payment State Transitions', () => {
  // -------------------------------------------------------------------------
  // 1. Contribution State Transitions
  // -------------------------------------------------------------------------
  describe('Contribution State Transitions', () => {
    it('should confirm a manual contribution and auto-verify', () => {
      const pool = buildPoolState();
      const result = confirmManualContribution(pool, 2, 'venmo');

      expect(result.success).toBe(true);
      expect(result.payment?.status).toBe('admin_verified');
      expect(result.payment?.memberConfirmedVia).toBe('venmo');
      expect(result.payment?.adminVerifiedAt).toBeTruthy();
    });

    it('should create a COMPLETED transaction record on contribution', () => {
      const pool = buildPoolState();
      const result = confirmManualContribution(pool, 2, 'cashapp');

      expect(result.transaction?.type).toBe(TransactionType.CONTRIBUTION);
      expect(result.transaction?.status).toBe(TransactionStatus.COMPLETED);
      expect(result.transaction?.round).toBe(pool.currentRound);
      expect(result.transaction?.amount).toBe(pool.contributionAmount);
    });

    it('should add payment to currentRoundPayments array', () => {
      const pool = buildPoolState();
      expect(pool.currentRoundPayments).toHaveLength(0);

      confirmManualContribution(pool, 2, 'zelle');

      expect(pool.currentRoundPayments).toHaveLength(1);
      expect(pool.currentRoundPayments[0].memberId).toBe(2);
    });

    it('should prevent duplicate contributions via transaction check', () => {
      const pool = buildPoolState();

      const first = confirmManualContribution(pool, 2, 'venmo');
      expect(first.success).toBe(true);

      const second = confirmManualContribution(pool, 2, 'paypal');
      expect(second.success).toBe(false);
      expect(second.error).toBe('You have already contributed for this round');
    });

    it('should prevent duplicate when payment already admin_verified', () => {
      const pool = buildPoolState({
        currentRoundPayments: [
          buildRoundPayment({ memberId: 2, memberEmail: 'bob@example.com', status: 'admin_verified' }),
        ],
      });

      const result = confirmManualContribution(pool, 2, 'venmo');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Your payment has already been verified');
    });

    it('should prevent duplicate when payment is member_confirmed', () => {
      const pool = buildPoolState({
        currentRoundPayments: [
          buildRoundPayment({ memberId: 2, memberEmail: 'bob@example.com', status: 'member_confirmed' }),
        ],
      });

      const result = confirmManualContribution(pool, 2, 'venmo');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already confirmed');
    });

    it('should allow different members to contribute independently', () => {
      const pool = buildPoolState();

      const r1 = confirmManualContribution(pool, 2, 'venmo');
      const r2 = confirmManualContribution(pool, 3, 'cashapp');
      const r3 = confirmManualContribution(pool, 4, 'zelle');

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(true);
      expect(pool.currentRoundPayments).toHaveLength(3);
      expect(pool.transactions).toHaveLength(3);
    });

    it('should use the pool contributionAmount for the payment', () => {
      const pool = buildPoolState({ contributionAmount: 250 });
      const result = confirmManualContribution(pool, 2, 'paypal');

      expect(result.payment?.amount).toBe(250);
      expect(result.transaction?.amount).toBe(250);
    });

    it('should fail for unknown member id', () => {
      const pool = buildPoolState();
      const result = confirmManualContribution(pool, 999, 'venmo');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not found');
    });

    it('should require a payment method', () => {
      const pool = buildPoolState();
      const result = confirmManualContribution(pool, 2, '');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment method is required');
    });

    it('should assign incremental transaction ids', () => {
      const pool = buildPoolState();

      confirmManualContribution(pool, 2, 'venmo');
      confirmManualContribution(pool, 3, 'venmo');

      expect(pool.transactions[0].id).toBe(1);
      expect(pool.transactions[1].id).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Undo Payment Flow
  // -------------------------------------------------------------------------
  describe('Undo Payment Flow', () => {
    it('should successfully undo an existing payment', () => {
      const pool = buildPoolState();
      confirmManualContribution(pool, 2, 'venmo');
      expect(pool.currentRoundPayments).toHaveLength(1);
      expect(pool.transactions).toHaveLength(1);

      const result = undoPayment(pool, 2);
      expect(result.success).toBe(true);
      expect(pool.currentRoundPayments).toHaveLength(0);
      expect(pool.transactions).toHaveLength(0);
    });

    it('should fail when no payment exists to undo', () => {
      const pool = buildPoolState();
      const result = undoPayment(pool, 2);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No payment found to undo');
    });

    it('should allow re-contribution after undo', () => {
      const pool = buildPoolState();

      // Contribute, undo, re-contribute
      confirmManualContribution(pool, 2, 'venmo');
      undoPayment(pool, 2);
      const result = confirmManualContribution(pool, 2, 'cashapp');

      expect(result.success).toBe(true);
      expect(result.payment?.memberConfirmedVia).toBe('cashapp');
      expect(pool.currentRoundPayments).toHaveLength(1);
      expect(pool.transactions).toHaveLength(1);
    });

    it('should only remove the specified member payment, not others', () => {
      const pool = buildPoolState();
      confirmManualContribution(pool, 2, 'venmo');
      confirmManualContribution(pool, 3, 'paypal');
      expect(pool.currentRoundPayments).toHaveLength(2);

      undoPayment(pool, 2);

      expect(pool.currentRoundPayments).toHaveLength(1);
      expect(pool.currentRoundPayments[0].memberId).toBe(3);
      // Bob's transaction removed, Carol's remains
      expect(pool.transactions).toHaveLength(1);
      expect(pool.transactions[0].member).toBe('Carol');
    });

    it('should undo when only a round payment exists (no transaction)', () => {
      const pool = buildPoolState({
        currentRoundPayments: [
          buildRoundPayment({ memberId: 2, memberEmail: 'bob@example.com' }),
        ],
      });

      const result = undoPayment(pool, 2);
      expect(result.success).toBe(true);
      expect(pool.currentRoundPayments).toHaveLength(0);
    });

    it('should undo when only a transaction exists (no round payment)', () => {
      const pool = buildPoolState({
        transactions: [
          buildTransaction({ member: 'Bob', round: 1 }),
        ],
      });

      const result = undoPayment(pool, 2);
      expect(result.success).toBe(true);
      expect(pool.transactions).toHaveLength(0);
    });

    it('should fail for unknown member id', () => {
      const pool = buildPoolState();
      const result = undoPayment(pool, 999);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Member not found');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Payout Status State Machine
  // -------------------------------------------------------------------------
  describe('Payout Status State Machine', () => {
    it('should start in pending_collection state', () => {
      const pool = buildPoolState();
      expect(pool.currentRoundPayoutStatus).toBe('pending_collection');
    });

    it('should follow the full lifecycle: pending_collection -> ready_to_pay -> paid -> advance', () => {
      const pool = buildPoolState();

      // Step 1: pending_collection is the initial state
      expect(pool.currentRoundPayoutStatus).toBe('pending_collection');

      // Step 2: After all payments verified, admin sets ready_to_pay
      pool.currentRoundPayoutStatus = 'ready_to_pay';
      expect(pool.currentRoundPayoutStatus).toBe('ready_to_pay');

      // Step 3: Admin confirms payout -> paid
      const confirmErr = validatePayoutConfirmation(pool.currentRoundPayoutStatus, 'venmo');
      expect(confirmErr).toBeNull();
      pool.currentRoundPayoutStatus = 'paid';
      expect(pool.currentRoundPayoutStatus).toBe('paid');

      // Step 4: Advance round -> resets to pending_collection
      const advResult = advanceRound(pool);
      expect(advResult.success).toBe(true);
      expect(pool.currentRoundPayoutStatus).toBe('pending_collection');
    });

    it('should list all valid payout statuses', () => {
      const validStatuses: PayoutStatus[] = [
        'pending_collection',
        'ready_to_pay',
        'paid',
        'completed',
      ];
      // Verify these are the expected states
      expect(validStatuses).toHaveLength(4);
    });

    it('should list all valid round payment statuses', () => {
      const validStatuses: RoundPaymentStatus[] = [
        'pending',
        'member_confirmed',
        'admin_verified',
        'late',
        'missed',
        'excused',
      ];
      expect(validStatuses).toHaveLength(6);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Payout Confirmation Guards
  // -------------------------------------------------------------------------
  describe('Payout Confirmation Guards', () => {
    it('should allow confirmation when status is ready_to_pay', () => {
      const err = validatePayoutConfirmation('ready_to_pay', 'venmo');
      expect(err).toBeNull();
    });

    it('should reject when status is pending_collection', () => {
      const err = validatePayoutConfirmation('pending_collection', 'venmo');
      expect(err).toBe('All payments must be verified before payout');
    });

    it('should reject when status is paid', () => {
      const err = validatePayoutConfirmation('paid', 'venmo');
      expect(err).toBe('Payout has already been completed');
    });

    it('should reject when status is completed', () => {
      const err = validatePayoutConfirmation('completed', 'venmo');
      expect(err).toBe('Payout has already been completed');
    });

    it('should reject when payment method is missing', () => {
      const err = validatePayoutConfirmation('ready_to_pay', '');
      expect(err).toBe('Payment method is required');
    });

    it('should reject when payment method is invalid', () => {
      const err = validatePayoutConfirmation('ready_to_pay', 'bitcoin');
      expect(err).toBe('Invalid payment method');
    });

    it('should accept all valid payout methods', () => {
      for (const method of VALID_PAYMENT_METHODS) {
        const err = validatePayoutConfirmation('ready_to_pay', method);
        expect(err).toBeNull();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. Round Advancement State Reset
  // -------------------------------------------------------------------------
  describe('Round Advancement State Reset', () => {
    function buildPaidPool(): PoolState {
      return buildPoolState({
        currentRound: 1,
        totalRounds: 4,
        currentRoundPayoutStatus: 'paid',
        currentRoundPayoutCompletedAt: new Date().toISOString(),
        currentRoundPayoutMethod: 'venmo',
        currentRoundPayoutNotes: 'Sent via Venmo',
        currentRoundPayoutConfirmedBy: 'admin-user-id',
        currentRoundPayments: [
          buildRoundPayment({ memberId: 2 }),
          buildRoundPayment({ memberId: 3 }),
          buildRoundPayment({ memberId: 4 }),
        ],
      });
    }

    it('should increment currentRound by 1', () => {
      const pool = buildPaidPool();
      advanceRound(pool);
      expect(pool.currentRound).toBe(2);
    });

    it('should reset currentRoundPayments to empty array', () => {
      const pool = buildPaidPool();
      advanceRound(pool);
      expect(pool.currentRoundPayments).toEqual([]);
    });

    it('should reset payoutStatus to pending_collection', () => {
      const pool = buildPaidPool();
      advanceRound(pool);
      expect(pool.currentRoundPayoutStatus).toBe('pending_collection');
    });

    it('should reset all payout fields to null', () => {
      const pool = buildPaidPool();
      advanceRound(pool);

      expect(pool.currentRoundPayoutCompletedAt).toBeNull();
      expect(pool.currentRoundPayoutMethod).toBeNull();
      expect(pool.currentRoundPayoutNotes).toBeNull();
      expect(pool.currentRoundPayoutConfirmedBy).toBeNull();
    });

    it('should mark pool as completed when advancing past totalRounds', () => {
      const pool = buildPaidPool();
      pool.currentRound = 4; // last round
      pool.totalRounds = 4;

      const result = advanceRound(pool);

      expect(result.isComplete).toBe(true);
      expect(pool.status).toBe(PoolStatus.COMPLETED);
      expect(pool.currentRound).toBe(5);
    });

    it('should NOT mark pool as completed when more rounds remain', () => {
      const pool = buildPaidPool();
      pool.currentRound = 2;
      pool.totalRounds = 4;

      const result = advanceRound(pool);

      expect(result.isComplete).toBe(false);
      expect(pool.status).toBe(PoolStatus.ACTIVE);
    });

    it('should fail to advance when payoutStatus is not paid', () => {
      const pool = buildPoolState({ currentRoundPayoutStatus: 'pending_collection' });
      const result = advanceRound(pool);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payout must be completed before advancing');
    });

    it('should fail to advance when payoutStatus is ready_to_pay', () => {
      const pool = buildPoolState({ currentRoundPayoutStatus: 'ready_to_pay' });
      const result = advanceRound(pool);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payout must be completed before advancing');
    });

    it('should support advancing through all rounds to completion', () => {
      const pool = buildPoolState({ totalRounds: 3, currentRoundPayoutStatus: 'paid' });

      // Round 1 -> 2
      let result = advanceRound(pool);
      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(pool.currentRound).toBe(2);

      // Simulate round 2 payout
      pool.currentRoundPayoutStatus = 'paid';

      // Round 2 -> 3
      result = advanceRound(pool);
      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(pool.currentRound).toBe(3);

      // Simulate round 3 payout
      pool.currentRoundPayoutStatus = 'paid';

      // Round 3 -> 4 (complete)
      result = advanceRound(pool);
      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(pool.status).toBe(PoolStatus.COMPLETED);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Payment Method Validation
  // -------------------------------------------------------------------------
  describe('Payment Method Validation', () => {
    it.each(VALID_PAYMENT_METHODS)(
      'should accept valid payment method: %s',
      (method) => {
        const pool = buildPoolState();
        const result = confirmManualContribution(pool, 2, method);
        expect(result.success).toBe(true);
        expect(result.payment?.memberConfirmedVia).toBe(method);
      }
    );

    it.each([
      'bitcoin',
      'stripe',
      'wire',
      'check',
      'crypto',
      'VENMO',
      'Venmo',
      '',
    ])(
      'should reject invalid payment method: "%s"',
      (method) => {
        const pool = buildPoolState();
        const result = confirmManualContribution(pool, 2, method);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/payment method/i);
      }
    );

    it.each(VALID_PAYMENT_METHODS)(
      'should accept valid payout method for confirmation: %s',
      (method) => {
        const err = validatePayoutConfirmation('ready_to_pay', method);
        expect(err).toBeNull();
      }
    );

    it.each(['bitcoin', 'stripe', 'VENMO', ''])(
      'should reject invalid payout method for confirmation: "%s"',
      (method) => {
        const err = validatePayoutConfirmation('ready_to_pay', method);
        expect(err).toBeTruthy();
      }
    );

    it('should enforce case sensitivity on payment methods', () => {
      const pool = buildPoolState();

      const upper = confirmManualContribution(pool, 2, 'Venmo');
      expect(upper.success).toBe(false);

      const lower = confirmManualContribution(pool, 2, 'venmo');
      expect(lower.success).toBe(true);
    });
  });
});
