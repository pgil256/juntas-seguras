'use client';

/**
 * PayoutMethodForm Component
 *
 * Simple form for users to select their preferred payout method
 * (Venmo, PayPal, Zelle, CashApp) instead of complex Stripe Connect setup.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

type PayoutMethodType = 'venmo' | 'paypal' | 'zelle' | 'cashapp' | 'bank';

interface PayoutMethodFormProps {
  onSuccess: () => void;
  onSkip: () => void;
  showSkip?: boolean;
}

const PAYOUT_METHODS: { value: PayoutMethodType; label: string; placeholder: string; helpText: string }[] = [
  {
    value: 'venmo',
    label: 'Venmo',
    placeholder: '@username or phone number',
    helpText: 'Enter your Venmo username (starting with @) or linked phone number'
  },
  {
    value: 'paypal',
    label: 'PayPal',
    placeholder: 'email@example.com',
    helpText: 'Enter the email address linked to your PayPal account'
  },
  {
    value: 'zelle',
    label: 'Zelle',
    placeholder: 'email or phone number',
    helpText: 'Enter your Zelle-registered email or phone number'
  },
  {
    value: 'cashapp',
    label: 'Cash App',
    placeholder: '$cashtag or phone number',
    helpText: 'Enter your $cashtag or linked phone number'
  },
];

export function PayoutMethodForm({ onSuccess, onSkip, showSkip = true }: PayoutMethodFormProps) {
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodType | ''>('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingMethod, setExistingMethod] = useState<{
    type: PayoutMethodType;
    handle: string;
    displayName?: string;
  } | null>(null);

  useEffect(() => {
    fetchExistingMethod();
  }, []);

  const fetchExistingMethod = async () => {
    try {
      const response = await fetch('/api/user/payout-method');
      const data = await response.json();

      if (response.ok && data.payoutMethod?.type) {
        setExistingMethod(data.payoutMethod);
        setPayoutMethod(data.payoutMethod.type);
        setHandle(data.payoutMethod.handle || '');
        setDisplayName(data.payoutMethod.displayName || '');
      }
    } catch (err) {
      // Ignore fetch errors - user just doesn't have a method set
    } finally {
      setIsFetching(false);
    }
  };

  const selectedMethod = PAYOUT_METHODS.find(m => m.value === payoutMethod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payoutMethod || !handle.trim()) {
      setError('Please select a payout method and enter your account info');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/payout-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payoutMethod,
          handle: handle.trim(),
          displayName: displayName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payout method');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If user already has a payout method set up
  if (existingMethod && !error) {
    const method = PAYOUT_METHODS.find(m => m.value === existingMethod.type);
    return (
      <div className="py-6 space-y-4">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Payout Method Saved</h3>
          <p className="text-sm text-muted-foreground">
            Your payouts will be sent to your {method?.label} account.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{method?.label}</p>
              <p className="text-sm text-muted-foreground">{existingMethod.handle}</p>
              {existingMethod.displayName && (
                <p className="text-xs text-muted-foreground">{existingMethod.displayName}</p>
              )}
            </div>
          </div>
        </div>

        <Button onClick={onSuccess} className="w-full">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          onClick={() => setExistingMethod(null)}
          className="w-full text-muted-foreground"
        >
          Update payout method
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium">How will you receive payouts?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              When it&apos;s your turn to receive the pool payout, the pool admin will
              send it to you using your preferred payment method.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payout-method">Payout Method</Label>
        <Select
          value={payoutMethod}
          onValueChange={(value) => setPayoutMethod(value as PayoutMethodType)}
        >
          <SelectTrigger id="payout-method">
            <SelectValue placeholder="Select your preferred payout method" />
          </SelectTrigger>
          <SelectContent>
            {PAYOUT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {payoutMethod && selectedMethod && (
        <>
          <div className="space-y-2">
            <Label htmlFor="handle">
              {selectedMethod.label} Account
            </Label>
            <Input
              id="handle"
              type="text"
              placeholder={selectedMethod.placeholder}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {selectedMethod.helpText}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">
              Display Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="display-name"
              type="text"
              placeholder="e.g., John's Venmo"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to help identify this account
            </p>
          </div>
        </>
      )}

      <Button
        type="submit"
        disabled={isLoading || !payoutMethod || !handle.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Save Payout Method
          </>
        )}
      </Button>

      {showSkip && (
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="w-full text-muted-foreground"
        >
          Skip for now (you can set this up later)
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Your payout information is stored securely and only visible to pool administrators.
      </p>
    </form>
  );
}

export default PayoutMethodForm;
