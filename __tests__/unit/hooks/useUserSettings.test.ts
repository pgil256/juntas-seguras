/**
 * Unit tests for lib/hooks/useUserSettings.ts
 * Tests the user settings fetching and updating functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useUserSettings } from '@/lib/hooks/useUserSettings';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useUserSettings', () => {
  const mockSettings = {
    id: 'settings-123',
    language: 'en',
    timezone: 'America/New_York',
    securitySettings: {
      twoFactorAuth: true,
      lastPasswordChange: '2024-01-15T00:00:00.000Z',
    },
    notificationPreferences: {
      email: {
        paymentReminders: true,
        poolUpdates: true,
        memberActivity: false,
        marketing: false,
      },
      push: {
        paymentReminders: true,
        poolUpdates: false,
        memberActivity: false,
        marketing: false,
      },
    },
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

      const { result } = renderHook(() => useUserSettings());

      expect(result.current.settings).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.settings).toBeNull();
    });

    it('should not fetch while auth is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      renderHook(() => useUserSettings());

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

    it('should fetch settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/users/settings');
    });

    it('should call onSuccess callback when settings are fetched', async () => {
      const onSuccess = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      renderHook(() => useUserSettings({ onSuccess }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockSettings);
      });
    });

    it('should update settings successfully', async () => {
      const updatedSettings = { ...mockSettings, language: 'es' };

      // First call for initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Setup update response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSettings,
      } as Response);

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateSettings({ language: 'es' });
      });

      expect(updateResult!.success).toBe(true);
      expect(result.current.settings).toEqual(updatedSettings);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'es' }),
      });
    });

    it('should update notification preferences', async () => {
      const updatedSettings = {
        ...mockSettings,
        notificationPreferences: {
          ...mockSettings.notificationPreferences,
          email: {
            ...mockSettings.notificationPreferences.email,
            marketing: true,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSettings,
      } as Response);

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateSettings({
          notificationPreferences: updatedSettings.notificationPreferences,
        });
      });

      expect(updateResult!.success).toBe(true);
      expect(result.current.settings?.notificationPreferences.email.marketing).toBe(true);
    });

    it('should refresh settings data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refreshSettings();
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

    it('should handle fetch settings error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Settings not found' }),
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Settings not found');
      expect(result.current.settings).toBeNull();
    });

    it('should call onError callback when fetch fails', async () => {
      const onError = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      renderHook(() => useUserSettings({ onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Server error');
      });
    });

    it('should handle network error during fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should handle update settings error', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid timezone' }),
      } as Response);

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateSettings({ timezone: 'Invalid/Zone' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Invalid timezone');
    });

    it('should handle network error during update', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update network error
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateSettings({ language: 'fr' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Connection failed');
    });

    it('should use default error message when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useUserSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch settings');
    });
  });

  describe('Return Value Types', () => {
    it('should expose all expected properties and methods', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useUserSettings());

      expect(result.current).toHaveProperty('settings');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('updateSettings');
      expect(result.current).toHaveProperty('refreshSettings');
      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.refreshSettings).toBe('function');
    });
  });
});
