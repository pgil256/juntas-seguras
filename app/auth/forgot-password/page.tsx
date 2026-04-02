"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("If an account exists with this email, you will receive password reset instructions.");
      } else {
        setError(data.error || "An error occurred. Please try again.");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
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
            Don&apos;t worry, we&apos;ve got you covered
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            We&apos;ll send you a secure link to reset your password and get back to managing your savings pools.
          </p>
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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>

          <div className="mt-8">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Send reset instructions"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
