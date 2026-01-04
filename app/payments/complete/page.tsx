'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

type CompletionStatus = 'processing' | 'success' | 'error';

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<CompletionStatus>('processing');
  const [message, setMessage] = useState('');
  const [poolId, setPoolId] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const payerId = searchParams.get('PayerID');
    const poolIdParam = searchParams.get('poolId');

    setPoolId(poolIdParam);

    if (!token) {
      setStatus('error');
      setMessage('Missing payment token. Please try again.');
      return;
    }

    // Capture the PayPal payment
    const capturePayment = async () => {
      try {
        const response = await fetch('/api/payments/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            payerId,
            poolId: poolIdParam,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Payment completed successfully!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Payment capture failed. Please contact support.');
        }
      } catch (error) {
        console.error('Payment capture error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please contact support.');
      }
    };

    capturePayment();
  }, [searchParams]);

  const handleContinue = () => {
    if (poolId) {
      router.push(`/pools/${poolId}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {status === 'processing' && 'Processing Payment'}
          {status === 'success' && 'Payment Successful'}
          {status === 'error' && 'Payment Failed'}
        </CardTitle>
        <CardDescription>
          {status === 'processing' && 'Please wait while we complete your payment...'}
          {status === 'success' && 'Your contribution has been processed.'}
          {status === 'error' && 'There was an issue with your payment.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        {status === 'processing' && (
          <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
        )}
        {status === 'success' && (
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-100 p-4 rounded-full">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
        )}

        <p className="text-center text-gray-600">{message}</p>

        {status !== 'processing' && (
          <Button onClick={handleContinue} className="w-full">
            {status === 'success' ? 'View Pool' : 'Return to Pool'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentCompleteLoading() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Loading...</CardTitle>
        <CardDescription>Please wait...</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
      </CardContent>
    </Card>
  );
}

export default function PaymentCompletePage() {
  return (
    <div className="container max-w-md mx-auto py-12">
      <Suspense fallback={<PaymentCompleteLoading />}>
        <PaymentCompleteContent />
      </Suspense>
    </div>
  );
}
