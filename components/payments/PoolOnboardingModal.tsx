'use client';

/**
 * PoolOnboardingModal Component
 *
 * Complete onboarding modal for pool members that includes:
 * 1. Payment method setup (for making contributions via Stripe)
 * 2. Payout method setup (Venmo, PayPal, Zelle, CashApp for receiving payouts)
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { PayoutMethodForm } from './PayoutMethodForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PoolOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  poolId: string;
  poolName: string;
  contributionAmount: number;
  frequency: string;
}

interface SetupIntentData {
  clientSecret: string;
  setupIntentId: string;
  stripeCustomerId: string;
}

type OnboardingStep = 'payment' | 'payout' | 'complete';

/**
 * Payment method form component (Stripe Elements)
 */
function PaymentMethodForm({
  poolName,
  contributionAmount,
  frequency,
  setupIntentId,
  poolId,
  onSuccess,
  onError,
}: {
  poolName: string;
  contributionAmount: number;
  frequency: string;
  setupIntentId: string;
  poolId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentText = `I authorize automatic ${frequency} payments of $${contributionAmount} for ${poolName}. I understand that my payment method will be charged automatically on each due date.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    if (!consentGiven) {
      setError('Please agree to the automatic payment terms');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pools/${poolId}?setup_complete=true`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Failed to save payment method');
        onError(submitError.message || 'Failed to save payment method');
        return;
      }

      if (setupIntent && setupIntent.status === 'succeeded') {
        const response = await fetch('/api/stripe/confirm-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupIntentId,
            poolId,
            consentText,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save payment method');
        }

        onSuccess();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      onError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="consent"
          checked={consentGiven}
          onCheckedChange={(checked) => setConsentGiven(checked === true)}
        />
        <label
          htmlFor="consent"
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
        >
          {consentText}
        </label>
      </div>

      <Button
        type="submit"
        disabled={!stripe || !elements || isLoading || !consentGiven}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Save Payment Method
          </>
        )}
      </Button>
    </form>
  );
}

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
}: PoolOnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>('payment');
  const [setupData, setSetupData] = useState<SetupIntentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (isOpen && !setupData && step === 'payment') {
      createSetupIntent();
    }
  }, [isOpen, step]);

  const createSetupIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create setup intent');
      }

      setSetupData({
        clientSecret: data.clientSecret,
        setupIntentId: data.setupIntentId,
        stripeCustomerId: data.stripeCustomerId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    setTimeout(() => {
      setStep('payout');
    }, 1500);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

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
    if (!isLoading) {
      // Reset state
      setStep('payment');
      setSetupData(null);
      setError(null);
      setPaymentComplete(false);
      onClose();
    }
  };

  const getProgress = () => {
    switch (step) {
      case 'payment':
        return paymentComplete ? 50 : 25;
      case 'payout':
        return 75;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'payment':
        return 'Step 1: Set Up Automatic Payments';
      case 'payout':
        return 'Step 2: How Will You Receive Payouts?';
      case 'complete':
        return 'All Set!';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'payment':
        return `Save your payment method for automatic ${frequency} contributions.`;
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
            {step === 'payment' && <CreditCard className="h-5 w-5" />}
            {step === 'payout' && <Wallet className="h-5 w-5" />}
            {step === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        <Progress value={getProgress()} className="h-2" />

        <div className="py-2">
          {step === 'complete' ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Welcome to {poolName}!</h3>
              <p className="text-sm text-muted-foreground">
                Your setup is complete. You&apos;re ready to participate in the pool.
              </p>
            </div>
          ) : step === 'payout' ? (
            <PayoutMethodForm onSuccess={handlePayoutSuccess} onSkip={handlePayoutSkip} />
          ) : paymentComplete ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payment Method Saved!</h3>
              <p className="text-sm text-muted-foreground">
                Moving to payout setup...
              </p>
            </div>
          ) : isLoading && !setupData ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Setting up payment form...</p>
            </div>
          ) : error && !setupData ? (
            <div className="py-8">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={createSetupIntent} className="w-full mt-4">
                Try Again
              </Button>
            </div>
          ) : setupData ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupData.clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#0f172a' },
                },
              }}
            >
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Pool:</span>{' '}
                  <span className="font-medium">{poolName}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Contribution:</span>{' '}
                  <span className="font-medium">${contributionAmount}</span> {frequency}
                </p>
              </div>
              <PaymentMethodForm
                poolName={poolName}
                contributionAmount={contributionAmount}
                frequency={frequency}
                setupIntentId={setupData.setupIntentId}
                poolId={poolId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PoolOnboardingModal;
