/**
 * Unit tests for lib/hooks/useUserId.ts
 * Tests the user ID extraction from session functionality
 */

import { renderHook } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useUserId, useCurrentUserId } from '@/lib/hooks/useUserId';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('useUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return null when no session exists', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBeNull();
    });

    it('should return null when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBeNull();
    });
  });

  describe('Successful Operations', () => {
    it('should return user ID when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', email: 'john@example.com', name: 'John Doe' },
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBe('user-123');
    });

    it('should return different user IDs for different sessions', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-456', email: 'jane@example.com', name: 'Jane Doe' },
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBe('user-456');
    });

    it('should update when session changes', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', email: 'john@example.com' },
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useUserId());
      expect(result.current).toBe('user-123');

      // Change session
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-789', email: 'new@example.com' },
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      rerender();
      expect(result.current).toBe('user-789');
    });
  });

  describe('Edge Cases', () => {
    it('should return null when user object is missing', () => {
      mockUseSession.mockReturnValue({
        data: { expires: '2025-01-01T00:00:00.000Z' } as any,
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBeNull();
    });

    it('should return null when user id is missing', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: 'john@example.com', name: 'John Doe' } as any,
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBeNull();
    });

    it('should return null when user id is empty string', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '', email: 'john@example.com' },
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserId());

      expect(result.current).toBeNull();
    });

    it('should return null when session transitions from authenticated to unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', email: 'john@example.com' },
          expires: '2025-01-01T00:00:00.000Z',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useUserId());
      expect(result.current).toBe('user-123');

      // Session expires
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      rerender();
      expect(result.current).toBeNull();
    });
  });
});

describe('useCurrentUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return same value as useUserId (alias)', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-123', email: 'john@example.com' },
        expires: '2025-01-01T00:00:00.000Z',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    const { result: result1 } = renderHook(() => useUserId());
    const { result: result2 } = renderHook(() => useCurrentUserId());

    expect(result1.current).toBe(result2.current);
    expect(result2.current).toBe('user-123');
  });

  it('should return null when unauthenticated (same as useUserId)', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result: result1 } = renderHook(() => useUserId());
    const { result: result2 } = renderHook(() => useCurrentUserId());

    expect(result1.current).toBeNull();
    expect(result2.current).toBeNull();
  });
});
