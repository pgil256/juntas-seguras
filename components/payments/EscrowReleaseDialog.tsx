'use client';

import React, { useState } from 'react';
import { Lock, Unlock, Loader2, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/payment';
import { usePayments } from '@/lib/hooks/usePayments';

interface EscrowReleaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Transaction;
  poolId: string;
  userId: string;
  onReleaseComplete?: () => void;
}

type ReleaseState = 'initial' | 'processing' | 'success' | 'error';

export function EscrowReleaseDialog({
  isOpen,
  onClose,
  payment,
  poolId,
  userId,
  onReleaseComplete,
}: EscrowReleaseDialogProps) {
  const [releaseState, setReleaseState] = useState<ReleaseState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { releaseEscrowPayment, isReleasing } = usePayments({ userId });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const isReleaseEligible = () => {
    // Check if release date has passed
    if (payment.releaseDate) {
      const releaseDate = new Date(payment.releaseDate);
      const today = new Date();
      return today >= releaseDate;
    }
    return true; // If no release date is set, allow release
  };

  const handleRelease = async () => {
    setReleaseState('processing');
    setErrorMessage('');

    try {
      const result = await releaseEscrowPayment(payment.id, poolId);

      if (result.success) {
        setReleaseState('success');

        // Auto-close after success
        setTimeout(() => {
          handleClose();
          if (onReleaseComplete) {
            onReleaseComplete();
          }
        }, 2000);
      } else {
        setReleaseState('error');
        setErrorMessage(result.error || 'Failed to release payment. Please try again.');
      }
    } catch (error: any) {
      setReleaseState('error');
      setErrorMessage('An unexpected error occurred. Please try again later.');
      console.error('Release error:', error);
    }
  };

  const handleClose = () => {
    setReleaseState('initial');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release Escrowed Payment</DialogTitle>
          <DialogDescription>
            Review and release the payment currently held in escrow.
          </DialogDescription>
        </DialogHeader>

        {releaseState === 'initial' && (
          <>
            <div className="py-4 space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <div className="flex items-center mb-3">
                  <Lock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Payment in Escrow</span>
                </div>
                <p className="text-sm text-blue-700">
                  This payment is currently held in escrow for security. Once released, 
                  the funds will be added to the pool balance and available for distribution.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-500">Member</span>
                  <span className="font-medium">{payment.member}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-500">Payment Date</span>
                  <span className="font-medium">{formatDate(payment.date)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-500">Scheduled Release</span>
                  <span className="font-medium">{formatDate(payment.releaseDate || '')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Payment ID</span>
                  <span className="font-medium text-sm text-gray-600">{payment.id}</span>
                </div>
              </div>

              {!isReleaseEligible() && (
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                    <span className="font-medium text-amber-800">Early Release</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    The scheduled release date has not yet arrived. You can still release 
                    the funds early, but this should only be done if necessary.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleRelease} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Release Funds
              </Button>
            </DialogFooter>
          </>
        )}

        {releaseState === 'processing' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-xl font-medium text-gray-900">Releasing Funds</p>
            <p className="text-gray-500 mt-2">
              Please wait while we process the release...
            </p>
          </div>
        )}

        {releaseState === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <Check className="h-16 w-16 text-green-600" />
            </div>
            <p className="text-xl font-medium text-gray-900">Funds Released!</p>
            <p className="text-gray-500 mt-2">
              The payment has been successfully released from escrow and added to the pool balance.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {releaseState === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <AlertCircle className="h-16 w-16 text-red-600" />
            </div>
            <p className="text-xl font-medium text-gray-900">Release Failed</p>
            <p className="text-red-500 mt-2">{errorMessage}</p>
            <div className="flex space-x-3 mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setReleaseState('initial')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}