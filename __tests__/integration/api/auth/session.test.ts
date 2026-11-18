/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST as refreshSession } from '@/app/api/auth/force-refresh/route';
import { POST as updateSession } from '@/app/api/auth/session-update/route';
import { getCurrentUser } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn() }));

const currentUser = getCurrentUser as jest.Mock;
const request = (path: string) => new NextRequest('http://localhost/api/auth/' + path, { method: 'POST' });

describe('Session refresh', () => {
  beforeEach(() => currentUser.mockReset());

  it('tells the client to refresh its session', async () => {
    const response = await refreshSession(request('force-refresh'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: expect.stringContaining('update()'),
    });
  });

  it('requires a signed-in user', async () => {
    currentUser.mockResolvedValue({ user: null, error: { status: 401, message: 'Not authenticated' } });
    const response = await updateSession(request('session-update'));
    expect(response.status).toBe(401);
  });

  it('preserves a pending verification until the verification service completes it', async () => {
    const user = Object.freeze({ pendingMfaVerification: true });
    currentUser.mockResolvedValue({ user, error: null });
    const response = await updateSession(request('session-update'));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Verification is still pending' });
  });

  it('confirms the session refresh once verification is complete', async () => {
    currentUser.mockResolvedValue({ user: { pendingMfaVerification: false }, error: null });
    const response = await updateSession(request('session-update'));
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
  });
});
