'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Loader2, X, KeyRound } from 'lucide-react';
import { TwoFactorMethod } from '@/types/security';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const method = searchParams.get('method') as TwoFactorMethod || 'app';
  const returnUrl = searchParams.get('returnUrl') || '/';
  
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      router.push('/login');
    }
  }, [userId, router]);

  const handleVerifyCode = async () => {
    if (!userId) return;
    
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
      
      // Successful verification
      router.push(returnUrl);
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
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend code');
      }
      
      // Show success message or notification
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
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
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
              />
              {method !== 'app' && (
                <p className="text-xs text-gray-500 mt-1">
                  Didn't receive a code? <Button variant="link" className="h-auto p-0" onClick={handleResendCode}>Resend code</Button>
                </p>
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
  );
}