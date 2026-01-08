import { http, HttpResponse } from 'msw';

/**
 * MSW (Mock Service Worker) request handlers
 * Mocks external API calls for frontend tests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Auth API handlers
 */
export const authHandlers = [
  // Login
  http.post(`${API_BASE_URL}/api/auth/callback/credentials`, () => {
    return HttpResponse.json({
      ok: true,
      status: 200,
    });
  }),

  // Register
  http.post(`${API_BASE_URL}/api/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string };
    return HttpResponse.json(
      {
        user: {
          id: 'new-user-id',
          email: body.email,
          name: body.name,
        },
        message: 'Registration successful',
      },
      { status: 201 }
    );
  }),

  // MFA verification
  http.post(`${API_BASE_URL}/api/auth/verify-mfa`, async ({ request }) => {
    const body = await request.json() as { code: string };
    if (body.code === '123456') {
      return HttpResponse.json({
        success: true,
        message: 'MFA verified',
      });
    }
    return HttpResponse.json(
      { error: 'Invalid MFA code' },
      { status: 400 }
    );
  }),

  // Resend MFA
  http.post(`${API_BASE_URL}/api/auth/resend-mfa`, () => {
    return HttpResponse.json({
      success: true,
      message: 'MFA code sent',
    });
  }),

  // Session
  http.get(`${API_BASE_URL}/api/auth/session`, () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }),
];

/**
 * Pool API handlers
 */
export const poolHandlers = [
  // List pools
  http.get(`${API_BASE_URL}/api/pools`, () => {
    return HttpResponse.json({
      pools: [
        {
          _id: 'pool-1',
          name: 'Test Pool 1',
          contributionAmount: 10,
          totalMembers: 5,
          currentRound: 1,
          status: 'ACTIVE',
        },
        {
          _id: 'pool-2',
          name: 'Test Pool 2',
          contributionAmount: 15,
          totalMembers: 4,
          currentRound: 2,
          status: 'ACTIVE',
        },
      ],
    });
  }),

  // Get pool by ID
  http.get(`${API_BASE_URL}/api/pools/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      pool: {
        _id: id,
        name: 'Test Pool',
        contributionAmount: 10,
        totalMembers: 5,
        currentRound: 1,
        status: 'ACTIVE',
        members: [
          {
            userId: 'user-1',
            role: 'ADMIN',
            position: 1,
            contributionStatus: 'pending',
          },
        ],
      },
    });
  }),

  // Create pool
  http.post(`${API_BASE_URL}/api/pools`, async ({ request }) => {
    const body = await request.json() as { name: string; contributionAmount: number };
    return HttpResponse.json(
      {
        pool: {
          _id: 'new-pool-id',
          ...body,
          status: 'ACTIVE',
          currentRound: 1,
        },
        message: 'Pool created successfully',
      },
      { status: 201 }
    );
  }),

  // Pool contributions
  http.post(`${API_BASE_URL}/api/pools/:id/contributions`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Contribution confirmed',
    });
  }),

  // Pool payouts
  http.post(`${API_BASE_URL}/api/pools/:id/payouts`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Payout processed',
      payoutAmount: 50,
    });
  }),
];

/**
 * Payment API handlers
 */
export const paymentHandlers = [
  // Get payment methods
  http.get(`${API_BASE_URL}/api/payments/methods`, () => {
    return HttpResponse.json({
      methods: [
        { type: 'venmo', value: '@testuser', isPrimary: true },
        { type: 'paypal', value: 'test@paypal.com', isPrimary: false },
      ],
    });
  }),

  // Add payment method
  http.post(`${API_BASE_URL}/api/payments/methods`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        method: {
          id: 'new-method-id',
          ...body,
        },
        message: 'Payment method added',
      },
      { status: 201 }
    );
  }),

  // Delete payment method
  http.delete(`${API_BASE_URL}/api/payments/methods`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Payment method deleted',
    });
  }),
];

/**
 * User API handlers
 */
export const userHandlers = [
  // Get user profile
  http.get(`${API_BASE_URL}/api/users/profile`, () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        mfaMethod: 'email',
        mfaSetupComplete: true,
      },
    });
  }),

  // Update user profile
  http.put(`${API_BASE_URL}/api/users/profile`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        ...body,
      },
      message: 'Profile updated',
    });
  }),

  // Get user invitations
  http.get(`${API_BASE_URL}/api/user/invitations`, () => {
    return HttpResponse.json({
      invitations: [],
    });
  }),
];

/**
 * Notification handlers
 */
export const notificationHandlers = [
  http.get(`${API_BASE_URL}/api/notifications`, () => {
    return HttpResponse.json({
      notifications: [],
      unreadCount: 0,
    });
  }),

  http.post(`${API_BASE_URL}/api/notifications`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        notification: {
          id: 'new-notification-id',
          ...body,
        },
      },
      { status: 201 }
    );
  }),
];

/**
 * All handlers combined
 */
export const handlers = [
  ...authHandlers,
  ...poolHandlers,
  ...paymentHandlers,
  ...userHandlers,
  ...notificationHandlers,
];

/**
 * Error response handlers for testing error states
 */
export const errorHandlers = {
  unauthorized: http.all('*', () => {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }),

  forbidden: http.all('*', () => {
    return HttpResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }),

  notFound: http.all('*', () => {
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }),

  serverError: http.all('*', () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),
};
