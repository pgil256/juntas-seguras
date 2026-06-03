/**
 * Upcoming Payments API Tests
 *
 * Covers the universal contribution model for pool recipients.
 */

import { GET } from '@/app/api/payments/upcoming/route';
import { getCurrentUser } from '@/lib/auth';
import { getPaymentModel } from '@/lib/db/models/payment';
import { getPoolModel } from '@/lib/db/models/pool';
import { PoolMemberRole, PoolMemberStatus, PoolStatus } from '@/types/pool';

jest.mock('@/lib/db/connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init = {}) => ({
      status: init.status ?? 200,
      json: jest.fn().mockResolvedValue(body),
    })),
  },
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/db/models/pool', () => ({
  getPoolModel: jest.fn(),
}));

jest.mock('@/lib/db/models/payment', () => ({
  getPaymentModel: jest.fn(),
}));

const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockGetPoolModel = getPoolModel as jest.Mock;
const mockGetPaymentModel = getPaymentModel as jest.Mock;

describe('Upcoming Payments API', () => {
  const mockPoolFind = jest.fn();
  const mockPaymentFindOne = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPoolModel.mockReturnValue({ find: mockPoolFind });
    mockGetPaymentModel.mockReturnValue({ findOne: mockPaymentFindOne });
    mockPaymentFindOne.mockResolvedValue(null);
  });

  it('includes the current recipient as an upcoming contribution participant', async () => {
    const recipient = {
      _id: 'user-id-1',
      name: 'Recipient User',
      email: 'recipient@example.com',
    };

    mockGetCurrentUser.mockResolvedValue({
      user: recipient,
      error: null,
    });

    const lean = jest.fn().mockResolvedValue([
      {
        id: 'recipient-pool',
        name: 'Recipient Pool',
        status: PoolStatus.ACTIVE,
        totalAmount: 0,
        contributionAmount: 10,
        frequency: 'weekly',
        currentRound: 1,
        totalRounds: 3,
        startDate: new Date('2026-06-04T12:00:00.000Z'),
        nextPayoutDate: '2026-06-04T12:00:00.000Z',
        memberCount: 3,
        members: [
          {
            id: 1,
            userId: recipient._id,
            name: 'Recipient User',
            email: 'recipient@example.com',
            joinDate: new Date().toISOString(),
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: '2026-06-04T12:00:00.000Z',
          },
          {
            id: 2,
            name: 'Active Member',
            email: 'active@example.com',
            joinDate: new Date().toISOString(),
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: '2026-06-11T12:00:00.000Z',
          },
          {
            id: 3,
            name: 'Upcoming Member',
            email: 'upcoming@example.com',
            joinDate: new Date().toISOString(),
            role: PoolMemberRole.MEMBER,
            position: 3,
            status: PoolMemberStatus.UPCOMING,
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: '2026-06-18T12:00:00.000Z',
          },
        ],
        transactions: [],
        messages: [],
      },
    ]);
    mockPoolFind.mockReturnValue({ lean });

    const response = await GET({} as never);
    const body = await response.json();

    expect(mockPoolFind).toHaveBeenCalledWith({
      status: { $in: [PoolStatus.ACTIVE, PoolStatus.PENDING] },
      members: {
        $elemMatch: {
          email: 'recipient@example.com',
          status: {
            $in: expect.arrayContaining([
              PoolMemberStatus.CURRENT,
              PoolMemberStatus.ACTIVE,
              PoolMemberStatus.UPCOMING,
              PoolMemberStatus.COMPLETED,
            ]),
          },
        },
      },
    });
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({
      poolId: 'recipient-pool',
      poolName: 'Recipient Pool',
      amount: 10,
      recipientName: 'You',
      userPosition: 1,
      recipientPosition: 1,
      isRecipient: true,
      hasContributed: false,
      payoutAmount: 30,
    });
    expect(body.summary).toMatchObject({
      receivingCount: 1,
      totalPools: 1,
    });
  });
});
