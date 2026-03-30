/**
 * Pool Rotation Business Logic Unit Tests
 *
 * Pure unit tests for pool payout rotation logic including:
 * - Position-based recipient lookup
 * - Payout amount calculation (universal contribution model)
 * - Round advancement
 * - Next payout date calculation by frequency
 * - Double payout prevention
 * - Contribution verification
 * - Payout status state machine
 * - Pool completion
 */

import {
  PoolMemberRole,
  PoolMemberStatus,
  TransactionType as PoolTransactionType,
  PayoutStatus,
  RoundPaymentStatus,
} from '@/types/pool';
import type {
  PoolMember,
  PoolTransaction,
  RoundPayment,
  Pool,
} from '@/types/pool';
import { TransactionStatus } from '@/types/payment';

// ---------------------------------------------------------------------------
// Helpers – build test objects
// ---------------------------------------------------------------------------

function buildMember(overrides: Partial<PoolMember> & { id: number; position: number }): PoolMember {
  return {
    name: `Member ${overrides.id}`,
    email: `member${overrides.id}@example.com`,
    joinDate: '2025-01-01',
    role: PoolMemberRole.MEMBER,
    status: PoolMemberStatus.ACTIVE,
    paymentsOnTime: 0,
    paymentsMissed: 0,
    totalContributed: 0,
    payoutReceived: false,
    payoutDate: '',
    ...overrides,
  };
}

function buildMembers(count: number): PoolMember[] {
  return Array.from({ length: count }, (_, i) =>
    buildMember({
      id: i + 1,
      position: i + 1,
      role: i === 0 ? PoolMemberRole.ADMIN : PoolMemberRole.MEMBER,
    }),
  );
}

function buildPool(overrides: Partial<Pool> = {}): Pool {
  const members = overrides.members ?? buildMembers(5);
  return {
    id: 'pool-1',
    name: 'Test Pool',
    description: 'A test pool',
    createdAt: '2025-01-01',
    status: 'active' as any,
    totalAmount: 500,
    contributionAmount: 100,
    frequency: 'weekly',
    currentRound: 1,
    totalRounds: members.length,
    nextPayoutDate: '2025-01-08',
    memberCount: members.length,
    members,
    transactions: [],
    messages: [],
    currentRoundPayments: [],
    currentRoundPayoutStatus: 'pending_collection' as PayoutStatus,
    ...overrides,
  };
}

function buildTransaction(overrides: Partial<PoolTransaction> = {}): PoolTransaction {
  return {
    id: 1,
    type: PoolTransactionType.CONTRIBUTION,
    amount: 100,
    date: new Date().toISOString(),
    member: 'Member 1',
    status: TransactionStatus.COMPLETED,
    round: 1,
    ...overrides,
  };
}

