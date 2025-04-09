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
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
            
            {/* Modal centered container */}
            <div 
              className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 w-full max-w-md"
              style={{ zIndex: 9999 }}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {verificationMethod === 'email' ? 'Verify Your Account' : 'Verify Your Authenticator App'}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {verificationMethod === 'email' ? (
                        <>
                          We've sent a verification code to {emailForDisplay ? <strong>{emailForDisplay}</strong> : 'your email'}. Please enter it below:
                        </>
                      ) : (
                        <>
                          Scan this QR code with your authenticator app:
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                {displayError && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          {displayError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {verificationMethod === 'email' ? (
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg"
                      autoFocus
                    />
                  ) : (
                    <div className="space-y-4">
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
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending || verificationMethod === 'app'}
                      className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isResending ? 'Resending...' : 'Resend Code'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || verificationCode.length !== 6}
                      className="w-full sm:w-auto flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 