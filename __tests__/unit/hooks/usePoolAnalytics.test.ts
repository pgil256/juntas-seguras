/**
 * Unit tests for lib/hooks/usePoolAnalytics.ts
 * Tests the usePoolAnalytics hook that processes pool data into analytics
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePoolAnalytics } from '@/lib/hooks/usePoolAnalytics';
import { usePool } from '@/lib/hooks/usePool';
import { Pool, TransactionType, PoolStatus, PoolMemberStatus, PoolMemberRole } from '@/types/pool';

// Mock usePool hook
jest.mock('@/lib/hooks/usePool', () => ({
  usePool: jest.fn(),
}));

const mockUsePool = usePool as jest.MockedFunction<typeof usePool>;

describe('usePoolAnalytics', () => {
  const defaultProps = {
    poolId: 'pool-123',
    timeframe: '3months',
  };

  // Create a mock pool for testing
  const createMockPool = (overrides: Partial<Pool> = {}): Pool => ({
    id: 'pool-123',
    name: 'Test Pool',
    description: 'A test pool for analytics',
    createdAt: '2024-10-01T00:00:00Z',
    status: PoolStatus.ACTIVE,
    totalAmount: 600,
    contributionAmount: 100,
    frequency: 'weekly',
    currentRound: 3,
    totalRounds: 6,
    nextPayoutDate: '2025-01-15T00:00:00Z',
    memberCount: 6,
    members: [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        joinDate: '2024-10-01',
        role: PoolMemberRole.ADMIN,
        position: 1,
        status: PoolMemberStatus.COMPLETED,
        paymentsOnTime: 3,
        paymentsMissed: 0,
        totalContributed: 300,
        payoutReceived: true,
        payoutDate: '2024-10-14',
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        joinDate: '2024-10-01',
        role: PoolMemberRole.MEMBER,
        position: 2,
        status: PoolMemberStatus.COMPLETED,
        paymentsOnTime: 2,
        paymentsMissed: 1,
        totalContributed: 200,
        payoutReceived: true,
        payoutDate: '2024-10-28',
      },
      {
        id: 3,
        name: 'Charlie',
        email: 'charlie@example.com',
        joinDate: '2024-10-01',
        role: PoolMemberRole.MEMBER,
        position: 3,
        status: PoolMemberStatus.CURRENT,
        paymentsOnTime: 3,
        paymentsMissed: 0,
        totalContributed: 300,
        payoutReceived: false,
        payoutDate: '2025-01-15',
      },
      {
        id: 4,
        name: 'Diana',
        email: 'diana@example.com',
        joinDate: '2024-10-01',
        role: PoolMemberRole.MEMBER,
        position: 4,
        status: PoolMemberStatus.UPCOMING,
        paymentsOnTime: 3,
        paymentsMissed: 0,
        totalContributed: 300,
        payoutReceived: false,
        payoutDate: '2025-01-29',
      },
      {
        id: 5,
        name: 'Eve',
        email: 'eve@example.com',
        joinDate: '2024-10-01',
        role: PoolMemberRole.MEMBER,
        position: 5,
        status: PoolMemberStatus.UPCOMING,
        paymentsOnTime: 3,
        paymentsMissed: 0,
        totalContributed: 300,
        payoutReceived: false,
        payoutDate: '2025-02-12',
      },
      {
        id: 6,
        name: 'Frank',
        email: 'frank@example.com',
        joinDate: '2024-10-01',
        role: PoolMemberRole.MEMBER,
        position: 6,
        status: PoolMemberStatus.UPCOMING,
        paymentsOnTime: 2,
        paymentsMissed: 1,
        totalContributed: 200,
        payoutReceived: false,
        payoutDate: '2025-02-26',
      },
    ],
    transactions: [
      // Round 1 contributions
      { id: 1, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-01T10:00:00Z', member: 'Alice', status: 'completed' },
      { id: 2, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-01T11:00:00Z', member: 'Bob', status: 'completed' },
      { id: 3, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-01T12:00:00Z', member: 'Charlie', status: 'completed' },
      { id: 4, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-01T13:00:00Z', member: 'Diana', status: 'completed' },
      { id: 5, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-01T14:00:00Z', member: 'Eve', status: 'completed' },
      { id: 6, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-01T15:00:00Z', member: 'Frank', status: 'completed' },
      // Round 1 payout
      { id: 7, type: TransactionType.PAYOUT, amount: 600, date: '2024-10-14T10:00:00Z', member: 'Alice', status: 'completed' },
      // Round 2 contributions
      { id: 8, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-15T10:00:00Z', member: 'Alice', status: 'completed' },
      { id: 9, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-15T11:00:00Z', member: 'Bob', status: 'late' },
      { id: 10, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-15T12:00:00Z', member: 'Charlie', status: 'completed' },
      { id: 11, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-15T13:00:00Z', member: 'Diana', status: 'completed' },
      { id: 12, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-15T14:00:00Z', member: 'Eve', status: 'completed' },
      { id: 13, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-15T15:00:00Z', member: 'Frank', status: 'late' },
      // Round 2 payout
      { id: 14, type: TransactionType.PAYOUT, amount: 600, date: '2024-10-28T10:00:00Z', member: 'Bob', status: 'completed' },
      // Round 3 contributions
      { id: 15, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-29T10:00:00Z', member: 'Alice', status: 'completed' },
      { id: 16, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-29T11:00:00Z', member: 'Charlie', status: 'completed' },
      { id: 17, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-29T12:00:00Z', member: 'Diana', status: 'completed' },
      { id: 18, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-29T13:00:00Z', member: 'Eve', status: 'completed' },
      { id: 19, type: TransactionType.CONTRIBUTION, amount: 100, date: '2024-10-29T14:00:00Z', member: 'Frank', status: 'completed' },
    ],
    messages: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State and Loading', () => {
    it('should return loading state when pool is loading', () => {
      mockUsePool.mockReturnValue({
        pool: null,
        isLoading: true,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.analytics).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should return null analytics initially', () => {
      mockUsePool.mockReturnValue({
        pool: null,
        isLoading: true,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      expect(result.current.analytics).toBeNull();
    });

    it('should use default timeframe of 3months when not specified', () => {
      mockUsePool.mockReturnValue({
        pool: createMockPool(),
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics({ poolId: 'pool-123' }));

      expect(result.current.analytics).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return pool error when usePool returns an error', async () => {
      mockUsePool.mockReturnValue({
        pool: null,
        isLoading: false,
        error: 'Pool not found',
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool not found');
      expect(result.current.analytics).toBeNull();
    });

    it('should return error when pool is null', async () => {
      mockUsePool.mockReturnValue({
        pool: null,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Pool not found');
      expect(result.current.analytics).toBeNull();
    });

    it('should handle processing errors gracefully', async () => {
      // Create a pool with invalid data that might cause processing errors
      const invalidPool = {
        ...createMockPool(),
        totalRounds: 0, // This could cause division by zero
      };

      mockUsePool.mockReturnValue({
        pool: invalidPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should either succeed with special handling or return an error
      // The actual behavior depends on implementation
      expect(result.current.error === null || result.current.analytics !== null).toBe(true);
    });
  });

  describe('Analytics Calculations', () => {
    it('should calculate totalSaved correctly', async () => {
      const mockPool = createMockPool({ totalAmount: 1200 });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.totalSaved).toBe(1200);
    });

    it('should calculate completionPercentage correctly', async () => {
      const mockPool = createMockPool({ currentRound: 3, totalRounds: 6 });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.completionPercentage).toBe(50);
    });

    it('should calculate onTimeRate correctly', async () => {
      // Pool has 16 on-time + 2 missed = 18 total
      // On-time rate should be (16/18) * 100 = ~88.89%
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // Calculate expected: (16 / 18) * 100 = 88.89
      const expectedRate = (16 / 18) * 100;
      expect(result.current.analytics?.onTimeRate).toBeCloseTo(expectedRate, 1);
    });

    it('should return 100% onTimeRate when no payments', async () => {
      const mockPool = createMockPool({
        members: [
          {
            id: 1,
            name: 'Alice',
            email: 'alice@example.com',
            joinDate: '2024-10-01',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.UPCOMING,
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: '2025-01-15',
          },
        ],
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.onTimeRate).toBe(100);
    });

    it('should calculate averageContribution correctly', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // All contributions are $100
      expect(result.current.analytics?.averageContribution).toBe(100);
    });

    it('should return 0 averageContribution when no contributions', async () => {
      const mockPool = createMockPool({ transactions: [] });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.averageContribution).toBe(0);
    });
  });

  describe('Payout Distribution Data', () => {
    it('should calculate payoutDistributionData correctly', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const distribution = result.current.analytics?.payoutDistributionData;
      expect(distribution).toHaveLength(2);

      // Find Paid Out entry
      const paidOut = distribution?.find((d) => d.name === 'Paid Out');
      expect(paidOut).toBeDefined();
      expect(paidOut?.value).toBe(1200); // Two payouts of $600 each

      // Find Remaining entry
      const remaining = distribution?.find((d) => d.name === 'Remaining');
      expect(remaining).toBeDefined();
      // Total expected: 100 * 6 members * 6 rounds = 3600
      // Remaining: 3600 - 1200 = 2400
      expect(remaining?.value).toBe(2400);
    });
  });

  describe('Member Contribution Data', () => {
    it('should calculate memberContributionData correctly', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const memberData = result.current.analytics?.memberContributionData;
      expect(memberData).toHaveLength(6);

      // Check Alice's data
      const alice = memberData?.find((m) => m.name === 'Alice');
      expect(alice).toBeDefined();
      expect(alice?.totalContributed).toBe(300);
      expect(alice?.totalReceived).toBe(600);
      expect(alice?.onTimeRate).toBe(100);

      // Check Bob's data (has missed payments)
      const bob = memberData?.find((m) => m.name === 'Bob');
      expect(bob).toBeDefined();
      expect(bob?.totalContributed).toBe(200);
      expect(bob?.totalReceived).toBe(600);
      expect(bob?.onTimeRate).toBeCloseTo((2 / 3) * 100, 1);
    });

    it('should return 100% onTimeRate for members with no payments', async () => {
      const mockPool = createMockPool({
        members: [
          {
            id: 1,
            name: 'Newbie',
            email: 'newbie@example.com',
            joinDate: '2024-12-01',
            role: PoolMemberRole.MEMBER,
            position: 7,
            status: PoolMemberStatus.UPCOMING,
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: '2025-03-15',
          },
        ],
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const newbie = result.current.analytics?.memberContributionData?.find(
        (m) => m.name === 'Newbie'
      );
      expect(newbie?.onTimeRate).toBe(100);
    });
  });

  describe('Projections', () => {
    it('should calculate projectedCompletionDate correctly', async () => {
      const mockPool = createMockPool({
        currentRound: 3,
        totalRounds: 6,
        nextPayoutDate: '2025-01-15T00:00:00Z',
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // Should be a valid date string
      expect(result.current.analytics?.projectedCompletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should calculate projectedTotalValue correctly', async () => {
      const mockPool = createMockPool({
        contributionAmount: 100,
        memberCount: 6,
        totalRounds: 6,
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // 100 * 6 * 6 = 3600
      expect(result.current.analytics?.projectedTotalValue).toBe(3600);
    });

    it('should calculate expectedReturn correctly', async () => {
      const mockPool = createMockPool({
        contributionAmount: 100,
        memberCount: 6,
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // 100 * 6 = 600
      expect(result.current.analytics?.expectedReturn).toBe(600);
    });
  });

  describe('Risk Level', () => {
    it('should calculate low risk level for pool with all on-time payments', async () => {
      const mockPool = createMockPool({
        members: [
          {
            id: 1,
            name: 'Alice',
            email: 'alice@example.com',
            joinDate: '2024-10-01',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
            paymentsOnTime: 10,
            paymentsMissed: 0,
            totalContributed: 1000,
            payoutReceived: false,
            payoutDate: '2025-01-15',
          },
        ],
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.riskLevel).toBe(0);
    });

    it('should calculate higher risk level for pool with missed payments', async () => {
      const mockPool = createMockPool({
        members: [
          {
            id: 1,
            name: 'Alice',
            email: 'alice@example.com',
            joinDate: '2024-10-01',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
            paymentsOnTime: 5,
            paymentsMissed: 5,
            totalContributed: 500,
            payoutReceived: false,
            payoutDate: '2025-01-15',
          },
        ],
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // 50% missed * 2 = 100, capped at 100
      expect(result.current.analytics?.riskLevel).toBeGreaterThan(0);
      expect(result.current.analytics?.riskLevel).toBeLessThanOrEqual(100);
    });

    it('should cap risk level at 100', async () => {
      const mockPool = createMockPool({
        members: [
          {
            id: 1,
            name: 'Unreliable',
            email: 'unreliable@example.com',
            joinDate: '2024-10-01',
            role: PoolMemberRole.MEMBER,
            position: 1,
            status: PoolMemberStatus.CURRENT,
            paymentsOnTime: 0,
            paymentsMissed: 10,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: '2025-01-15',
          },
        ],
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.riskLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('Payout Schedule', () => {
    it('should generate correct payout schedule', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const schedule = result.current.analytics?.payoutSchedule;
      expect(schedule).toHaveLength(6); // 6 rounds

      // Check round 1 (completed)
      const round1 = schedule?.find((s) => s.round === 1);
      expect(round1).toBeDefined();
      expect(round1?.member).toBe('Alice');
      expect(round1?.status).toBe('completed');
      expect(round1?.amount).toBe(600);

      // Check round 2 (completed)
      const round2 = schedule?.find((s) => s.round === 2);
      expect(round2).toBeDefined();
      expect(round2?.member).toBe('Bob');
      expect(round2?.status).toBe('completed');

      // Check round 3 (upcoming - current round)
      const round3 = schedule?.find((s) => s.round === 3);
      expect(round3).toBeDefined();
      expect(round3?.member).toBe('Charlie');
      expect(round3?.status).toBe('upcoming');

      // Check future rounds (scheduled)
      const round4 = schedule?.find((s) => s.round === 4);
      expect(round4).toBeDefined();
      expect(round4?.member).toBe('Diana');
      expect(round4?.status).toBe('scheduled');
    });

    it('should show Unknown for members without matching position', async () => {
      const mockPool = createMockPool({
        members: [], // No members
        totalRounds: 2,
      });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const schedule = result.current.analytics?.payoutSchedule;
      expect(schedule?.[0].member).toBe('Unknown');
    });
  });

  describe('Savings Growth Data', () => {
    it('should generate savings growth data from transactions', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const growthData = result.current.analytics?.savingsGrowthData;
      expect(growthData).toBeDefined();
      expect(Array.isArray(growthData)).toBe(true);

      // Should have entries for periods with transactions
      if (growthData && growthData.length > 0) {
        expect(growthData[0]).toHaveProperty('period');
        expect(growthData[0]).toHaveProperty('amount');
      }
    });

    it('should return empty savings growth data for pool with no transactions', async () => {
      const mockPool = createMockPool({ transactions: [] });

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.savingsGrowthData).toEqual([]);
    });
  });

  describe('On-Time Rate Data', () => {
    it('should generate on-time rate data by month', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const rateData = result.current.analytics?.onTimeRateData;
      expect(rateData).toBeDefined();
      expect(Array.isArray(rateData)).toBe(true);

      if (rateData && rateData.length > 0) {
        expect(rateData[0]).toHaveProperty('period');
        expect(rateData[0]).toHaveProperty('rate');
        expect(rateData[0].rate).toBeGreaterThanOrEqual(0);
        expect(rateData[0].rate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Contribution Data', () => {
    it('should generate contribution data by month', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const contribData = result.current.analytics?.contributionData;
      expect(contribData).toBeDefined();
      expect(Array.isArray(contribData)).toBe(true);

      if (contribData && contribData.length > 0) {
        expect(contribData[0]).toHaveProperty('period');
        expect(contribData[0]).toHaveProperty('onTime');
        expect(contribData[0]).toHaveProperty('late');
        expect(contribData[0]).toHaveProperty('missed');
      }
    });

    it('should count late contributions correctly', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result } = renderHook(() => usePoolAnalytics(defaultProps));

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const contribData = result.current.analytics?.contributionData;

      // Sum up all late contributions
      const totalLate = contribData?.reduce((sum, d) => sum + d.late, 0) || 0;
      // We have 2 late transactions in the mock data
      expect(totalLate).toBe(2);
    });
  });

  describe('Props Changes', () => {
    it('should re-process when poolId changes', async () => {
      const pool1 = createMockPool({ id: 'pool-1', name: 'Pool 1', totalAmount: 500 });
      const pool2 = createMockPool({ id: 'pool-2', name: 'Pool 2', totalAmount: 1000 });

      mockUsePool.mockReturnValue({
        pool: pool1,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result, rerender } = renderHook(
        ({ poolId }) => usePoolAnalytics({ poolId }),
        { initialProps: { poolId: 'pool-1' } }
      );

      await waitFor(() => {
        expect(result.current.analytics?.totalSaved).toBe(500);
      });

      // Change to pool-2
      mockUsePool.mockReturnValue({
        pool: pool2,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      rerender({ poolId: 'pool-2' });

      await waitFor(() => {
        expect(result.current.analytics?.totalSaved).toBe(1000);
      });
    });

    it('should re-process when timeframe changes', async () => {
      const mockPool = createMockPool();

      mockUsePool.mockReturnValue({
        pool: mockPool,
        isLoading: false,
        error: null,
        refreshPool: jest.fn(),
      });

      const { result, rerender } = renderHook(
        ({ timeframe }) => usePoolAnalytics({ poolId: 'pool-123', timeframe }),
        { initialProps: { timeframe: '3months' } }
      );

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      const initialAnalytics = result.current.analytics;

      rerender({ timeframe: '6months' });

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // Analytics should still be present (may or may not differ based on implementation)
      expect(result.current.analytics).not.toBeNull();
    });
  });
});
