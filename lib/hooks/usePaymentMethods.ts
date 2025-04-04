import { useState, useEffect } from 'react';
import { PaymentMethod, PaymentMethodFormValues, PaymentMethodResponse } from '@/types/payment';

interface UsePaymentMethodsProps {
  userId: string;
}

interface UsePaymentMethodsReturn {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  addPaymentMethod: (values: PaymentMethodFormValues) => Promise<PaymentMethodResponse>;
  removePaymentMethod: (methodId: number) => Promise<{ success: boolean; error?: string }>;
  refreshPaymentMethods: () => Promise<void>;
}

export function usePaymentMethods({ userId }: UsePaymentMethodsProps): UsePaymentMethodsReturn {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/payments/methods?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment methods');
      }
      
      const data = await response.json();
      setPaymentMethods(data.methods || []);
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      setError(err.message || 'Failed to fetch payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = async (values: PaymentMethodFormValues): Promise<PaymentMethodResponse> => {
    try {
      // Prepare the request payload
      const payload = {
        userId,
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
      const response = await fetch(`/api/payments/methods?id=${methodId}&userId=${userId}`, {
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

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchPaymentMethods();
    }
  }, [userId]);

  return {
    paymentMethods,
    isLoading,
    error,
    addPaymentMethod,
    removePaymentMethod,
    refreshPaymentMethods: fetchPaymentMethods,
  };
}