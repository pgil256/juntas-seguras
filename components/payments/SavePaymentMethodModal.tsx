'use client';

/**
 * SavePaymentMethodModal Component
 *
 * Modal for saving a payment method for automatic contributions using Stripe Elements.
 * This is shown after a member joins a pool to set up recurring payments.
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SavePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

/**
 * Inner form component that uses Stripe hooks
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

    if (!stripe || !elements) {
      return;
    }

    if (!consentGiven) {
      setError('Please agree to the automatic payment terms');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Confirm the setup intent
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
        // Confirm with our backend
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Payment Details</h4>
        <p className="text-sm text-muted-foreground mb-1">
          Pool: <span className="font-medium text-foreground">{poolName}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Contribution: <span className="font-medium text-foreground">${contributionAmount}</span> {frequency}
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
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
 * Main modal component
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
  const [setupData, setSetupData] = useState<SetupIntentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Create Setup Intent when modal opens
  useEffect(() => {
    if (isOpen && !setupData && !success) {
      createSetupIntent();
    }
  }, [isOpen]);

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

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleClose = () => {
    if (!isLoading) {
      setSetupData(null);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Set Up Automatic Payments
          </DialogTitle>
          <DialogDescription>
            Save your payment method for automatic {frequency} contributions to {poolName}.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Method Saved!</h3>
            <p className="text-sm text-muted-foreground">
              Your contributions will be collected automatically on each due date.
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
                variables: {
                  colorPrimary: '#0f172a',
                },
              },
            }}
          >
            <PaymentMethodForm
              poolName={poolName}
              contributionAmount={contributionAmount}
              frequency={frequency}
              setupIntentId={setupData.setupIntentId}
              poolId={poolId}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Elements>
        ) : null}

        {!success && (
          <DialogFooter className="sm:justify-start">
            <p className="text-xs text-muted-foreground">
              Your payment information is securely processed by Stripe.
              You can update or remove your payment method at any time.
            </p>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SavePaymentMethodModal;
