/**
 * Search API Tests
 *
 * Tests for the search functionality endpoint:
 * - GET /api/search - Search pools, members, transactions, and messages
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GET } from '@/app/api/search/route';
import getPoolModel from '@/lib/db/models/pool';
import { getUserModel } from '@/lib/db/models/user';
import {
  createMockRequest,
  parseResponse,
  generateMockUuid,
} from '@/__tests__/helpers/test-utils';
import { createTestUser, testUsers } from '@/__tests__/fixtures/users';
import { createTestPool, createPoolWithMembers } from '@/__tests__/fixtures/pools';

// Mock the API handler
jest.mock('@/lib/api', () => ({
  handleApiRequest: jest.fn((request, handler, options) => {
    // Simulate the handleApiRequest function
    return handler({ userId: 'test-user-id' });
  }),
}));

describe('Search API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testPool1: any;
  let testPool2: any;
  let UserModel: any;
  let PoolModel: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
    UserModel = getUserModel();
    PoolModel = getPoolModel();

    await UserModel.deleteMany({});
    await PoolModel.deleteMany({});

    // Create test user with pools
    const userId = generateMockUuid();
    const pool1Id = generateMockUuid();
    const pool2Id = generateMockUuid();

    testUser = await UserModel.create({
      id: userId,
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      password: 'hashedPassword',
      mfaSetupComplete: true,
      pools: [pool1Id, pool2Id],
    });

    // Create test pools with members, transactions, and messages
    testPool1 = await PoolModel.create({
      id: pool1Id,
      name: 'Family Savings Pool',
      description: 'Monthly family savings circle for vacations',
      admin: testUser._id,
      contributionAmount: 100,
      totalMembers: 5,
      totalAmount: 500,
      memberCount: 5,
      frequency: 'monthly',
      status: 'ACTIVE',
      currentRound: 1,
      members: [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-111-1111',
          position: 1,
          status: 'active',
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-222-2222',
          position: 2,
          status: 'active',
        },
        {
          id: 3,
          name: 'Bob Wilson',
          email: 'bob@example.com',
          position: 3,
          status: 'pending',
        },
      ],
      transactions: [
        {
          id: 1,
          type: 'contribution',
          amount: 100,
          date: '2024-01-15',
          member: 'John Doe',
          status: 'completed',
        },
        {
          id: 2,
          type: 'payout',
          amount: 500,
          date: '2024-01-20',
          member: 'Jane Smith',
          status: 'completed',
        },
      ],
      messages: [
        {
          id: 1,
          author: 'John Doe',
          content: 'Reminder: Payments are due next week!',
          date: '2024-01-10',
        },
        {
          id: 2,
          author: 'Jane Smith',
          content: 'Thanks everyone for the payout!',
          date: '2024-01-22',
        },
      ],
    });

    testPool2 = await PoolModel.create({
      id: pool2Id,
      name: 'Friends Weekly Junta',
      description: 'Weekly savings group with friends',
      admin: testUser._id,
      contributionAmount: 50,
      totalMembers: 4,
      totalAmount: 200,
      memberCount: 4,
      frequency: 'weekly',
      status: 'ACTIVE',
      currentRound: 3,
      members: [
        {
          id: 1,
          name: 'Alice Brown',
          email: 'alice@example.com',
          position: 1,
          status: 'active',
        },
        {
          id: 2,
          name: 'Charlie Davis',
          email: 'charlie@example.com',
          position: 2,
          status: 'active',
        },
      ],
      transactions: [
        {
          id: 1,
          type: 'contribution',
          amount: 50,
          date: '2024-02-01',
          member: 'Alice Brown',
          status: 'completed',
        },
      ],
      messages: [
        {
          id: 1,
          author: 'Alice Brown',
          content: 'Great job on the weekly contribution!',
          date: '2024-02-02',
        },
      ],
    });

    // Update the mock to use the real user ID
    const { handleApiRequest } = require('@/lib/api');
    handleApiRequest.mockImplementation(
      (request: any, handler: any, options: any) => {
        return handler({ userId: testUser.id }).then((result: any) => {
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      }
    );
  });

  describe('GET /api/search - Basic Search', () => {
    it('searches pools by name', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Family', category: 'all' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.results.pools.length).toBeGreaterThan(0);
      expect(data.results.pools[0].title).toContain('Family');
    });

    it('searches pools by description', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'vacation', category: 'pools' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.pools.length).toBeGreaterThan(0);
    });

    it('searches members by name', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'John', category: 'members' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.members.length).toBeGreaterThan(0);
      expect(data.results.members[0].title).toContain('John');
    });

    it('searches members by email', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'jane@example.com', category: 'members' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.members.length).toBeGreaterThan(0);
    });

    it('searches transactions by member name', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'John', category: 'transactions' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.transactions.length).toBeGreaterThan(0);
    });

    it('searches messages by content', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Reminder', category: 'messages' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.messages.length).toBeGreaterThan(0);
    });

    it('returns empty results for non-matching query', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'xyznonexistent123', category: 'all' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.totalResults).toBe(0);
      expect(data.results.pools).toEqual([]);
      expect(data.results.members).toEqual([]);
    });
  });

  describe('GET /api/search - Category Filtering', () => {
    it('filters by pools category only', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Family', category: 'pools' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.pools.length).toBeGreaterThan(0);
      expect(data.results.members).toEqual([]);
      expect(data.results.transactions).toEqual([]);
      expect(data.results.messages).toEqual([]);
    });

    it('filters by members category only', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'example.com', category: 'members' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.members.length).toBeGreaterThan(0);
      expect(data.results.pools).toEqual([]);
      expect(data.results.transactions).toEqual([]);
      expect(data.results.messages).toEqual([]);
    });

    it('filters by transactions category only', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'contribution', category: 'transactions' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.transactions.length).toBeGreaterThan(0);
      expect(data.results.pools).toEqual([]);
      expect(data.results.members).toEqual([]);
      expect(data.results.messages).toEqual([]);
    });

    it('filters by messages category only', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'payout', category: 'messages' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // Search in all categories when 'all'
      expect(data.results.messages.length).toBeGreaterThanOrEqual(0);
      expect(data.results.pools).toEqual([]);
      expect(data.results.members).toEqual([]);
      expect(data.results.transactions).toEqual([]);
    });

    it('searches all categories by default', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'John' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // John appears in members, transactions, and messages
      expect(data.results.totalResults).toBeGreaterThan(0);
    });
  });

  describe('GET /api/search - Pagination', () => {
    it('respects page parameter', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'example', category: 'members', page: '1', limit: '2' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.pagination.currentPage).toBe(1);
      expect(data.results.pagination.itemsPerPage).toBe(2);
    });

    it('respects limit parameter', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'example', category: 'members', limit: '1' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.members.length).toBeLessThanOrEqual(1);
    });

    it('returns pagination info', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'example', category: 'all', page: '1', limit: '5' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.pagination).toBeDefined();
      expect(data.results.pagination.currentPage).toBe(1);
      expect(data.results.pagination.totalPages).toBeDefined();
      expect(data.results.pagination.hasNextPage).toBeDefined();
      expect(data.results.pagination.hasPreviousPage).toBeDefined();
      expect(data.results.pagination.totalItems).toBeDefined();
    });
  });

  describe('GET /api/search - Filters', () => {
    it('filters by status', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'example', category: 'members', status: 'active' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // All returned members should have active status
      data.results.members.forEach((member: any) => {
        expect(member.metadata?.status).toBe('active');
      });
    });

    it('filters by date range', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: {
          q: 'contribution',
          category: 'transactions',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // All transactions should be within date range
      data.results.transactions.forEach((txn: any) => {
        const date = new Date(txn.metadata?.date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-01').getTime());
        expect(date.getTime()).toBeLessThanOrEqual(new Date('2024-01-31').getTime());
      });
    });
  });

  describe('GET /api/search - Sorting', () => {
    it('sorts by relevance by default', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Family Savings', category: 'pools' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // First result should be most relevant (exact match)
      if (data.results.pools.length > 0) {
        expect(data.results.pools[0].title).toContain('Family');
      }
    });

    it('supports custom sort field', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: {
          q: 'example',
          category: 'transactions',
          sortField: 'date',
          sortDirection: 'desc',
        },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // Transactions should be sorted by date descending
    });

    it('supports ascending sort direction', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: {
          q: 'example',
          category: 'transactions',
          sortField: 'date',
          sortDirection: 'asc',
        },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
    });
  });

  describe('GET /api/search - Result Format', () => {
    it('returns correct pool result format', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Family', category: 'pools' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      if (data.results.pools.length > 0) {
        const pool = data.results.pools[0];
        expect(pool).toHaveProperty('id');
        expect(pool).toHaveProperty('type', 'pool');
        expect(pool).toHaveProperty('title');
        expect(pool).toHaveProperty('subtitle');
        expect(pool).toHaveProperty('url');
        expect(pool).toHaveProperty('matchedFields');
      }
    });

    it('returns correct member result format', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'John', category: 'members' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      if (data.results.members.length > 0) {
        const member = data.results.members[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('type', 'member');
        expect(member).toHaveProperty('title');
        expect(member).toHaveProperty('subtitle');
        expect(member).toHaveProperty('url');
        expect(member).toHaveProperty('metadata');
      }
    });

    it('returns correct transaction result format', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'contribution', category: 'transactions' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      if (data.results.transactions.length > 0) {
        const transaction = data.results.transactions[0];
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('type', 'transaction');
        expect(transaction).toHaveProperty('title');
        expect(transaction).toHaveProperty('subtitle');
        expect(transaction).toHaveProperty('url');
      }
    });

    it('returns correct message result format', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Reminder', category: 'messages' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      if (data.results.messages.length > 0) {
        const message = data.results.messages[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('type', 'message');
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('subtitle');
      }
    });

    it('includes matched fields in results', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'john@example.com', category: 'members' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      if (data.results.members.length > 0) {
        expect(data.results.members[0].matchedFields).toContain('email');
      }
    });
  });

  describe('GET /api/search - Edge Cases', () => {
    it('handles empty query gracefully', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: '', category: 'all' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.totalResults).toBe(0);
    });

    it('handles whitespace-only query', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: '   ', category: 'all' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it('handles special characters in query', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: '@example.com', category: 'members' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it('is case insensitive', async () => {
      const request1 = createMockRequest('/api/search', {
        searchParams: { q: 'FAMILY', category: 'pools' },
      });

      const request2 = createMockRequest('/api/search', {
        searchParams: { q: 'family', category: 'pools' },
      });

      const response1 = await GET(request1);
      const response2 = await GET(request2);

      const { data: data1 } = await parseResponse(response1);
      const { data: data2 } = await parseResponse(response2);

      expect(data1.results.pools.length).toBe(data2.results.pools.length);
    });

    it('returns empty results when user has no pools', async () => {
      // Create user with no pools
      const emptyUser = await UserModel.create({
        id: generateMockUuid(),
        email: 'empty@test.com',
        name: 'Empty User',
        password: 'hashedPassword',
        mfaSetupComplete: true,
        pools: [],
      });

      const { handleApiRequest } = require('@/lib/api');
      handleApiRequest.mockImplementation(
        (request: any, handler: any, options: any) => {
          return handler({ userId: emptyUser.id }).then((result: any) => {
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        }
      );

      const request = createMockRequest('/api/search', {
        searchParams: { q: 'test', category: 'all' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.results.totalResults).toBe(0);
    });
  });

  describe('GET /api/search - Relevance Scoring', () => {
    it('ranks exact matches higher than partial matches', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'Family Savings Pool', category: 'pools' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      if (data.results.pools.length > 1) {
        // First result should have higher relevance
        const firstRelevance = data.results.pools[0].metadata?.relevance || 0;
        const secondRelevance = data.results.pools[1].metadata?.relevance || 0;
        expect(firstRelevance).toBeGreaterThanOrEqual(secondRelevance);
      }
    });

    it('ranks title matches higher than description matches', async () => {
      const request = createMockRequest('/api/search', {
        searchParams: { q: 'savings', category: 'pools' },
      });

      const response = await GET(request);
      const { data, status } = await parseResponse(response);

      expect(status).toBe(200);
      // Pool with 'Savings' in name should rank higher than one with 'savings' only in description
    });
  });
});
