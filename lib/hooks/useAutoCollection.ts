'use client';

/**
 * useAutoCollection Hook
 *
 * Provides methods and state for managing auto-collection payment setup.
 */

import { useState, useCallback } from 'react';

interface PaymentSetupInfo {
  id: string;
  poolId: string;
  poolName: string;
  paymentMethodType: string;
  last4: string;
  brand?: string;
  status: 'active' | 'cancelled' | 'requires_update' | 'paused';
  contributionAmount: number;
  lastUsedAt?: string;
  lastSuccessAt?: string;
  lastFailedAt?: string;
  consecutiveFailures: number;
  totalSuccessfulCharges: number;
}

interface UpcomingCollection {
  collectionId: string;
  poolId: string;
  round: number;
  amount: number;
  dueDate: string;
  collectionEligibleAt: string;
  status: string;
  gracePeriodHours: number;
}

interface UseAutoCollectionReturn {
  paymentSetups: PaymentSetupInfo[];
  upcomingCollections: UpcomingCollection[];
  isLoading: boolean;
  error: string | null;
  fetchPaymentSetups: (userId: string) => Promise<void>;
  fetchPoolCollections: (poolId: string) => Promise<void>;
  removePaymentMethod: (userId: string, poolId: string, paymentMethodId?: string) => Promise<boolean>;
  createSetupIntent: (poolId: string) => Promise<{
    clientSecret: string;
    setupIntentId: string;
  } | null>;
  confirmSetup: (setupIntentId: string, poolId: string, consentText: string) => Promise<boolean>;
}

export function useAutoCollection(): UseAutoCollectionReturn {
  const [paymentSetups, setPaymentSetups] = useState<PaymentSetupInfo[]>([]);
  const [upcomingCollections, setUpcomingCollections] = useState<UpcomingCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all payment setups for a user
   */
  const fetchPaymentSetups = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/payment-methods`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      setPaymentSetups(data.paymentSetups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch collections for a specific pool
   */
  const fetchPoolCollections = useCallback(async (poolId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/collections?days=30`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch collections');
      }

      setUpcomingCollections(
        (data.collections || []).filter(
          (c: UpcomingCollection) => c.status === 'scheduled' || c.status === 'pending'
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove a payment method
   */
  const removePaymentMethod = useCallback(async (
    userId: string,
    poolId: string,
    paymentMethodId?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ poolId });
      if (paymentMethodId) {
        params.append('paymentMethodId', paymentMethodId);
      }

      const response = await fetch(
        `/api/users/${userId}/payment-methods?${params.toString()}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove payment method');
      }

      // Refresh payment setups
      await fetchPaymentSetups(userId);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPaymentSetups]);

  /**
   * Create a Setup Intent for saving a new payment method
   */
  const createSetupIntent = useCallback(async (poolId: string): Promise<{
    clientSecret: string;
    setupIntentId: string;
  } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create setup intent');
      }

      return {
        clientSecret: data.clientSecret,
        setupIntentId: data.setupIntentId,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Confirm a Setup Intent after payment method is collected
   */
  const confirmSetup = useCallback(async (
    setupIntentId: string,
    poolId: string,
    consentText: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId, poolId, consentText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm setup');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    paymentSetups,
    upcomingCollections,
    isLoading,
    error,
    fetchPaymentSetups,
    fetchPoolCollections,
    removePaymentMethod,
    createSetupIntent,
    confirmSetup,
  };
}

export default useAutoCollection;
