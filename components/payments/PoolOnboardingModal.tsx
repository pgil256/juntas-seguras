'use client';

/**
 * PoolOnboardingModal Component
 *
 * Onboarding modal for pool members that includes:
 * 1. Payout method setup (Venmo, PayPal, Zelle, CashApp for receiving payouts)
 *
 * Note: Payment collection is handled manually (no Stripe integration)
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { StepIndicator } from '@/components/ui/step-indicator';
import {
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { PayoutMethodForm } from './PayoutMethodForm';
import { PaymentMethodType } from '@/types/pool';

interface PoolOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  poolId: string;
  poolName: string;
  contributionAmount: number;
  frequency: string;
  allowedPaymentMethods?: PaymentMethodType[];
}

type OnboardingStep = 'payout' | 'complete';

/**
 * Main onboarding modal component
 */
export function PoolOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  poolId,
  poolName,
  contributionAmount,
  frequency,
  allowedPaymentMethods,
}: PoolOnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>('payout');

  const handlePayoutSuccess = () => {
    setStep('complete');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handlePayoutSkip = () => {
    setStep('complete');
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  const handleClose = () => {
    // Reset state
    setStep('payout');
    onClose();
  };

  const getCurrentStepNumber = () => {
    switch (step) {
      case 'payout':
        return 1;
      case 'complete':
        return 2;
      default:
        return 1;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'payout':
        return 'How Will You Receive Payouts?';
      case 'complete':
        return 'All Set!';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'payout':
        return 'Tell us where to send your payout when it\'s your turn.';
      case 'complete':
        return 'You\'re ready to participate in the pool.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'payout' && <Wallet className="h-5 w-5" />}
            {step === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        <StepIndicator
          currentStep={getCurrentStepNumber()}
          totalSteps={2}
          showStepText
          steps={[
            { label: "Payout Setup" },
            { label: "Complete" },
          ]}
        />

        <div className="py-2">
          {step === 'complete' ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Welcome to {poolName}!</h3>
              <p className="text-sm text-muted-foreground">
                Your setup is complete. You&apos;re ready to participate in the pool.
              </p>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  Contribution: <span className="font-medium">${contributionAmount}</span> {frequency}
                </p>
              </div>
            </div>
          ) : (
            <PayoutMethodForm
              onSuccess={handlePayoutSuccess}
              onSkip={handlePayoutSkip}
              allowedMethods={allowedPaymentMethods}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PoolOnboardingModal;
