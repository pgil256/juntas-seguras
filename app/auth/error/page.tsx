"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import ClientComponentBoundary from "../../ClientComponentBoundary";

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
    <ClientComponentBoundary>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Authentication Error</CardTitle>
            <CardDescription className="text-center">
              There was a problem with your sign in attempt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {errorMessage}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button
              onClick={() => window.location.href = "/auth/signin"}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientComponentBoundary>
  );
}