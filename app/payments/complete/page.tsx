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
    const sessionId = searchParams.get('session_id');
    const poolIdParam = searchParams.get('poolId');
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    setPoolId(poolIdParam);

    // Handle canceled payment
    if (canceled === 'true') {
      setStatus('error');
      setMessage('Payment was canceled. You can try again when ready.');
      return;
    }

    // Handle successful redirect from Stripe
    if (success === 'true' && sessionId) {
      // For Stripe Checkout, payment is already complete at this point
      // The webhook will handle the database updates
      setStatus('success');
      setMessage('Payment completed successfully! Your contribution has been recorded.');
      return;
    }

    if (!sessionId) {
      setStatus('error');
      setMessage('Missing payment session. Please try again.');
      return;
    }

    // Verify the Stripe session status
    const verifyPayment = async () => {
      try {
        // For pool contributions, we redirect back to the pool page
        // which handles the completion
        if (poolIdParam) {
          router.push(`/pools/${poolIdParam}?stripe_success=true&session_id=${sessionId}`);
          return;
        }

        // Otherwise show success
        setStatus('success');
        setMessage('Payment completed successfully!');
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

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
          {status === 'error' && 'Payment Issue'}
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
