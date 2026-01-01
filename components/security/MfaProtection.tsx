'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TwoFactorMethod } from '../../types/security';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, X, KeyRound, Shield } from 'lucide-react';
import ClientOnly from '../ClientOnly';

interface MfaProtectionProps {
  children: React.ReactNode;
  actionName: string;
  description?: string;
  onVerified: () => void;
  onCancel?: () => void;
}

export default function MfaProtection({
  children,
  actionName,
  description,
  onVerified,
  onCancel
}: MfaProtectionProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get MFA method from session
  const method = session?.mfaMethod as TwoFactorMethod || 'email';
  const userId = session?.user?.id;

  const handleRequestAccess = () => {
    setIsOpen(true);
    setVerificationCode('');
    setRecoveryCode('');
    setError(null);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    if (onCancel) onCancel();
  };

  const handleVerifyCode = async () => {
    if (!userId) {
      setError('Authentication required. Please sign in again.');
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
      // Verify with the 2FA endpoint
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
      
      // Close dialog and notify parent of success
      setIsOpen(false);
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
    setVerificationCode(''); // Clear current input
    
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
      case 'email': return 'Email';
      default: return 'Authentication Method';
    }
  };

  return (
    <ClientOnly>
      <div onClick={handleRequestAccess}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-500" />
              Security Verification Required
            </DialogTitle>
            <DialogDescription>
              {description || `For your security, we need to verify your identity before you can ${actionName.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
                <Label htmlFor="verification-code">
                  Enter the verification code from your {getMethodLabel()}
                </Label>
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
            
            <Button variant="ghost" onClick={handleCloseDialog}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  );
}