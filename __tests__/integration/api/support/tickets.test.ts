/**
 * Support Tickets API Integration Tests
 *
 * Tests for the support ticket endpoints:
 * - GET /api/support/tickets - List tickets
 * - POST /api/support/tickets - Create a new ticket
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/support/tickets/route';

import { getServerSession } from 'next-auth';
import { setupTestDb, clearTestDb, teardownTestDb } from '../../../helpers/db.helpers';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/db/connect', () => ({ __esModule: true, default: jest.fn() }));

describe('Support Tickets API', () => {
  const session = jest.mocked(getServerSession);
  const previousAdminEmails = process.env.ADMIN_EMAILS;

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = 'support-staff@example.test';
    await setupTestDb();
  });
  beforeEach(async () => {
    session.mockResolvedValue(null);
    await clearTestDb();
  });
  afterAll(async () => {
    if (previousAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousAdminEmails;
    await teardownTestDb();
  });

  // Helper to create a ticket and return its data
  async function createTicket(overrides: Record<string, unknown> = {}) {
    const body = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message',
      ...overrides,
    };

    const request = new NextRequest('http://localhost:3000/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    return response.json();
  }

  // -- GET Tests --

  describe('GET /api/support/tickets', () => {
    it('should return tickets for an authenticated user', async () => {
      const userId = `user-get-${Date.now()}`;

      session.mockResolvedValue({ user: { id: userId, email: 'test@example.com' } });
      // Create a ticket for this user
      await createTicket({
        userId,
        subject: 'Pool Help',
        category: 'pool',
      });

      // Fetch the user's tickets
      const url = new URL('http://localhost:3000/api/support/tickets');
      url.searchParams.set('userId', userId);

      const getRequest = new NextRequest(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await GET(getRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tickets).toBeDefined();
      expect(Array.isArray(data.tickets)).toBe(true);
      expect(data.tickets.length).toBeGreaterThanOrEqual(1);

      const userTicket = data.tickets.find((t: any) => t.userId === userId);
      expect(userTicket).toBeDefined();
      expect(userTicket.subject).toBe('Pool Help');
    });

    it('should require authorization to access tickets', async () => {
      // This request has no signed-in user.
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
    });

    it('should return 404 for non-existent ticket ID', async () => {
      const url = new URL('http://localhost:3000/api/support/tickets');
      url.searchParams.set('ticketId', 'TKT-NONEXISTENT');
      url.searchParams.set('userId', 'some-user');

      const request = new NextRequest(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Ticket not found');
    });

    it('should return all tickets for admin users', async () => {
      await createTicket({ name: 'User A', email: 'a@example.test' });
      await createTicket({ name: 'User B', email: 'b@example.test' });

      session.mockResolvedValue({ user: { id: 'support-staff', email: 'support-staff@example.test' } });
      const request = new NextRequest('http://localhost:3000/api/support/tickets');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tickets).toBeDefined();
      expect(data.tickets.length).toBeGreaterThanOrEqual(2);
      expect(data.supportStaff).toBeDefined();
    });
  });

  // -- POST Tests --

  describe('POST /api/support/tickets', () => {
    it('should create a new support ticket', async () => {
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-create-test',
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'Payment issue',
          message: 'My payment did not go through for this month.',
          category: 'payment',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ticketId).toBeDefined();
      expect(data.ticketId).toMatch(/^TKT-/);
      expect(data.ticket).toBeDefined();
      expect(data.ticket.subject).toBe('Payment issue');
      expect(data.ticket.status).toBe('open');
      expect(data.ticket.category).toBe('payment');
      expect(data.ticket.priority).toBe('high');
      expect(data.ticket.userEmail).toBe('jane@example.com');
    });

    it('should validate required fields (name, email, message)', async () => {
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          // Missing name, email, and message
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bad Email',
          email: 'not-an-email',
          message: 'Some message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('should use default subject when not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Default Subject User',
          email: 'default@example.com',
          message: 'I have a general question.',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticket.subject).toBe('Support Request');
    });

    it('should allow creating ticket without userId (anonymous)', async () => {
      const request = new NextRequest('http://localhost:3000/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Anonymous User',
          email: 'anon@example.com',
          message: 'Question about the platform.',
          category: 'general',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ticket.userId).toBeUndefined();
      expect(data.ticket.userName).toBe('Anonymous User');
    });
  });
});
