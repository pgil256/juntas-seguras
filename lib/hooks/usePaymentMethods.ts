import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PaymentMethod, PaymentMethodFormValues, PaymentMethodResponse } from '@/types/payment';

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

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the user ID or get it from the session
      const effectiveUserId = userId || session?.user?.id;
      
      // For demo purposes, set some dummy payment methods if no real ones exist
      if (!effectiveUserId) {
        // Mock data for demo
        setPaymentMethods([
          {
            id: 1,
            type: "bank",
            name: "Chase Bank",
            last4: "4567",
            isDefault: true,
          },
          {
            id: 2,
            type: "card",
            name: "Visa",
            last4: "8901",
            isDefault: false,
          },
        ]);
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
      
      // Fallback to mock data for demo
      setPaymentMethods([
        {
          id: 1,
          type: "bank",
          name: "Chase Bank",
          last4: "4567",
          isDefault: true,
        },
        {
          id: 2,
          type: "card",
          name: "Visa",
          last4: "8901",
          isDefault: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = async (values: PaymentMethodFormValues): Promise<PaymentMethodResponse> => {
    try {
      // Use the user ID or get it from the session
      const effectiveUserId = userId || session?.user?.id;
      
      // In demo mode, create a mock response
      if (!effectiveUserId) {
        // Generate a new ID (simulating a DB insert)
        const newId = Math.max(...paymentMethods.map(m => m.id), 0) + 1;
        
        // Create a mock method based on the form values
        const newMethod = {
          id: newId,
          type: values.type,
          name: values.type === 'card' ? `${values.cardholderName}'s Card` : `${values.accountHolderName}'s Bank`,
          last4: values.type === 'card' 
            ? values.cardNumber?.slice(-4) || '****'
            : values.accountNumber?.slice(-4) || '****',
          isDefault: values.isDefault,
        };
        
        // If this method is default, update other methods
        const updatedMethods = [...paymentMethods];
        if (values.isDefault) {
          updatedMethods.forEach(method => method.isDefault = false);
        }
        
        // Add the new method
        setPaymentMethods([...updatedMethods, newMethod]);
        
        return {
          success: true,
          method: newMethod
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
      
      // In demo mode, remove the method from local state
      if (!effectiveUserId) {
        const methodToRemove = paymentMethods.find(m => m.id === methodId);
        
        // Filter out the method to remove
        let updatedMethods = paymentMethods.filter(method => method.id !== methodId);
        
        // If the removed method was default, set the first remaining method as default
        if (methodToRemove?.isDefault && updatedMethods.length > 0) {
          updatedMethods = [
            { ...updatedMethods[0], isDefault: true },
            ...updatedMethods.slice(1)
          ];
        }
        
        setPaymentMethods(updatedMethods);
        return { success: true };
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
      
      // In demo mode, update the method in local state
      if (!effectiveUserId) {
        // Update existing payment method
        const updatedMethods = paymentMethods.map(method => {
          if (method.id === methodId) {
            const last4 = values.type === 'card' 
              ? values.cardNumber?.slice(-4) || method.last4
              : values.accountNumber?.slice(-4) || method.last4;
              
            return {
              ...method,
              type: values.type,
              name: values.type === 'card' ? `${values.cardholderName}'s Card` : `${values.accountHolderName}'s Bank`,
              last4,
              isDefault: values.isDefault,
            };
          }
          
          // If the edited method is now default, ensure others are not default
          return values.isDefault ? { ...method, isDefault: false } : method;
        });
        
        setPaymentMethods(updatedMethods);
        const updatedMethod = updatedMethods.find(m => m.id === methodId);
        
        return { 
          success: true,
          method: updatedMethod!
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
      
      // In demo mode, set the default method in local state
      if (!effectiveUserId) {
        const updatedMethods = paymentMethods.map(method => ({
          ...method,
          isDefault: method.id === methodId
        }));
        
        setPaymentMethods(updatedMethods);
        return { success: true };
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
  }, [userId, session]);

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