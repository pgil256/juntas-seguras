'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, Check, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { PaymentDetails } from '../../types/payment';

// Type definitions
interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPaymentMethod: () => void;
  paymentDetails: PaymentDetails;
  userId: string;
  poolId: string;
  onPaymentComplete?: () => void;
}

// Payment processing states
type ProcessingState = 'initial' | 'processing' | 'success' | 'error';

export function PaymentProcessingModal({
  isOpen,
  onClose,
  paymentDetails,
  userId,
  poolId,
  onPaymentComplete,
}: PaymentProcessingModalProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handlePayWithStripe = async () => {
    setProcessingState('processing');

    try {
      // Create checkout session via API
      const response = await fetch(`/api/pools/${poolId}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'initiate' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      setProcessingState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setProcessingState('initial');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Pay your contribution to {paymentDetails.poolName}
          </DialogDescription>
        </DialogHeader>

        {processingState === 'initial' && (
          <div className="py-4 space-y-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(paymentDetails.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Due Date</span>
                <span className="text-sm text-gray-700">
                  {formatDate(paymentDetails.dueDate)}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-4 text-center">
                Click the button below to pay securely with Stripe
              </p>

              <Button
                onClick={handlePayWithStripe}
                className="w-full flex items-center justify-center"
                size="lg"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Pay with Stripe
              </Button>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {processingState === 'processing' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-xl font-medium text-gray-900">Preparing Checkout</p>
            <p className="text-gray-500 mt-2">Please wait while we set up your payment...</p>
          </div>
        )}

        {processingState === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <Check className="h-16 w-16 text-green-600" />
            </div>
            <p className="text-xl font-medium text-gray-900">Payment Successful!</p>
            <p className="text-gray-500 mt-2">
              Your payment has been processed successfully.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {processingState === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <AlertCircle className="h-16 w-16 text-red-600" />
            </div>
            <p className="text-xl font-medium text-gray-900">Payment Failed</p>
            <p className="text-red-500 mt-2">{errorMessage}</p>
            <div className="flex space-x-3 mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setProcessingState('initial')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
