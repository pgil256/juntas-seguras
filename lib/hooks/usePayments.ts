import { useState } from 'react';
import { 
  Transaction, 
  TransactionStatus, 
  PaymentProcessRequest, 
  PaymentProcessResponse 
} from '@/types/payment';

interface UsePaymentsProps {
  userId: string;
}

interface UsePaymentsReturn {
  processPayment: (
    poolId: string,
    amount: number,
    paymentMethodId: number,
    scheduleForLater: boolean,
    scheduledDate?: string
  ) => Promise<PaymentProcessResponse>;
  isProcessing: boolean;
}

export function usePayments({ userId }: UsePaymentsProps): UsePaymentsReturn {
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = async (
    poolId: string,
    amount: number,
    paymentMethodId: number,
    scheduleForLater: boolean,
    scheduledDate?: string
  ): Promise<PaymentProcessResponse> => {
    setIsProcessing(true);
    
    try {
      const payload: PaymentProcessRequest = {
        userId,
        poolId,
        amount,
        paymentMethodId,
        scheduleForLater,
        scheduledDate: scheduleForLater ? scheduledDate : undefined,
      };
      
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment processing failed');
      }
      
      return {
        success: true,
        payment: data.payment,
        message: data.message,
      };
    } catch (err: any) {
      console.error('Error processing payment:', err);
      return {
        success: false,
        error: err.message || 'Payment processing failed',
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processPayment,
    isProcessing,
  };
}