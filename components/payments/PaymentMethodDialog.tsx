'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PaymentMethodForm, PaymentMethodFormValues } from './PaymentMethodForm';

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PaymentMethodFormValues) => void;
  initialValues?: Partial<PaymentMethodFormValues>;
  isEditing?: boolean;
}

export function PaymentMethodDialog({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  isEditing = false,
}: PaymentMethodDialogProps) {
  const handleSubmit = (values: PaymentMethodFormValues) => {
    onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Payment Method' : 'Add Payment Method'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your payment information below.'
              : 'Enter your payment details to add a new payment method.'}
          </DialogDescription>
        </DialogHeader>
        
        <PaymentMethodForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isEditing={isEditing}
        />
      </DialogContent>
    </Dialog>
  );
}