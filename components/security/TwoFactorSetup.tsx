'use client';

import { useState, useEffect } from 'react';
import { Shield, Mail, QrCode, Lock, Copy, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { TwoFactorMethod, TwoFactorSetup as TwoFactorSetupType } from '../../types/security';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

interface TwoFactorSetupProps {
  userId: string;
  onSetupComplete?: () => void;
  onCancel?: () => void;
}

export default function TwoFactorSetup({ userId, onSetupComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'method' | 'setup' | 'verify' | 'backup' | 'success'>('method');
  const [method, setMethod] = useState<TwoFactorMethod>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  // Get current 2FA status on mount
  useEffect(() => {
    async function checkTwoFactorStatus() {
      try {
        const response = await fetch(`/api/security/two-factor/setup?userId=${userId}`);
        const data = await response.json();

        if (data.enabled) {
          // User already has 2FA enabled
          onSetupComplete?.();
        }
      } catch (error) {
        console.error('Failed to check 2FA status:', error);
      }
    }

    checkTwoFactorStatus();
  }, [userId, onSetupComplete]);

  const startSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        userId,
        method
      };

      // Add email if email method is selected
      if (method === 'email') {
        if (!email) {
          setError('Email is required for email authentication');
          setLoading(false);
          return;
        }
        payload.email = email;
      }

      const response = await fetch('/api/security/two-factor/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set up two-factor authentication');
      }

      const data = await response.json();
      setSetupData(data);

      if (method === 'app') {
        setStep('setup');
      } else {
        setStep('verify');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to set up two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
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
          code: verificationCode
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      if (method === 'app') {
        setStep('backup');
      } else {
        setStep('success');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setBackupCodesCopied(true);

      setTimeout(() => {
        setBackupCodesCopied(false);
      }, 3000);
    }
  };

  const finishSetup = () => {
    setStep('success');
    setTimeout(() => {
      onSetupComplete?.();
    }, 1500);
  };

  const cancelSetup = () => {
    onCancel?.();
  };

  // Render the appropriate step
  const renderStep = () => {
    switch (step) {
      case 'method':
        return (
          <>
            <CardHeader>
              <CardTitle>Set Up Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account by requiring a verification code in addition to your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Choose Authentication Method</h3>
                  <RadioGroup value={method} onValueChange={(value) => setMethod(value as TwoFactorMethod)} className="space-y-3">
                    <div className="flex items-start space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="app" id="method-app" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="method-app" className="font-medium text-sm flex items-center">
                          <QrCode className="h-4 w-4 mr-2" />
                          Authentication App (Recommended)
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Use an app like Google Authenticator, Authy, or Microsoft Authenticator to generate verification codes.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="email" id="method-email" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="method-email" className="font-medium text-sm flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Receive verification codes via email to your registered email address.
                        </p>
                        {method === 'email' && (
                          <div className="mt-3">
                            <Label htmlFor="email" className="text-xs">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="your.email@example.com"
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={cancelSetup}>
                Cancel
              </Button>
              <Button onClick={startSetup} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </CardFooter>
          </>
        );

      case 'setup':
        return (
          <>
            <CardHeader>
              <CardTitle>Set Up Authentication App</CardTitle>
              <CardDescription>
                Scan the QR code with your authentication app or enter the setup key manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  {setupData?.qrCodeUrl && (
                    <div className="border p-4 rounded-md bg-white mb-4">
                      {/* In a real app, this would render an actual QR code */}
                      <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                        <QrCode className="h-24 w-24 text-gray-600" />
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-500 text-center">
                    Unable to scan the QR code? Enter this code manually:
                  </p>

                  <div className="mt-2 flex items-center space-x-2">
                    <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                      {setupData?.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(setupData?.secret || '');
                      }}
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="verification-code" className="text-sm font-medium">
                    Enter Verification Code
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="text-center font-mono text-lg"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('method')}>
                Back
              </Button>
              <Button onClick={verifyCode} disabled={loading || verificationCode.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </CardFooter>
          </>
        );

      case 'verify':
        return (
          <>
            <CardHeader>
              <CardTitle>Verify Your Email</CardTitle>
              <CardDescription>
                Enter the verification code sent to your email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="verification-code" className="text-sm font-medium">
                    Enter Verification Code
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="text-center font-mono text-lg"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Didn't receive a code? <a href="#" className="text-blue-600 hover:underline">Resend code</a>
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('method')}>
                Back
              </Button>
              <Button onClick={verifyCode} disabled={loading || verificationCode.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </CardFooter>
          </>
        );

      case 'backup':
        return (
          <>
            <CardHeader>
              <CardTitle>Save Backup Codes</CardTitle>
              <CardDescription>
                If you lose access to your authentication method, you can use these backup codes to sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Keep these codes in a safe place. Each code can only be used once.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-4 rounded-md border">
                  <div className="grid grid-cols-2 gap-2">
                    {setupData?.backupCodes?.map((code: string, index: number) => (
                      <code key={index} className="font-mono text-sm">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={copyBackupCodes}
                    className="flex items-center"
                  >
                    {backupCodesCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Codes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('verify')}>
                Back
              </Button>
              <Button onClick={finishSetup}>
                Finish Setup
              </Button>
            </CardFooter>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader>
              <CardTitle>Setup Complete!</CardTitle>
              <CardDescription>
                Two-factor authentication has been successfully enabled for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">Your account is now more secure</h3>
              <p className="text-center text-sm text-gray-500 mt-2">
                You'll now be asked for a verification code when you sign in to your account.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={onSetupComplete} className="w-full">
                Done
              </Button>
            </CardFooter>
          </>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      {renderStep()}
    </Card>
  );
}
