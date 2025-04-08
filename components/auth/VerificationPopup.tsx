"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';

interface VerificationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  verificationMethod: 'email' | 'app';
  verificationData?: {
    totpSecret?: string;
    totpUrl?: string;
  };
  isLoading?: boolean;
  error?: string | null;
  emailForDisplay?: string;
}

export default function VerificationPopup({
  isOpen,
  onClose,
  onVerify,
  onResend,
  verificationMethod,
  verificationData,
  isLoading: parentIsLoading,
  error: parentError,
  emailForDisplay
}: VerificationPopupProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Use parent error if provided
  const displayError = parentError || error;
  // Use parent loading state if provided
  const isSubmitting = parentIsLoading || isLoading;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onVerify(verificationCode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    try {
      await onResend();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Your Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {verificationMethod === 'email' ? (
            <p className="text-sm text-gray-600">
              We've sent a verification code to {emailForDisplay ? <strong>{emailForDisplay}</strong> : 'your email'}. Please enter it below:
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Scan this QR code with your authenticator app:
              </p>
              {verificationData?.totpUrl && (
                <div className="flex justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationData.totpUrl)}`}
                    alt="QR Code"
                    className="mx-auto"
                  />
                </div>
              )}
              <p className="text-sm text-gray-600">
                Or enter this secret key manually:
              </p>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {verificationData?.totpSecret}
              </code>
            </div>
          )}

          {displayError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                placeholder="Enter 6-digit code"
                className="text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={isResending || verificationMethod === 'app'}
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || verificationCode.length !== 6}
              >
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 