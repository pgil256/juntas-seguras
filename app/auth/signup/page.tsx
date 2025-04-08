"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { TwoFactorMethod } from "../../../types/security";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { Shield, Phone, Mail, Smartphone, CreditCard, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { VerificationType, VerificationMethod } from "@/types/identity";
import VerificationPopup from '@/components/auth/VerificationPopup';
import { useToast } from "@/hooks/use-toast";

import ClientComponentBoundary from '../../ClientComponentBoundary';

export default function SignUp() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'credentials' | 'mfa-setup' | 'identity-verification'>('credentials');
  const [userId, setUserId] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<TwoFactorMethod>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaData, setMfaData] = useState<any>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationType, setVerificationType] = useState<VerificationType>(VerificationType.GOVERNMENT_ID);
  const [identityVerificationUrl, setIdentityVerificationUrl] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'app'>('email');
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    // Password strength validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setError("Password must contain uppercase, lowercase, and numbers");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || undefined,
          verificationMethod
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'User already exists') {
          setError('An account with this email already exists. Please sign in or use a different email.');
          return;
        }
        throw new Error(data.error || 'Registration failed');
      }

      if (!data.user || !data.user.userId) {
        throw new Error('Invalid response from server');
      }
      
      // Store user ID and MFA info for the next step
      setUserId(data.user.userId);
      setMfaMethod(data.user.mfaMethod);
      setVerificationMethod(data.user.mfaMethod);
      setMfaData(data.mfaSetup || {});
      
      if (data.user.mfaMethod === 'app') {
        setVerificationData(data.mfaSetup);
      }
      
      // Show verification popup
      setShowVerificationPopup(true);
      toast({ title: "Registration initiated", description: "Please check your email or authenticator app for the verification code." });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account');
      toast({ title: "Registration Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    try {
      console.log("Verifying with:", { userId, code, email });
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, email }),
      });

      const data = await response.json();
      
      console.log("Verification response:", data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast({
        title: 'Success!',
        description: 'Your account has been verified. Redirecting to login...',
      });

      // Redirect to login
      router.push('/auth/signin');
    } catch (error) {
      console.error("Verification error:", error);
      setMfaError(error.message || 'Failed to verify your account');
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || 'Failed to verify your account',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!userId || !email) {
      toast({ title: "Error", description: "Cannot resend code without User ID and Email.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          verificationMethod: mfaMethod
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }
      toast({ title: "Code Resent", description: "A new verification code has been sent." });
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend verification code');
      toast({ title: "Resend Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const startIdentityVerification = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // For development mode, we can bypass or simulate identity verification
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: simulating identity verification');
        
        // In development, just mark the account as registered and redirect
        router.push('/auth/signin?registered=true&mfa=setup');
        return;
      }
      
      // Start identity verification process
      const response = await fetch('/api/identity/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: verificationType,
          method: VerificationMethod.STRIPE_IDENTITY,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start identity verification');
      }
      
      // Store verification URL for redirection
      if (data.verificationUrl) {
        setIdentityVerificationUrl(data.verificationUrl);
      } else {
        // If no URL is provided, registration is complete
        router.push('/auth/signin?registered=true&mfa=setup');
      }
    } catch (err: any) {
      console.error('Identity verification error:', err);
      setError(err.message || 'Failed to start identity verification');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChangeMfaMethod = async (method: TwoFactorMethod) => {
    if (!userId) return;
    
    setIsLoading(true);
    setError("");
    setMfaMethod(method);
    
    try {
      // Update MFA method
      const response = await fetch('/api/security/two-factor/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          method,
          phone: phone || undefined,
          email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update MFA method');
      }
      
      // Update MFA setup data
      setMfaData(data);
    } catch (err: any) {
      console.error('MFA method change error:', err);
      setError(err.message || 'Failed to update MFA method');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle redirection to Stripe Identity Verification
  useEffect(() => {
    if (identityVerificationUrl) {
      // Redirect to Stripe verification
      window.location.href = identityVerificationUrl;
    }
  }, [identityVerificationUrl]);

  if (!mounted) {
    return null;
  }

  if (showVerificationPopup) {
    console.log('Rendering verification popup');
    return (
      <VerificationPopup
        isOpen={showVerificationPopup}
        onClose={() => setShowVerificationPopup(false)}
        onVerify={handleVerify}
        onResend={handleResendCode}
        verificationMethod={verificationMethod}
        verificationData={verificationData}
        isLoading={isLoading}
        error={error}
        emailForDisplay={email}
      />
    );
  }

  // Render either credentials form, MFA setup form, or identity verification form
  return (
    <ClientComponentBoundary>
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {registrationStep === 'credentials' 
                ? 'Create an Account' 
                : registrationStep === 'mfa-setup'
                  ? 'Set Up Two-Factor Authentication'
                  : 'Identity Verification'}
            </CardTitle>
            <CardDescription className="text-center">
              {registrationStep === 'credentials'
                ? 'Enter your details to create your Juntas Seguras account'
                : registrationStep === 'mfa-setup'
                  ? 'Add an extra layer of security to protect your account'
                  : 'Verify your identity to access all features and ensure security'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert 
                variant={error.includes('verification code') && !error.includes('Failed') ? 'default' : 'destructive'} 
                className={`mb-4 ${error.includes('verification code') && !error.includes('Failed') ? 'bg-green-50 border-green-200' : ''}`}
              >
                <AlertTitle>{error.includes('verification code') && !error.includes('Failed') ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {registrationStep === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional for SMS verification)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verificationMethod">Verification Method</Label>
                <RadioGroup
                  value={verificationMethod}
                  onValueChange={(value: 'email' | 'app') => setVerificationMethod(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <label htmlFor="email" className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="app" id="app" />
                    <label htmlFor="app" className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Authenticator App
                    </label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || isVerified}
              >
                {isLoading ? "Creating account..." : isVerified ? "Account Created" : "Create Account"}
              </Button>
              
              <div className="mt-4 text-center text-sm">
                <p className="text-gray-500">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="font-medium text-blue-800">Two-Factor Authentication Required</h3>
                  <p className="text-sm text-blue-600">
                    Adding 2FA provides an additional layer of security. This is required for all accounts.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Select Your Preferred Method</h3>
                <RadioGroup 
                  value={mfaMethod} 
                  onValueChange={(v) => handleChangeMfaMethod(v as TwoFactorMethod)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value="email" id="r1" />
                    <Label htmlFor="r1" className="flex items-center cursor-pointer">
                      <Mail className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <span className="block font-medium">Email</span>
                        <span className="block text-gray-500 text-sm">Receive verification codes via email</span>
                      </div>
                    </Label>
                  </div>
                  
                  <div className={`flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50 ${!phone ? 'opacity-50' : ''}`}>
                    <RadioGroupItem value="sms" id="r2" disabled={!phone} />
                    <Label htmlFor="r2" className="flex items-center cursor-pointer">
                      <Smartphone className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <span className="block font-medium">SMS Text Message</span>
                        <span className="block text-gray-500 text-sm">
                          {phone ? `Receive codes via SMS to ${phone}` : 'Phone number required'}
                        </span>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value="app" id="r3" />
                    <Label htmlFor="r3" className="flex items-center cursor-pointer">
                      <Phone className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <span className="block font-medium">Authentication App</span>
                        <span className="block text-gray-500 text-sm">
                          Use an app like Google Authenticator or Authy
                        </span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {mfaMethod === 'app' && mfaData?.qrCodeUrl && (
                <div className="p-4 border rounded-md bg-gray-50 space-y-4">
                  <h3 className="font-medium">Set up Authentication App</h3>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>1. Open your authentication app</li>
                    <li>2. Scan this QR code or enter the code manually</li>
                    <li>3. Enter the 6-digit verification code below</li>
                  </ol>
                  
                  <div className="border p-2 bg-white rounded-md">
                    <div className="text-center">QR code would be displayed here</div>
                    <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-sm text-center">
                      {mfaData.secret}
                    </div>
                  </div>
                </div>
              )}
              
              {(mfaMethod === 'email' || mfaMethod === 'sms') && (
                <div className="p-4 border rounded-md bg-gray-50">
                  <p className="text-sm">
                    {mfaMethod === 'email' 
                      ? `A verification code has been sent to ${email}.` 
                      : `A verification code has been sent to ${phone}.`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter the 6-digit code below to verify.
                  </p>
                  {process.env.NODE_ENV === 'development' && mfaData?.verificationCode && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
                      <p className="text-xs text-yellow-800">Development code:</p>
                      <p className="font-mono font-bold text-yellow-900">{mfaData.verificationCode}</p>
                    </div>
                  )}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleResendCode}
                    >
                      Resend verification code
                    </Button>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code-input">Verification Code</Label>
                  <Input
                    id="verification-code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="text-center font-mono text-lg"
                    autoFocus
                    disabled={isLoading || isVerified}
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || isVerified || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </form>
              
              {mfaData?.backupCodes && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="w-full"
                  >
                    {showBackupCodes ? "Hide Backup Codes" : "Show Backup Codes"}
                  </Button>
                  
                  {showBackupCodes && (
                    <div className="mt-3 p-4 border rounded-md bg-yellow-50">
                      <h4 className="font-medium text-amber-800">Backup Codes</h4>
                      <p className="text-xs text-amber-700 mb-2">
                        Save these backup codes in a secure place. You can use them to sign in if you lose access to your authentication method.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {mfaData.backupCodes.map((code: string, i: number) => (
                          <div key={i} className="font-mono text-xs bg-white p-1 rounded border">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {registrationStep === 'identity-verification' && (
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Identity Verification Required</AlertTitle>
                <AlertDescription className="text-blue-700">
                  To ensure security for all members and comply with financial regulations,
                  we need to verify your identity. This is a one-time process.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">Select ID Type</h3>
                <RadioGroup 
                  value={verificationType} 
                  onValueChange={(v) => setVerificationType(v as VerificationType)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value={VerificationType.GOVERNMENT_ID} id="id-type-1" />
                    <Label htmlFor="id-type-1" className="flex items-center cursor-pointer">
                      <CreditCard className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <span className="block font-medium">Government ID</span>
                        <span className="block text-gray-500 text-sm">National ID, residence permit, etc.</span>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value={VerificationType.PASSPORT} id="id-type-2" />
                    <Label htmlFor="id-type-2" className="flex items-center cursor-pointer">
                      <FileText className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <span className="block font-medium">Passport</span>
                        <span className="block text-gray-500 text-sm">International passport document</span>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value={VerificationType.DRIVERS_LICENSE} id="id-type-3" />
                    <Label htmlFor="id-type-3" className="flex items-center cursor-pointer">
                      <FileText className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <span className="block font-medium">Driver's License</span>
                        <span className="block text-gray-500 text-sm">Valid driver's license with photo</span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-sm text-gray-500 mb-2">What to expect:</h3>
                <ul className="text-sm space-y-1 text-gray-700 pl-5 list-disc">
                  <li>You'll be redirected to our secure verification partner</li>
                  <li>You'll need to upload photos of your ID document</li>
                  <li>You'll take a quick selfie for face matching</li>
                  <li>Verification usually takes 1-2 business days</li>
                </ul>
              </div>
              
              <Button
                onClick={startIdentityVerification} 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Verification'
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our <Link href="#" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link href="#" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
    </ClientComponentBoundary>
  );
}