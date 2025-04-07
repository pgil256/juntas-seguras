'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Label } from '../../../../../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../../../../../components/ui/alert';
import { Shield, Loader2, X, KeyRound } from 'lucide-react';
import { TwoFactorMethod } from '../../../../../types/security';
import { useSession, signIn } from 'next-auth/react';
import ClientComponentBoundary from '../../../../ClientComponentBoundary';

// Separate component that uses useSearchParams
function TwoFactorVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  // Get return URL from query parameters
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  
  // Get MFA method from session or query parameters
  const method = (session?.mfaMethod || searchParams.get('method')) as TwoFactorMethod || 'app';
  
  // Get user ID from session
  const userId = session?.user?.id || '';
  
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if no user is authenticated
  useEffect(() => {
    if (!session) {
      // Delay redirection to avoid flickering and ensure session is fully checked
      const timer = setTimeout(() => {
        if (!session) {
          router.push('/auth/signin');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [session, router]);

  const handleVerifyCode = async () => {
    // Special case for missing userId - redirect back to login
    if (!userId || !session?.user?.email) {
      setError('Authentication required. Please sign in again.');
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
      return;
    }
    
    if (recoveryMode && !recoveryCode) {
      setError('Please enter a recovery code');
      return;
    }
    
    if (!recoveryMode && (!verificationCode || verificationCode.length !== 6)) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First verify with the 2FA endpoint
      const response = await fetch('/api/security/two-factor/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          code: recoveryMode ? null : verificationCode,
          recoveryCode: recoveryMode ? recoveryCode : null
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verification failed');
      }
      
      // Complete the authentication with the verified MFA code
      const result = await signIn('credentials', {
        redirect: false,
        email: session.user.email,
        password: 'placeholder-not-used', // Not actually used for verification
        mfaCode: recoveryMode ? recoveryCode : verificationCode,
        callbackUrl: returnUrl
      });
      
      if (result?.error) {
        throw new Error('Authentication failed after MFA verification');
      }
      
      // Successful verification - redirect to the return URL
      router.push(returnUrl);
      router.refresh();
    } catch (error: any) {
      setError(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    setVerificationCode(''); // Clear the current input
    
    try {
      const response = await fetch('/api/security/two-factor/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          method
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }
      
      // If in development, display the code directly
      if (process.env.NODE_ENV === 'development' && data.verificationCode) {
        setError(`A new verification code has been sent: ${data.verificationCode}`);
      } else {
        // Show success notification for production
        setError(`A new verification code has been sent to your ${method === 'email' ? 'email' : 'phone'}.`);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const getMethodLabel = () => {
    switch (method) {
      case 'app': return 'Authentication App';
      case 'sms': return 'Text Message (SMS)';
      case 'email': return 'Email';
      default: return 'Authentication Method';
    }
  };

  return (
    <ClientComponentBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-xl text-center">Two-Factor Verification</CardTitle>
            <CardDescription className="text-center">
              {recoveryMode 
                ? 'Enter a recovery code to access your account'
                : `Enter the verification code from your ${getMethodLabel()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant={error.includes('new verification code') ? 'default' : 'destructive'} 
                    className={error.includes('new verification code') ? 'bg-green-50 border-green-200' : ''}>
                {error.includes('new verification code') 
                  ? <><AlertTitle>Code sent</AlertTitle><AlertDescription>{error}</AlertDescription></>
                  : <><X className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></>
                }
              </Alert>
            )}
            
            {recoveryMode ? (
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Recovery Code</Label>
              <Input
                id="recovery-code"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.trim())}
                placeholder="Enter recovery code"
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Enter one of the recovery codes you saved when setting up two-factor authentication.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="text-center font-mono text-lg"
                autoFocus
              />
              {method !== 'app' && (
                <div className="space-y-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={handleResendCode}
                  >
                    Resend verification code
                  </Button>
                  
                  {error && error.includes('new verification code') && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-center text-green-700">Code sent successfully</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            className="w-full" 
            onClick={handleVerifyCode}
            disabled={loading || (recoveryMode ? !recoveryCode : !verificationCode || verificationCode.length !== 6)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setRecoveryMode(!recoveryMode)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {recoveryMode ? 'Use verification code instead' : 'Use a recovery code instead'}
          </Button>
        </CardFooter>
      </Card>
    </div>
    </ClientComponentBoundary>
  );
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-xl text-center">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <TwoFactorVerifyContent />
    </Suspense>
  );
}