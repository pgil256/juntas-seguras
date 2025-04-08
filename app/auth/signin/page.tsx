"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import VerificationPopup from '@/components/auth/VerificationPopup';
import { useToast } from "@/hooks/use-toast";
import { TwoFactorMethod } from "../../../types/security";
import ClientComponentBoundary from '../../ClientComponentBoundary';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loginAttempted && status === "authenticated") {
      console.log('Session authenticated. Checking for MFA requirement:', session);
      if (session?.requiresMfa) {
        console.log('MFA required detected in authenticated session.');
        setShowMfaModal(true);
        setError("");
        setLoginAttempted(false);
      } else {
        console.log('MFA not required in authenticated session. Redirecting...');
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
      }
    }
  }, [status, session, loginAttempted, router, searchParams]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLoginAttempted(false);
    setShowMfaModal(false);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        mfaCode: undefined,
        redirect: false,
      });

      console.log('Initial signIn result:', result);

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        console.log('Initial signIn call OK. Setting loginAttempted=true to check session.');
        setLoginAttempted(true);
      } else {
        setError("An unexpected error occurred during sign in.");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (code: string) => {
    setError("");
    setIsLoading(true);
    try {
      console.log(`Submitting MFA code: ${code}`);
      const result = await signIn("credentials", {
        email,
        password,
        mfaCode: code,
        redirect: false,
      });

      console.log('MFA verification signIn result:', result);

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        setShowMfaModal(false);
        toast({ title: "Sign in Successful", description: "Welcome back!" });
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
      } else {
        setError("MFA verification failed unexpectedly.");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during MFA verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!session?.user?.id || !email) {
      toast({ title: "Error", description: "Cannot resend code. Session or email missing.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch('/api/security/two-factor/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          method: session.mfaMethod || 'email',
          email: email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }
      toast({ title: "Code Resent", description: "A new verification code has been sent." });
      if (process.env.NODE_ENV === 'development' && data.verificationCode) {
         setError(`Dev code: ${data.verificationCode}`);
      }
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend verification code');
      toast({ title: "Resend Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <ClientComponentBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleInitialSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="text-center">
                    <Link
                      href="/auth/signup"
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Create a new account
                    </Link>
                  </div>
                  <div className="text-center">
                    <Link
                      href="/auth/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <VerificationPopup
          isOpen={showMfaModal}
          onClose={() => {
            setShowMfaModal(false);
            setError("");
          }}
          onVerify={handleMfaVerify}
          onResend={handleResendCode}
          verificationMethod={session?.mfaMethod || 'email'}
          isLoading={isLoading}
          error={error}
          emailForDisplay={email}
        />
      </Suspense>
    </ClientComponentBoundary>
  );
}

export default function SignInPage() {
  return <SignInForm />;
}