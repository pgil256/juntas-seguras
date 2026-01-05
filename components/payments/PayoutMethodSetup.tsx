'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, CheckCircle, ArrowRight } from 'lucide-react';

interface PayoutMethod {
  type: 'venmo' | 'paypal' | 'zelle' | 'cashapp' | 'bank';
  handle: string;
  displayName?: string;
}

export function PayoutMethodSetup() {
  const router = useRouter();
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null);
  const [loading, setLoading] = useState(true);

  const getPayoutMethodLabel = (type: string) => {
    const labels: Record<string, string> = {
      venmo: 'Venmo',
      paypal: 'PayPal',
      zelle: 'Zelle',
      cashapp: 'Cash App',
      bank: 'Bank Transfer',
    };
    return labels[type] || type;
  };

  const fetchPayoutMethod = useCallback(async () => {
    try {
      const response = await fetch('/api/user/payout-method');
      const data = await response.json();

      if (response.ok && data.payoutMethod) {
        setPayoutMethod(data.payoutMethod);
      }
    } catch (err) {
      console.error('Failed to load payout method:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayoutMethod();
  }, [fetchPayoutMethod]);

  const handleSetupClick = () => {
    router.push('/settings?tab=payment-methods');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payout Method
        </CardTitle>
        <CardDescription>
          Set up how you want to receive your pool payouts when it&apos;s your turn
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payoutMethod ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">
                    {getPayoutMethodLabel(payoutMethod.type)}
                  </p>
                  <p className="text-sm text-green-700 font-mono">
                    {payoutMethod.handle}
                  </p>
                  {payoutMethod.displayName && (
                    <p className="text-xs text-green-600">
                      {payoutMethod.displayName}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetupClick}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                Edit
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              When it&apos;s your turn to receive the payout, the pool admin will send
              the funds to your {getPayoutMethodLabel(payoutMethod.type)} account.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium mb-2">
                No payout method set up
              </p>
              <p className="text-sm text-amber-700">
                Set up your Venmo, PayPal, Zelle, or Cash App to receive pool payouts
                when it&apos;s your turn.
              </p>
            </div>
            <Button onClick={handleSetupClick} className="w-full sm:w-auto">
              Set Up Payout Method
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PayoutMethodSetup;
