/**
 * Unit tests for lib/hooks/useUserProfile.ts
 * Tests the user profile fetching and updating functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/lib/hooks/useUserProfile';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useUserProfile', () => {
  const mockProfile = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-06-01T12:00:00.000Z',
    avatar: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should return initial loading state when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-123', email: 'john@example.com' }, expires: '' },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useUserProfile());

      expect(result.current.profile).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.profile).toBeNull();
    });

    it('should not fetch while auth is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      renderHook(() => useUserProfile());

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Successful API Operations', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-123', email: 'john@example.com' }, expires: '' },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should fetch profile successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/users/profile');
    });

    it('should call onSuccess callback when profile is fetched', async () => {
      const onSuccess = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      renderHook(() => useUserProfile({ onSuccess }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockProfile);
      });
    });

    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, name: 'Jane Doe' };

      // First call for initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Setup update response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedProfile,
      } as Response);

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ name: 'Jane Doe' });
      });

      expect(updateResult!.success).toBe(true);
      expect(result.current.profile).toEqual(updatedProfile);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Jane Doe' }),
      });
    });

    it('should refresh profile data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refreshProfile();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-123', email: 'john@example.com' }, expires: '' },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should handle fetch profile error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Profile not found' }),
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Profile not found');
      expect(result.current.profile).toBeNull();
    });

    it('should call onError callback when fetch fails', async () => {
      const onError = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      renderHook(() => useUserProfile({ onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Server error');
      });
    });

    it('should handle network error during fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should handle update profile error', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation error' }),
      } as Response);

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ name: '' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Validation error');
    });

    it('should handle network error during update', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update network error
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ name: 'Test' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Connection failed');
    });

    it('should use default error message when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch profile');
    });
  });

  describe('Return Value Types', () => {
    it('should expose all expected properties and methods', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserProfile());

      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('updateProfile');
      expect(result.current).toHaveProperty('refreshProfile');
      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.refreshProfile).toBe('function');
    });
  });
});
