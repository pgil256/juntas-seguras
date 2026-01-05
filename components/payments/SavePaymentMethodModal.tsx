'use client';

/**
 * SavePaymentMethodModal Component
 *
 * Informational modal explaining that contributions are collected manually
 * (not through automatic Stripe payments).
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, DollarSign, Users, Calendar } from 'lucide-react';

interface SavePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  poolId: string;
  poolName: string;
  contributionAmount: number;
  frequency: string;
}

/**
 * Main modal component - explains manual payment process
 */
export function SavePaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
  poolId,
  poolName,
  contributionAmount,
  frequency,
}: SavePaymentMethodModalProps) {
  const handleClose = () => {
    onClose();
  };

  const handleConfirm = () => {
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Information
          </DialogTitle>
          <DialogDescription>
            How contributions work in {poolName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Payment Details</h4>
            <p className="text-sm text-muted-foreground mb-1">
              Pool: <span className="font-medium text-foreground">{poolName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Contribution: <span className="font-medium text-foreground">${contributionAmount}</span> {frequency}
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Contributions in this pool are collected manually. The pool admin will coordinate
              payment collection through your preferred payment method (Venmo, PayPal, Zelle, etc.).
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">When to pay</p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll receive a reminder before each contribution is due.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">How to pay</p>
                <p className="text-sm text-muted-foreground">
                  Contact the pool admin to arrange payment through Venmo, PayPal, Zelle, Cash App, or other methods.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SavePaymentMethodModal;
