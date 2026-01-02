'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { PayPalButton } from './PayPalButton';
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

  const handlePaymentSuccess = () => {
    setProcessingState('success');

    // Auto-close after success
    setTimeout(() => {
      handleClose();
      if (onPaymentComplete) {
        onPaymentComplete();
      }
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setProcessingState('error');
    setErrorMessage(error);
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
                Click the PayPal button below to pay securely with your PayPal account
              </p>

              <PayPalButton
                amount={paymentDetails.amount}
                currency="USD"
                description={`Contribution to ${paymentDetails.poolName}`}
                poolId={poolId}
                userId={userId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={() => {
                  // User cancelled - stay on the form
                }}
              />
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
            <p className="text-xl font-medium text-gray-900">Processing Payment</p>
            <p className="text-gray-500 mt-2">Please wait while we process your payment...</p>
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
