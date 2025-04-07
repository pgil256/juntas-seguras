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
    scheduledDate?: string,
    useEscrow?: boolean,
    escrowReleaseDate?: string
  ) => Promise<PaymentProcessResponse>;
  releaseEscrowPayment: (
    paymentId: string,
    poolId: string,
  ) => Promise<{
    success: boolean;
    payment?: Transaction;
    message?: string;
    error?: string;
  }>;
  isProcessing: boolean;
  isReleasing: boolean;
}

export function usePayments({ userId }: UsePaymentsProps): UsePaymentsReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const processPayment = async (
    poolId: string,
    amount: number,
    paymentMethodId: number,
    scheduleForLater: boolean,
    scheduledDate?: string,
    useEscrow: boolean = false,
    escrowReleaseDate?: string
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
        useEscrow,
        escrowReleaseDate: useEscrow ? escrowReleaseDate : undefined,
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

  const releaseEscrowPayment = async (
    paymentId: string,
    poolId: string,
  ) => {
    setIsReleasing(true);
    
    try {
      const payload = {
        paymentId,
        userId,
        poolId,
        releaseNow: true
      };
      
      const response = await fetch('/api/payments/escrow/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to release payment from escrow');
      }
      
      return {
        success: true,
        payment: data.payment,
        message: data.message,
      };
    } catch (err: any) {
      console.error('Error releasing payment from escrow:', err);
      return {
        success: false,
        error: err.message || 'Failed to release payment from escrow',
      };
    } finally {
      setIsReleasing(false);
    }
  };

  return {
    processPayment,
    releaseEscrowPayment,
    isProcessing,
    isReleasing,
  };
}