'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PaymentMethodForm, PaymentMethodFormValues } from './PaymentMethodForm';
import MfaProtection from '@/components/security/MfaProtection';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  const [mfaVerified, setMfaVerified] = useState(false);
  const [formValues, setFormValues] = useState<PaymentMethodFormValues | null>(null);

  const handleFormSubmit = (values: PaymentMethodFormValues) => {
    // Store form values but don't submit yet - require MFA verification first
    setFormValues(values);
  };

  const handleMfaVerified = () => {
    // MFA verification successful, now submit the form
    setMfaVerified(true);
    if (formValues) {
      onSubmit(formValues);
      onClose();
    }
  };

  const handleDialogClose = () => {
    // Reset state when dialog closes
    setMfaVerified(false);
    setFormValues(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
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
        
        {formValues ? (
          // Show MFA verification when form is submitted
          <MfaProtection
            actionName={isEditing ? "update payment method" : "add payment method"}
            description="For your security, we require two-factor authentication to modify payment information."
            onVerified={handleMfaVerified}
            onCancel={() => setFormValues(null)}
          >
            <div className="p-4 border rounded-md bg-blue-50 text-blue-800 cursor-pointer">
              <p className="font-medium">Security Verification Required</p>
              <p className="text-sm text-blue-700">
                Click here to verify your identity with two-factor authentication
              </p>
            </div>
          </MfaProtection>
        ) : (
          // Show the form initially
          <PaymentMethodForm
            initialValues={initialValues}
            onSubmit={handleFormSubmit}
            onCancel={handleDialogClose}
            isEditing={isEditing}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}