"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import ClientOnly from "../../../components/ClientOnly";

export default function AuthError() {
  const [errorMessage, setErrorMessage] = useState<string>("An authentication error occurred");
  
  useEffect(() => {
    // Get error parameter from URL safely
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    
    // Map error codes to user-friendly messages
    if (error === "CredentialsSignin") {
      setErrorMessage("Invalid email or password.");
    } else if (error === "OAuthAccountNotLinked") {
      setErrorMessage("Email already exists with different provider.");
    } else if (error === "EmailSignin") {
      setErrorMessage("Check your email for a sign-in link.");
    } else if (error === "Configuration") {
      setErrorMessage("Server configuration error. Please contact support.");
    } else if (error === "AccessDenied") {
      setErrorMessage("Access denied. You might not have permission to sign in.");
    } else if (error) {
      setErrorMessage(`Authentication error: ${error}`);
    }
  }, []);

  return (
    <ClientOnly>
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="mb-8">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JS</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Juntas Seguras</span>
          </a>
        </div>
        <Card className="w-full max-w-md border border-gray-100 shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Something went wrong</CardTitle>
            <CardDescription>
              There was a problem with your sign-in attempt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMessage}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = "/auth/signin"}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientOnly>
  );
}