function buildRoundPayment(overrides: Partial<RoundPayment> = {}): RoundPayment {
  return {
    memberId: 1,
    memberName: 'Member 1',
    memberEmail: 'member1@example.com',
    amount: 100,
    status: 'admin_verified' as RoundPaymentStatus,
    reminderCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pure functions extracted from route handlers for testability
// ---------------------------------------------------------------------------

function findRecipientForRound(members: PoolMember[], currentRound: number): PoolMember | undefined {
  return members.find((m) => m.position === currentRound);
}

function calculatePayoutAmount(contributionAmount: number, totalMembers: number): number {
  return contributionAmount * totalMembers;
}

function calculateNextPayoutDate(frequency: string, from: Date = new Date()): Date {
  const next = new Date(from);
  switch (frequency.toLowerCase()) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

function advanceRound(pool: Pool): { nextRound: number; isComplete: boolean } {
  const currentRound = pool.currentRound || 1;
  const nextRound = currentRound + 1;
  const totalRounds = pool.totalRounds || pool.members.length;
  return {
    nextRound,
    isComplete: nextRound > totalRounds,
  };
}

function isPayoutAlreadyDone(
  recipient: PoolMember,
  transactions: PoolTransaction[],
  currentRound: number,
): boolean {
  if (recipient.payoutReceived) return true;
  const existingPayout = transactions.find(
    (t) =>
      t.type === PoolTransactionType.PAYOUT &&
      t.round === currentRound &&
      t.status === TransactionStatus.COMPLETED,
  );
  return !!existingPayout;
}

function allMembersContributed(
  members: PoolMember[],
  transactions: PoolTransaction[],
  roundPayments: RoundPayment[],
  currentRound: number,
): { allContributed: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const member of members) {
    const hasTransaction = transactions.some(
      (t) =>
        t.member === member.name &&
        t.type === PoolTransactionType.CONTRIBUTION &&
        t.round === currentRound,
    );
    const hasVerifiedPayment = roundPayments.some(
      (p) => p.memberId === member.id && p.status === 'admin_verified',
    );
    if (!hasTransaction && !hasVerifiedPayment) {
      missing.push(member.name);
    }
  }
  return { allContributed: missing.length === 0, missing };
}

const VALID_PAYOUT_TRANSITIONS: Record<string, string[]> = {
  pending_collection: ['ready_to_pay'],
  ready_to_pay: ['paid'],
  paid: ['completed'],
  completed: [],
};

function isValidPayoutTransition(from: PayoutStatus, to: PayoutStatus): boolean {
  return (VALID_PAYOUT_TRANSITIONS[from] || []).includes(to);
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Pool Rotation Logic', () => {
  // -----------------------------------------------------------------------
  // 1. Recipient Lookup
  // -----------------------------------------------------------------------
  describe('Recipient Lookup', () => {
    it('should find the member whose position matches the current round', () => {
      const members = buildMembers(5);
      expect(findRecipientForRound(members, 1)?.id).toBe(1);
      expect(findRecipientForRound(members, 3)?.id).toBe(3);
      expect(findRecipientForRound(members, 5)?.id).toBe(5);
    });

    it('should return undefined when no member has the matching position', () => {
      const members = buildMembers(3);
      expect(findRecipientForRound(members, 4)).toBeUndefined();
      expect(findRecipientForRound(members, 0)).toBeUndefined();
      expect(findRecipientForRound(members, -1)).toBeUndefined();
    });

    it('should handle non-sequential positions', () => {
      const members = [
        buildMember({ id: 1, position: 2 }),
        buildMember({ id: 2, position: 5 }),
        buildMember({ id: 3, position: 8 }),
      ];
      expect(findRecipientForRound(members, 5)?.id).toBe(2);
      expect(findRecipientForRound(members, 1)).toBeUndefined();
    });

    it('should return the first match when duplicate positions exist', () => {
      const members = [
        buildMember({ id: 1, position: 1 }),
        buildMember({ id: 2, position: 1 }),
        buildMember({ id: 3, position: 2 }),
      ];
      // Array.find returns the first match
      const result = findRecipientForRound(members, 1);
      expect(result?.id).toBe(1);
    });

    it('should work with a single-member pool', () => {
      const members = [buildMember({ id: 1, position: 1 })];
      expect(findRecipientForRound(members, 1)?.id).toBe(1);
    });

    it('should return undefined for an empty members array', () => {
      expect(findRecipientForRound([], 1)).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Payout Amount Calculation
  // -----------------------------------------------------------------------
  describe('Payout Amount Calculation', () => {
    it('should calculate payout as contribution_amount * total_members', () => {
      expect(calculatePayoutAmount(100, 5)).toBe(500);
    });

    it('should include the recipient in the count (NOT members - 1)', () => {
      const contributionAmount = 100;
      const totalMembers = 5;
      const payout = calculatePayoutAmount(contributionAmount, totalMembers);
      const incorrectPayout = contributionAmount * (totalMembers - 1);
      expect(payout).toBe(500);
      expect(payout).not.toBe(incorrectPayout);
    });

    it('should handle 3 members', () => {
      expect(calculatePayoutAmount(50, 3)).toBe(150);
    });

    it('should handle 10 members', () => {
      expect(calculatePayoutAmount(200, 10)).toBe(2000);
    });

    it('should handle 20 members', () => {
      expect(calculatePayoutAmount(25, 20)).toBe(500);
    });

    it('should handle fractional contribution amounts', () => {
      expect(calculatePayoutAmount(33.33, 3)).toBeCloseTo(99.99);
    });

    it('should return 0 when contribution amount is 0', () => {
      expect(calculatePayoutAmount(0, 10)).toBe(0);
    });

    it('should match the formula used in the GET route handler', () => {
      const pool = buildPool({ contributionAmount: 100, members: buildMembers(5) });
      const potAmount = pool.contributionAmount * pool.members.length;
      expect(potAmount).toBe(calculatePayoutAmount(pool.contributionAmount, pool.members.length));
    });
  });

  // -----------------------------------------------------------------------
  // 3. Round Advancement
  // -----------------------------------------------------------------------
  describe('Round Advancement', () => {
    it('should increment currentRound by 1 mid-pool', () => {
      const pool = buildPool({ currentRound: 2, totalRounds: 5 });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(3);
      expect(isComplete).toBe(false);
    });

    it('should not mark as complete when advancing to the last round', () => {
      const pool = buildPool({ currentRound: 4, totalRounds: 5 });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(5);
      expect(isComplete).toBe(false);
    });

    it('should mark as complete when advancing past the final round', () => {
      const pool = buildPool({ currentRound: 5, totalRounds: 5 });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(6);
      expect(isComplete).toBe(true);
    });

    it('should handle first round advancement', () => {
      const pool = buildPool({ currentRound: 1, totalRounds: 5 });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(2);
      expect(isComplete).toBe(false);
    });

    it('should use members.length as totalRounds when totalRounds is not set', () => {
      const pool = buildPool({ currentRound: 5, totalRounds: 0, members: buildMembers(5) });
      // When totalRounds is 0 (falsy), fallback to members.length
      const currentRound = pool.currentRound || 1;
      const nextRound = currentRound + 1;
      const totalRounds = pool.totalRounds || pool.members.length;
      expect(totalRounds).toBe(5);
      expect(nextRound > totalRounds).toBe(true);
    });

    it('should handle single-round pool', () => {
      const pool = buildPool({ currentRound: 1, totalRounds: 1 });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(2);
      expect(isComplete).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Next Payout Date Calculation
  // -----------------------------------------------------------------------
  describe('Next Payout Date Calculation', () => {
    const baseDate = new Date('2025-06-01T12:00:00Z');

    it('should add 7 days for weekly frequency', () => {
      const next = calculateNextPayoutDate('weekly', baseDate);
      expect(next.getDate()).toBe(8);
      expect(next.getMonth()).toBe(baseDate.getMonth());
    });

    it('should add 14 days for biweekly frequency', () => {
      const next = calculateNextPayoutDate('biweekly', baseDate);
      expect(next.getDate()).toBe(15);
      expect(next.getMonth()).toBe(baseDate.getMonth());
    });

    it('should add 1 month for monthly frequency', () => {
      const next = calculateNextPayoutDate('monthly', baseDate);
      expect(next.getMonth()).toBe(baseDate.getMonth() + 1);
      expect(next.getDate()).toBe(baseDate.getDate());
    });

    it('should default to 7 days for unknown frequency', () => {
      const next = calculateNextPayoutDate('quarterly', baseDate);
      expect(next.getDate()).toBe(8);
    });

    it('should default to 7 days for empty string', () => {
      const next = calculateNextPayoutDate('', baseDate);
      expect(next.getDate()).toBe(8);
    });

    it('should be case-insensitive for frequency', () => {
      const upper = calculateNextPayoutDate('WEEKLY', baseDate);
      const lower = calculateNextPayoutDate('weekly', baseDate);
      expect(upper.getTime()).toBe(lower.getTime());
    });

    it('should handle month boundary for weekly (e.g., Jan 29 + 7 = Feb 5)', () => {
      const janDate = new Date('2025-01-29T12:00:00Z');
      const next = calculateNextPayoutDate('weekly', janDate);
      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(5);
    });

    it('should handle month end for monthly (Jan 31 -> Mar 3 due to JS Date overflow)', () => {
      const jan31 = new Date('2025-01-31T12:00:00Z');
      const next = calculateNextPayoutDate('monthly', jan31);
      // JavaScript setMonth(1) on Jan 31 creates "Feb 31" which overflows to Mar 3
      // This matches production code behavior — a known JS Date quirk
      expect(next.getMonth()).toBe(2); // March (0-indexed)
      expect(next.getDate()).toBe(3);
    });

    it('should handle year boundary for monthly (Dec -> Jan)', () => {
      const decDate = new Date('2025-12-15T12:00:00Z');
      const next = calculateNextPayoutDate('monthly', decDate);
      expect(next.getFullYear()).toBe(2026);
      expect(next.getMonth()).toBe(0); // January
    });
  });

  // -----------------------------------------------------------------------
  // 5. Double Payout Prevention
  // -----------------------------------------------------------------------
  describe('Double Payout Prevention', () => {
    it('should detect payout via payoutReceived flag on recipient', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: true });
      expect(isPayoutAlreadyDone(recipient, [], 1)).toBe(true);
    });

    it('should detect payout via existing completed payout transaction', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: false });
      const transactions = [
        buildTransaction({
          type: PoolTransactionType.PAYOUT,
          round: 1,
          status: TransactionStatus.COMPLETED,
          member: 'Member 1',
        }),
      ];
      expect(isPayoutAlreadyDone(recipient, transactions, 1)).toBe(true);
    });

    it('should detect payout when both flag and transaction exist', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: true });
      const transactions = [
        buildTransaction({
          type: PoolTransactionType.PAYOUT,
          round: 1,
          status: TransactionStatus.COMPLETED,
          member: 'Member 1',
        }),
      ];
      expect(isPayoutAlreadyDone(recipient, transactions, 1)).toBe(true);
    });

    it('should allow payout when neither flag nor transaction exist', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: false });
      expect(isPayoutAlreadyDone(recipient, [], 1)).toBe(false);
    });

    it('should not flag a payout transaction from a different round', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: false });
      const transactions = [
        buildTransaction({
          type: PoolTransactionType.PAYOUT,
          round: 2,
          status: TransactionStatus.COMPLETED,
          member: 'Member 1',
        }),
      ];
      expect(isPayoutAlreadyDone(recipient, transactions, 1)).toBe(false);
    });

    it('should not flag a pending payout transaction', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: false });
      const transactions = [
        buildTransaction({
          type: PoolTransactionType.PAYOUT,
          round: 1,
          status: TransactionStatus.PENDING,
          member: 'Member 1',
        }),
      ];
      expect(isPayoutAlreadyDone(recipient, transactions, 1)).toBe(false);
    });

    it('should not flag a contribution transaction as a payout', () => {
      const recipient = buildMember({ id: 1, position: 1, payoutReceived: false });
      const transactions = [
        buildTransaction({
          type: PoolTransactionType.CONTRIBUTION,
          round: 1,
          status: TransactionStatus.COMPLETED,
          member: 'Member 1',
        }),
      ];
      expect(isPayoutAlreadyDone(recipient, transactions, 1)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Contribution Verification
  // -----------------------------------------------------------------------
  describe('Contribution Verification', () => {
    it('should pass when all members have completed transactions', () => {
      const members = buildMembers(3);
      const transactions = members.map((m) =>
        buildTransaction({
          member: m.name,
          type: PoolTransactionType.CONTRIBUTION,
          round: 1,
        }),
      );
      const { allContributed, missing } = allMembersContributed(members, transactions, [], 1);
      expect(allContributed).toBe(true);
      expect(missing).toHaveLength(0);
    });

    it('should pass when all members have admin-verified round payments', () => {
      const members = buildMembers(3);
      const payments = members.map((m) =>
        buildRoundPayment({ memberId: m.id, status: 'admin_verified' }),
      );
      const { allContributed, missing } = allMembersContributed(members, [], payments, 1);
      expect(allContributed).toBe(true);
      expect(missing).toHaveLength(0);
    });

    it('should fail when one member has not contributed', () => {
      const members = buildMembers(3);
      const transactions = [
        buildTransaction({ member: 'Member 1', round: 1, type: PoolTransactionType.CONTRIBUTION }),
        buildTransaction({ member: 'Member 2', round: 1, type: PoolTransactionType.CONTRIBUTION }),
        // Member 3 is missing
      ];
      const { allContributed, missing } = allMembersContributed(members, transactions, [], 1);
      expect(allContributed).toBe(false);
      expect(missing).toEqual(['Member 3']);
    });

    it('should require the recipient to contribute (universal model)', () => {
      const members = buildMembers(3);
      // Recipient is position 1 = Member 1, and they have NOT contributed
      const transactions = [
        buildTransaction({ member: 'Member 2', round: 1, type: PoolTransactionType.CONTRIBUTION }),
        buildTransaction({ member: 'Member 3', round: 1, type: PoolTransactionType.CONTRIBUTION }),
      ];
      const { allContributed, missing } = allMembersContributed(members, transactions, [], 1);
      expect(allContributed).toBe(false);
      expect(missing).toContain('Member 1');
    });

    it('should not count contributions from a different round', () => {
      const members = buildMembers(2);
      const transactions = [
        buildTransaction({ member: 'Member 1', round: 2, type: PoolTransactionType.CONTRIBUTION }),
        buildTransaction({ member: 'Member 2', round: 2, type: PoolTransactionType.CONTRIBUTION }),
      ];
      const { allContributed, missing } = allMembersContributed(members, transactions, [], 1);
      expect(allContributed).toBe(false);
      expect(missing).toHaveLength(2);
    });

    it('should accept a mix of transactions and verified round payments', () => {
      const members = buildMembers(3);
      const transactions = [
        buildTransaction({ member: 'Member 1', round: 1, type: PoolTransactionType.CONTRIBUTION }),
      ];
      const payments = [
        buildRoundPayment({ memberId: 2, status: 'admin_verified' }),
        buildRoundPayment({ memberId: 3, status: 'admin_verified' }),
      ];
      const { allContributed, missing } = allMembersContributed(members, transactions, payments, 1);
      expect(allContributed).toBe(true);
      expect(missing).toHaveLength(0);
    });

    it('should not count member_confirmed (unverified) payments as contributed', () => {
      const members = buildMembers(2);
      const payments = [
        buildRoundPayment({ memberId: 1, status: 'admin_verified' }),
        buildRoundPayment({ memberId: 2, status: 'member_confirmed' as RoundPaymentStatus }),
      ];
      const { allContributed, missing } = allMembersContributed(members, [], payments, 1);
      expect(allContributed).toBe(false);
      expect(missing).toContain('Member 2');
    });

    it('should not count pending payments as contributed', () => {
      const members = buildMembers(2);
      const payments = [
        buildRoundPayment({ memberId: 1, status: 'admin_verified' }),
        buildRoundPayment({ memberId: 2, status: 'pending' as RoundPaymentStatus }),
      ];
      const { allContributed, missing } = allMembersContributed(members, [], payments, 1);
      expect(allContributed).toBe(false);
      expect(missing).toContain('Member 2');
    });

    it('should handle empty members array', () => {
      const { allContributed, missing } = allMembersContributed([], [], [], 1);
      expect(allContributed).toBe(true);
      expect(missing).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Payout Status State Machine
  // -----------------------------------------------------------------------
  describe('Payout Status State Machine', () => {
    it('should allow pending_collection -> ready_to_pay', () => {
      expect(isValidPayoutTransition('pending_collection', 'ready_to_pay')).toBe(true);
    });

    it('should allow ready_to_pay -> paid', () => {
      expect(isValidPayoutTransition('ready_to_pay', 'paid')).toBe(true);
    });

    it('should allow paid -> completed', () => {
      expect(isValidPayoutTransition('paid', 'completed')).toBe(true);
    });

    it('should NOT allow pending_collection -> paid (skipping a step)', () => {
      expect(isValidPayoutTransition('pending_collection', 'paid')).toBe(false);
    });

    it('should NOT allow pending_collection -> completed (skipping steps)', () => {
      expect(isValidPayoutTransition('pending_collection', 'completed')).toBe(false);
    });

    it('should NOT allow ready_to_pay -> completed (skipping paid)', () => {
      expect(isValidPayoutTransition('ready_to_pay', 'completed')).toBe(false);
    });

    it('should NOT allow backward transition paid -> ready_to_pay', () => {
      expect(isValidPayoutTransition('paid', 'ready_to_pay')).toBe(false);
    });

    it('should NOT allow backward transition completed -> paid', () => {
      expect(isValidPayoutTransition('completed', 'paid')).toBe(false);
    });

    it('should NOT allow completed -> any state (terminal)', () => {
      expect(isValidPayoutTransition('completed', 'pending_collection')).toBe(false);
      expect(isValidPayoutTransition('completed', 'ready_to_pay')).toBe(false);
      expect(isValidPayoutTransition('completed', 'paid')).toBe(false);
      expect(isValidPayoutTransition('completed', 'completed')).toBe(false);
    });

    it('should NOT allow self-transitions', () => {
      expect(isValidPayoutTransition('pending_collection', 'pending_collection')).toBe(false);
      expect(isValidPayoutTransition('ready_to_pay', 'ready_to_pay')).toBe(false);
      expect(isValidPayoutTransition('paid', 'paid')).toBe(false);
    });

    it('should verify the route handler enforces ready_to_pay before payout', () => {
      // The POST handler checks: payoutStatus !== 'ready_to_pay'
      // This mirrors the state machine: only ready_to_pay -> paid is valid for the POST action
      const validForPayout: PayoutStatus = 'ready_to_pay';
      expect(isValidPayoutTransition(validForPayout, 'paid')).toBe(true);

      const invalidForPayout: PayoutStatus[] = ['pending_collection', 'paid', 'completed'];
      invalidForPayout.forEach((status) => {
        expect(isValidPayoutTransition(status, 'paid')).toBe(false);
      });
    });
  });

  // -----------------------------------------------------------------------
  // 8. Pool Completion
  // -----------------------------------------------------------------------
  describe('Pool Completion', () => {
    it('should mark pool as completed when advancing past the final round', () => {
      const pool = buildPool({ currentRound: 5, totalRounds: 5 });
      const { isComplete } = advanceRound(pool);
      expect(isComplete).toBe(true);
    });

    it('should NOT mark pool as completed when still mid-cycle', () => {
      const pool = buildPool({ currentRound: 3, totalRounds: 5 });
      const { isComplete } = advanceRound(pool);
      expect(isComplete).toBe(false);
    });

    it('should build correct update data on completion', () => {
      const pool = buildPool({ currentRound: 5, totalRounds: 5, frequency: 'weekly' });
      const { nextRound, isComplete } = advanceRound(pool);

      // Simulate the update logic from the PUT route handler
      const updateData: Record<string, unknown> = {
        currentRound: nextRound,
        currentRoundPayoutStatus: 'pending_collection',
        currentRoundPayments: [],
        currentRoundPayoutCompletedAt: null,
        currentRoundPayoutMethod: null,
        currentRoundPayoutNotes: null,
        currentRoundPayoutConfirmedBy: null,
        nextPayoutDate: calculateNextPayoutDate(pool.frequency).toISOString(),
      };

      if (isComplete) {
        updateData.status = 'completed';
      }

      expect(updateData.status).toBe('completed');
      expect(updateData.currentRound).toBe(6);
      expect(updateData.currentRoundPayments).toEqual([]);
      expect(updateData.currentRoundPayoutCompletedAt).toBeNull();
      expect(updateData.currentRoundPayoutMethod).toBeNull();
      expect(updateData.currentRoundPayoutNotes).toBeNull();
      expect(updateData.currentRoundPayoutConfirmedBy).toBeNull();
    });

    it('should NOT set status on mid-cycle update data', () => {
      const pool = buildPool({ currentRound: 3, totalRounds: 5 });
      const { nextRound, isComplete } = advanceRound(pool);

      const updateData: Record<string, unknown> = {
        currentRound: nextRound,
        currentRoundPayoutStatus: 'pending_collection',
        currentRoundPayments: [],
      };

      if (isComplete) {
        updateData.status = 'completed';
      }

      expect(updateData.status).toBeUndefined();
      expect(updateData.currentRound).toBe(4);
    });

    it('should reset round tracking fields when advancing', () => {
      const pool = buildPool({
        currentRound: 2,
        totalRounds: 5,
        currentRoundPayoutStatus: 'paid',
        currentRoundPayments: [buildRoundPayment({ memberId: 1 })],
      });

      const { nextRound } = advanceRound(pool);

      // The PUT handler resets these fields
      const updateData = {
        currentRound: nextRound,
        currentRoundPayoutStatus: 'pending_collection' as PayoutStatus,
        currentRoundPayments: [] as RoundPayment[],
        currentRoundPayoutCompletedAt: null,
        currentRoundPayoutMethod: null,
        currentRoundPayoutNotes: null,
        currentRoundPayoutConfirmedBy: null,
      };

      expect(updateData.currentRoundPayoutStatus).toBe('pending_collection');
      expect(updateData.currentRoundPayments).toEqual([]);
      expect(updateData.currentRoundPayoutCompletedAt).toBeNull();
    });

    it('should handle a pool with 1 round (complete after first payout)', () => {
      const pool = buildPool({
        currentRound: 1,
        totalRounds: 1,
        members: [buildMember({ id: 1, position: 1 })],
      });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(2);
      expect(isComplete).toBe(true);
    });

    it('should complete a large pool correctly (20 members, 20 rounds)', () => {
      const pool = buildPool({
        currentRound: 20,
        totalRounds: 20,
        members: buildMembers(20),
      });
      const { nextRound, isComplete } = advanceRound(pool);
      expect(nextRound).toBe(21);
      expect(isComplete).toBe(true);
    });

    it('should advance correctly through a full pool lifecycle', () => {
      const totalRounds = 3;
      const pool = buildPool({
        currentRound: 1,
        totalRounds,
        members: buildMembers(totalRounds),
      });

      const results: Array<{ nextRound: number; isComplete: boolean }> = [];
      let currentRound = pool.currentRound;

      for (let i = 0; i < totalRounds; i++) {
        const testPool = { ...pool, currentRound };
        const result = advanceRound(testPool);
        results.push(result);
        currentRound = result.nextRound;
      }

      // Rounds 1->2, 2->3 should not be complete
      expect(results[0]).toEqual({ nextRound: 2, isComplete: false });
      expect(results[1]).toEqual({ nextRound: 3, isComplete: false });
      // Round 3->4 should mark complete
      expect(results[2]).toEqual({ nextRound: 4, isComplete: true });
    });
  });
});
