import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PaymentMethod, PaymentMethodFormValues, PaymentMethodResponse } from '../../types/payment';

interface UsePaymentMethodsProps {
  userId?: string;
}

interface UsePaymentMethodsReturn {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  addPaymentMethod: (values: PaymentMethodFormValues) => Promise<PaymentMethodResponse>;
  updatePaymentMethod: (methodId: number, values: PaymentMethodFormValues) => Promise<PaymentMethodResponse>;
  removePaymentMethod: (methodId: number) => Promise<{ success: boolean; error?: string }>;
  setDefaultPaymentMethod: (methodId: number) => Promise<{ success: boolean; error?: string }>;
  refreshPaymentMethods: () => Promise<void>;
}

export function usePaymentMethods(props?: UsePaymentMethodsProps): UsePaymentMethodsReturn {
  const userId = props?.userId;
  const { data: session } = useSession();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the user ID or get it from the session
      const effectiveUserId = userId || session?.user?.id;

      if (!effectiveUserId) {
        setPaymentMethods([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/payments/methods?userId=${effectiveUserId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment methods');
      }
      
      const data = await response.json();
      setPaymentMethods(data.methods || []);
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      setError(err.message || 'Failed to fetch payment methods');
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, session]);

  const addPaymentMethod = async (values: PaymentMethodFormValues): Promise<PaymentMethodResponse> => {
    try {
      // Use the user ID or get it from the session
      const effectiveUserId = userId || session?.user?.id;

      if (!effectiveUserId) {
        return {
          success: false,
          error: 'You must be logged in to add a payment method',
        };
      }

      // Prepare the request payload
      const payload = {
        userId: effectiveUserId,
        ...values,
      };
      
      const response = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add payment method');
      }
      
      // Refresh the payment methods list
      await fetchPaymentMethods();
      
      return {
        success: true,
        method: data.method,
      };
    } catch (err: any) {
      console.error('Error adding payment method:', err);
      return {
        success: false,
        error: err.message || 'Failed to add payment method',
      };
    }
  };

  const removePaymentMethod = async (methodId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const effectiveUserId = userId || session?.user?.id;

      if (!effectiveUserId) {
        return {
          success: false,
          error: 'You must be logged in to remove a payment method',
        };
      }

      const response = await fetch(`/api/payments/methods?id=${methodId}&userId=${effectiveUserId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove payment method');
      }
      
      // Refresh the payment methods list
      await fetchPaymentMethods();
      
      return { success: true };
    } catch (err: any) {
      console.error('Error removing payment method:', err);
      return {
        success: false,
        error: err.message || 'Failed to remove payment method',
      };
    }
  };
  
  const updatePaymentMethod = async (methodId: number, values: PaymentMethodFormValues): Promise<PaymentMethodResponse> => {
    try {
      const effectiveUserId = userId || session?.user?.id;

      if (!effectiveUserId) {
        return {
          success: false,
          error: 'You must be logged in to update a payment method',
        };
      }

      // API call to update payment method
      const response = await fetch(`/api/payments/methods/${methodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: effectiveUserId,
          ...values,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment method');
      }
      
      // Refresh the payment methods list
      await fetchPaymentMethods();
      
      return {
        success: true,
        method: data.method,
      };
    } catch (err: any) {
      console.error('Error updating payment method:', err);
      return {
        success: false,
        error: err.message || 'Failed to update payment method',
      };
    }
  };
  
  const setDefaultPaymentMethod = async (methodId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const effectiveUserId = userId || session?.user?.id;

      if (!effectiveUserId) {
        return {
          success: false,
          error: 'You must be logged in to set a default payment method',
        };
      }

      // API call to set default payment method
      const response = await fetch(`/api/payments/methods/${methodId}/default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: effectiveUserId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set default payment method');
      }
      
      // Refresh the payment methods list
      await fetchPaymentMethods();
      
      return { success: true };
    } catch (err: any) {
      console.error('Error setting default payment method:', err);
      return {
        success: false,
        error: err.message || 'Failed to set default payment method',
      };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    paymentMethods,
    isLoading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    refreshPaymentMethods: fetchPaymentMethods,
  };
}