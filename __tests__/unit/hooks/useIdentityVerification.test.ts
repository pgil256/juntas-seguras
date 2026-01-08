/**
 * Unit tests for lib/hooks/useIdentityVerification.ts
 * Tests the useIdentityVerification hook for identity verification workflows
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdentityVerification } from '@/lib/hooks/useIdentityVerification';
import {
  VerificationStatus,
  VerificationType,
  VerificationMethod,
} from '@/types/identity';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useIdentityVerification', () => {
  const defaultProps = {
    userId: 'user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial loading state while fetching status', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      // Initially loading while checking verification status
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.identityInfo).toBeNull();
    });

    it('should have startVerification, checkVerificationStatus, and completeVerification functions', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      expect(typeof result.current.startVerification).toBe('function');
      expect(typeof result.current.checkVerificationStatus).toBe('function');
      expect(typeof result.current.completeVerification).toBe('function');
    });
  });

  describe('Checking Verification Status', () => {
    it('should fetch verification status on mount', async () => {
      const mockResponse = {
        isVerified: true,
        status: VerificationStatus.VERIFIED,
        verification: {
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
          lastUpdated: '2025-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.identityInfo).toEqual({
        isVerified: true,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationType: VerificationType.GOVERNMENT_ID,
        verificationMethod: VerificationMethod.DOCUMENT_UPLOAD,
        lastUpdated: '2025-01-01T00:00:00Z',
      });
      expect(result.current.error).toBeNull();

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/identity/verification?userId=${defaultProps.userId}`
      );
    });

    it('should not fetch when userId is empty', async () => {
      const { result } = renderHook(() => useIdentityVerification({ userId: '' }));

      // Wait a bit to ensure no fetch is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.identityInfo).toBeNull();
    });

    it('should handle unverified status correctly', async () => {
      const mockResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.identityInfo?.isVerified).toBe(false);
      expect(result.current.identityInfo?.verificationStatus).toBe(VerificationStatus.PENDING);
    });

    it('should handle API error when checking status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User not found' }),
      });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('User not found');
      expect(result.current.identityInfo).toBeNull();
    });

    it('should handle network error when checking status', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.identityInfo).toBeNull();
    });

    it('should handle error without message property', async () => {
      mockFetch.mockRejectedValueOnce({});

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to check verification status');
    });

    it('should manually refresh status with checkVerificationStatus', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      const updatedResponse = {
        isVerified: true,
        status: VerificationStatus.VERIFIED,
        verification: {
          type: VerificationType.PASSPORT,
          method: VerificationMethod.STRIPE_IDENTITY,
          lastUpdated: '2025-01-02T00:00:00Z',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedResponse,
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.identityInfo?.isVerified).toBe(false);
      });

      await act(async () => {
        await result.current.checkVerificationStatus();
      });

      expect(result.current.identityInfo?.isVerified).toBe(true);
      expect(result.current.identityInfo?.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Starting Verification', () => {
    it('should start verification successfully', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      const startResponse = {
        verification: {
          status: VerificationStatus.SUBMITTED,
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
          lastUpdated: '2025-01-01T12:00:00Z',
        },
        verificationUrl: 'https://example.com/verify',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => startResponse,
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.startVerification(
          VerificationType.GOVERNMENT_ID,
          VerificationMethod.DOCUMENT_UPLOAD
        );
      });

      expect(response).toEqual({
        success: true,
        verificationUrl: 'https://example.com/verify',
      });

      expect(result.current.identityInfo).toEqual({
        isVerified: false,
        verificationStatus: VerificationStatus.SUBMITTED,
        verificationType: VerificationType.GOVERNMENT_ID,
        verificationMethod: VerificationMethod.DOCUMENT_UPLOAD,
        lastUpdated: '2025-01-01T12:00:00Z',
      });

      // Verify the POST request
      expect(mockFetch).toHaveBeenCalledWith('/api/identity/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: defaultProps.userId,
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
        }),
      });
    });

    it('should start Stripe Identity verification', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      const startResponse = {
        verification: {
          status: VerificationStatus.SUBMITTED,
          type: VerificationType.PASSPORT,
          method: VerificationMethod.STRIPE_IDENTITY,
          lastUpdated: '2025-01-01T12:00:00Z',
        },
        verificationUrl: 'https://verify.stripe.com/session/123',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => startResponse,
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.startVerification(
          VerificationType.PASSPORT,
          VerificationMethod.STRIPE_IDENTITY
        );
      });

      expect(response?.success).toBe(true);
      expect(response?.verificationUrl).toBe('https://verify.stripe.com/session/123');
      expect(result.current.identityInfo?.verificationMethod).toBe(VerificationMethod.STRIPE_IDENTITY);
    });

    it('should handle start verification API error', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Already has pending verification' }),
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.startVerification(
          VerificationType.GOVERNMENT_ID,
          VerificationMethod.DOCUMENT_UPLOAD
        );
      });

      expect(response).toEqual({
        success: false,
        error: 'Already has pending verification',
      });
      expect(result.current.error).toBe('Already has pending verification');
    });

    it('should handle start verification network error', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockRejectedValueOnce(new Error('Network timeout'));

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.startVerification(
          VerificationType.GOVERNMENT_ID,
          VerificationMethod.DOCUMENT_UPLOAD
        );
      });

      expect(response).toEqual({
        success: false,
        error: 'Network timeout',
      });
      expect(result.current.error).toBe('Network timeout');
    });

    it('should handle error without message property during start', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockRejectedValueOnce({});

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.startVerification(
          VerificationType.GOVERNMENT_ID,
          VerificationMethod.DOCUMENT_UPLOAD
        );
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Failed to start verification process');
    });

    it('should set loading state during start verification', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      let resolveStart: (value: any) => void;
      const startPromise = new Promise((resolve) => {
        resolveStart = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockImplementationOnce(() => startPromise);

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start verification (don't await yet)
      let verificationPromise: Promise<any>;
      act(() => {
        verificationPromise = result.current.startVerification(
          VerificationType.GOVERNMENT_ID,
          VerificationMethod.DOCUMENT_UPLOAD
        );
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveStart!({
          ok: true,
          json: async () => ({
            verification: {
              status: VerificationStatus.SUBMITTED,
              type: VerificationType.GOVERNMENT_ID,
              method: VerificationMethod.DOCUMENT_UPLOAD,
              lastUpdated: '2025-01-01T12:00:00Z',
            },
          }),
        });
        await verificationPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Completing Verification', () => {
    it('should complete verification successfully', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: {
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
          lastUpdated: '2025-01-01T00:00:00Z',
        },
      };

      const completeResponse = {
        success: true,
      };

      const updatedStatusResponse = {
        isVerified: true,
        status: VerificationStatus.VERIFIED,
        verification: {
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
          lastUpdated: '2025-01-01T12:00:00Z',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => completeResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedStatusResponse,
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.completeVerification('verified', 'verification-123');
      });

      expect(response).toEqual({ success: true });

      // Should have called checkVerificationStatus after completion
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify the PATCH request
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/identity/verification/complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: defaultProps.userId,
          status: 'verified',
          verificationId: 'verification-123',
        }),
      });
    });

    it('should complete verification as rejected', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: null,
      };

      const completeResponse = {
        success: true,
      };

      const updatedStatusResponse = {
        isVerified: false,
        status: VerificationStatus.REJECTED,
        verification: {
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
          lastUpdated: '2025-01-01T12:00:00Z',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => completeResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedStatusResponse,
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.completeVerification('rejected', 'verification-123');
      });

      expect(response?.success).toBe(true);

      await waitFor(() => {
        expect(result.current.identityInfo?.verificationStatus).toBe(VerificationStatus.REJECTED);
      });
    });

    it('should complete verification as submitted', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      const completeResponse = {
        success: true,
      };

      const updatedStatusResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: {
          type: VerificationType.GOVERNMENT_ID,
          method: VerificationMethod.DOCUMENT_UPLOAD,
          lastUpdated: '2025-01-01T12:00:00Z',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => completeResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedStatusResponse,
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.completeVerification('submitted', 'verification-123');
      });

      expect(response?.success).toBe(true);
    });

    it('should handle complete verification API error', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Verification not found' }),
        });

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.completeVerification('verified', 'invalid-id');
      });

      expect(response).toEqual({
        success: false,
        error: 'Verification not found',
      });
      expect(result.current.error).toBe('Verification not found');
    });

    it('should handle complete verification network error', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.completeVerification('verified', 'verification-123');
      });

      expect(response).toEqual({
        success: false,
        error: 'Server error',
      });
      expect(result.current.error).toBe('Server error');
    });

    it('should handle error without message property during complete', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockRejectedValueOnce({});

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.completeVerification('verified', 'verification-123');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Failed to complete verification');
    });

    it('should set loading state during complete verification', async () => {
      const initialResponse = {
        isVerified: false,
        status: VerificationStatus.SUBMITTED,
        verification: null,
      };

      let resolveComplete: (value: any) => void;
      const completePromise = new Promise((resolve) => {
        resolveComplete = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialResponse,
        })
        .mockImplementationOnce(() => completePromise);

      const { result } = renderHook(() => useIdentityVerification(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start completion (don't await yet)
      let completionPromise: Promise<any>;
      act(() => {
        completionPromise = result.current.completeVerification('verified', 'verification-123');
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveComplete!({
          ok: true,
          json: async () => ({ success: true }),
        });
        // Mock the status check that happens after completion
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            isVerified: true,
            status: VerificationStatus.VERIFIED,
            verification: null,
          }),
        });
        await completionPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Props Changes', () => {
    it('should re-fetch when userId changes', async () => {
      const response1 = {
        isVerified: true,
        status: VerificationStatus.VERIFIED,
        verification: null,
      };

      const response2 = {
        isVerified: false,
        status: VerificationStatus.PENDING,
        verification: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => response1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => response2,
        });

      const { result, rerender } = renderHook(
        ({ userId }) => useIdentityVerification({ userId }),
        { initialProps: { userId: 'user-1' } }
      );

      await waitFor(() => {
        expect(result.current.identityInfo?.isVerified).toBe(true);
      });

      rerender({ userId: 'user-2' });

      await waitFor(() => {
        expect(result.current.identityInfo?.isVerified).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/identity/verification?userId=user-1'
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/identity/verification?userId=user-2'
      );
    });
  });

  describe('All Verification Types', () => {
    const verificationTypes = [
      VerificationType.GOVERNMENT_ID,
      VerificationType.PASSPORT,
      VerificationType.DRIVERS_LICENSE,
      VerificationType.RESIDENCE_PERMIT,
    ];

    verificationTypes.forEach((type) => {
      it(`should support ${type} verification type`, async () => {
        const initialResponse = {
          isVerified: false,
          status: VerificationStatus.PENDING,
          verification: null,
        };

        const startResponse = {
          verification: {
            status: VerificationStatus.SUBMITTED,
            type: type,
            method: VerificationMethod.DOCUMENT_UPLOAD,
            lastUpdated: '2025-01-01T12:00:00Z',
          },
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => initialResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => startResponse,
          });

        const { result } = renderHook(() => useIdentityVerification(defaultProps));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.startVerification(type, VerificationMethod.DOCUMENT_UPLOAD);
        });

        expect(result.current.identityInfo?.verificationType).toBe(type);
      });
    });
  });

  describe('All Verification Methods', () => {
    const verificationMethods = [
      VerificationMethod.DOCUMENT_UPLOAD,
      VerificationMethod.STRIPE_IDENTITY,
      VerificationMethod.MANUAL_REVIEW,
    ];

    verificationMethods.forEach((method) => {
      it(`should support ${method} verification method`, async () => {
        const initialResponse = {
          isVerified: false,
          status: VerificationStatus.PENDING,
          verification: null,
        };

        const startResponse = {
          verification: {
            status: VerificationStatus.SUBMITTED,
            type: VerificationType.GOVERNMENT_ID,
            method: method,
            lastUpdated: '2025-01-01T12:00:00Z',
          },
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => initialResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => startResponse,
          });

        const { result } = renderHook(() => useIdentityVerification(defaultProps));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.startVerification(VerificationType.GOVERNMENT_ID, method);
        });

        expect(result.current.identityInfo?.verificationMethod).toBe(method);
      });
    });
  });

  describe('All Verification Statuses', () => {
    const verificationStatuses = [
      VerificationStatus.PENDING,
      VerificationStatus.SUBMITTED,
      VerificationStatus.VERIFIED,
      VerificationStatus.REJECTED,
      VerificationStatus.EXPIRED,
    ];

    verificationStatuses.forEach((status) => {
      it(`should handle ${status} verification status`, async () => {
        const mockResponse = {
          isVerified: status === VerificationStatus.VERIFIED,
          status: status,
          verification: {
            type: VerificationType.GOVERNMENT_ID,
            method: VerificationMethod.DOCUMENT_UPLOAD,
            lastUpdated: '2025-01-01T00:00:00Z',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const { result } = renderHook(() => useIdentityVerification(defaultProps));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.identityInfo?.verificationStatus).toBe(status);
        expect(result.current.identityInfo?.isVerified).toBe(
          status === VerificationStatus.VERIFIED
        );
      });
    });
  });
});
