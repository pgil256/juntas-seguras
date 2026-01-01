'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Loader2, X, KeyRound } from 'lucide-react';
import { TwoFactorMethod } from '../../types/security';

interface TwoFactorVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  userId: string;
  method: TwoFactorMethod;
}

export default function TwoFactorVerificationModal({
  isOpen,
  onClose,
  onVerified,
  userId,
  method
}: TwoFactorVerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onVerified();
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
      case 'email': return 'Email';
      default: return 'Authentication Method';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Two-Factor Verification</DialogTitle>
          <DialogDescription className="text-center">
            {recoveryMode 
              ? 'Enter a recovery code to access your account'
              : `Enter the verification code from your ${getMethodLabel()}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
                autoFocus
              />
              {method !== 'app' && (
                <p className="text-xs text-gray-500 mt-1">
                  Didn't receive a code? <Button variant="link" className="h-auto p-0" onClick={handleResendCode}>Resend code</Button>
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={handleVerifyCode}
            disabled={loading || (recoveryMode ? !recoveryCode : !verificationCode || verificationCode.length !== 6)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setRecoveryMode(!recoveryMode)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {recoveryMode ? 'Use verification code instead' : 'Use a recovery code instead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}