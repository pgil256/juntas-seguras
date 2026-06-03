"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "../../../hooks/use-toast";
import { FormField, FormError } from "../../../components/ui/form-field";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  // Email validation
  const validateEmail = useCallback((value: string): string => {
    if (!value.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return "";
  }, []);

  const validatePassword = useCallback((value: string): string => {
    if (!value) {
      return "Password is required";
    }
    return "";
  }, []);

  // Validate email on blur
  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  // Clear field error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailTouched && emailError) {
      setEmailError(validateEmail(e.target.value));
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordTouched && passwordError) {
      setPasswordError(validatePassword(e.target.value));
    }
  };

  useEffect(() => {
    setMounted(true);

    // Handle query param messages
    const errorParam = searchParams.get("error");
    const registered = searchParams.get("registered");

    if (registered === "true") {
      setSuccessMessage("Your account has been created successfully. Please sign in.");
    }

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        OAuthAccountNotLinked: "This email is already associated with another sign-in method. Please use your original sign-in method.",
        OAuthSignin: "Could not start the sign-in process. Please try again.",
        OAuthCallback: "Sign-in was interrupted. Please try again.",
        OAuthCreateAccount: "Could not create your account. Please try again or use a different method.",
        Callback: "An error occurred during sign-in. Please try again.",
        Default: "An unexpected error occurred. Please try again.",
      };
      setError(errorMessages[errorParam] || errorMessages.Default);
    }
  }, [searchParams, toast]);

  // Handle simple redirect after authentication
  useEffect(() => {
    if (status === "authenticated" && !session?.requiresMfa) {
      console.log('User authenticated and MFA not required. Redirecting...');
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
    }
  }, [status, session, router, searchParams]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);

    setEmailTouched(true);
    setPasswordTouched(true);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log('Initial signIn result:', result);

      if (result?.error) {
        if (!result.error.toLowerCase().includes('verification required')) {
          setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
        }
      } else if (result?.ok) {
        console.log('Sign-in successful, redirecting to dashboard...');
        
        // Force redirect to dashboard regardless of MFA status
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
      } else {
        setError("An unexpected error occurred during sign in.");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'azure-ad') => {
    setIsOAuthLoading(provider);
    setError("");
    
    try {
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      await signIn(provider, {
        callbackUrl,
        redirect: true,
      });
    } catch (error: any) {
      console.error(`${provider} sign-in error:`, error);
      setError(`Failed to sign in with ${provider === 'azure-ad' ? 'Microsoft' : 'Google'}`);
      setIsOAuthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-60 h-60 bg-indigo-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">JS</span>
            </div>
            <span className="text-2xl font-bold text-white">Juntas Seguras</span>
          </Link>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Manage your community savings with confidence
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            Track contributions, manage payouts, and build trust with full transparency for every member.
          </p>
          <div className="space-y-4">
            {[
              "Bank-grade security with MFA",
              "Support for Venmo, PayPal, Zelle",
              "Real-time contribution tracking",
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
      <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-12 xl:px-16 bg-white">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JS</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Juntas Seguras</span>
          </Link>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up for free
            </Link>
          </p>

          <div className="mt-8">
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* OAuth Sign In Options */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={!mounted || isLoading || isOAuthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOAuthLoading === 'google' ? (
                <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>{isOAuthLoading === 'google' ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('azure-ad')}
              disabled={!mounted || isLoading || isOAuthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOAuthLoading === 'azure-ad' ? (
                <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 23 23">
                  <path fill="#f25022" d="M0 0h11v11H0z"/>
                  <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                  <path fill="#7fba00" d="M0 12h11v11H0z"/>
                  <path fill="#ffb900" d="M12 12h11v11H12z"/>
                </svg>
              )}
              <span>{isOAuthLoading === 'azure-ad' ? 'Signing in...' : 'Continue with Microsoft'}</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-6" method="post" onSubmit={handleInitialSubmit} noValidate>
            <FormField>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {emailError && <FormError id="email-error">{emailError}</FormError>}
            </FormField>

            <FormField>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="text-sm">
                  <Link
                    href="/auth/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  className={`appearance-none block w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    passwordError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && <FormError id="password-error">{passwordError}</FormError>}
            </FormField>

            <div>
              <button
                type="submit"
                disabled={!mounted || isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          </div>
        </div>
      </div>
    </div>
  );
} 
