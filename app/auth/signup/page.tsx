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
import { Mail, CreditCard, FileText, AlertTriangle, Loader2, Shield } from "lucide-react";
import { VerificationType, VerificationMethod } from "../../../types/identity";
import VerificationPopup from '../../../components/auth/VerificationPopup';
import { useToast } from "../../../hooks/use-toast";

import ClientOnly from '../../../components/ClientOnly';

export default function SignUp() {
  const router = useRouter();
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
  const [verificationMethod] = useState<'email'>('email');
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!name.trim() || !email.trim() || !password) {
      setError("All fields are required");
      return;
    }

    if (name.trim().length > 100) {
      setError("Name must be 100 characters or less");
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
      setMfaData(data.mfaSetup || {});
      
      // Show verification popup
      setShowVerificationPopup(true);
      toast({ title: "Registration initiated", description: "Please check your email for the verification code." });
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
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, email }),
      });

      const data = await response.json();

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify your account';
      setMfaError(errorMessage);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: errorMessage,
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

  // Render either credentials form, MFA setup form, or identity verification form
  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
          <span className="sr-only">Loading sign up</span>
        </div>
      }
    >
      {/* Verification popup overlay */}
      <VerificationPopup
        isOpen={showVerificationPopup}
        onClose={() => setShowVerificationPopup(false)}
        onVerify={handleVerify}
        onResend={handleResendCode}
        isLoading={isLoading}
        error={error}
        emailForDisplay={email}
      />

      <div className="min-h-screen flex">
        {/* Left branding panel - hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-800 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/3 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-0 w-60 h-60 bg-blue-400/10 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
            <Link href="/" className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">JS</span>
              </div>
              <span className="text-2xl font-bold text-white">Juntas Seguras</span>
            </Link>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Start saving with your community today
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed mb-8">
              Create a free account and set up your first savings pool in minutes. Invite members and start growing together.
            </p>
            <div className="space-y-4">
              {[
                "Free to create and manage pools",
                "Invite unlimited members",
                "Full transparency for every transaction",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-blue-50 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-12 xl:px-16 bg-white overflow-y-auto">
          <div className="mx-auto w-full max-w-lg">
            {/* Mobile logo */}
            <Link href="/" className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JS</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Juntas Seguras</span>
            </Link>

            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {registrationStep === 'credentials'
                  ? 'Create your account'
                  : registrationStep === 'mfa-setup'
                    ? 'Set up two-factor authentication'
                    : 'Verify your identity'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {registrationStep === 'credentials'
                  ? 'Enter your details to get started with Juntas Seguras'
                  : registrationStep === 'mfa-setup'
                    ? 'Add an extra layer of security to protect your account'
                    : 'Verify your identity to access all features'}
              </p>
            </div>
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
                    className="w-full"
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
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (570) 855-0384"
                    className="w-full"
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
                    className="w-full"
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
                    className="w-full"
                  />
                </div>
                
                                
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || isVerified}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : isVerified ? (
                    "Account Created"
                  ) : (
                    "Create Account"
                  )}
                </Button>
                
                <div className="mt-4 text-center text-sm">
                  <p className="text-gray-500">
                    By signing up, you agree to our{' '}
                    <Link href="/terms" className="text-blue-700 underline underline-offset-2 hover:text-blue-600">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-blue-700 underline underline-offset-2 hover:text-blue-600">
                      Privacy Policy
                    </Link>
                    .
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
                    
                  </RadioGroup>
                </div>
                
                                
                {mfaMethod === 'email' && (
                  <div className="p-4 border rounded-md bg-gray-50">
                    <p className="text-sm">
                      A verification code has been sent to {email}.
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Enter the 6-digit code below to verify.
                    </p>
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
                
                <form onSubmit={(e) => { e.preventDefault(); handleVerify(verificationCode); }} className="space-y-4">
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
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
