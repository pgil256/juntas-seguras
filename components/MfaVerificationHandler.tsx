"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import VerificationPopup from './auth/VerificationPopup';
import { useToast } from "@/hooks/use-toast";

export default function MfaVerificationHandler() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  // Check if MFA is required on initial load or session change
  useEffect(() => {
    if (status === "authenticated" && session?.requiresMfa) {
      console.log("*** MFA REQUIRED ***", { session });
      setShowMfaModal(true);
      
      // Get the email from the session if available
      if (session.user?.email) {
        setEmail(session.user.email);
      }
    } else {
      console.log("No MFA required", { status, session });
    }
  }, [status, session]);

  const handleMfaVerify = async (code: string) => {
    setError("");
    setIsLoading(true);
    
    if (!session?.user?.email) {
      setError("Email is missing. Please sign in again.");
      setIsLoading(false);
      return;
    }
    
    try {
      console.log(`Submitting MFA code: ${code} for ${session.user.email}`);
      const result = await signIn("credentials", {
        email: session.user.email,
        password: "placeholder-not-used", // Not actually used for verification
        mfaCode: code,
        redirect: false,
      });

      console.log('MFA verification result:', result);

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        setShowMfaModal(false);
        toast({ title: "Verification Successful", description: "You are now signed in" });
        // Force a session update to remove requiresMfa flag
        await update();
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (error: any) {
      console.error("MFA verification error:", error);
      setError(error.message || "An error occurred during verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!session?.user?.id || !email) {
      toast({ title: "Error", description: "Cannot resend code. Session or email missing." });
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Use a simpler API to resend code - direct to the MFA service
      const response = await fetch('/api/auth/resend-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }
      
      toast({ title: "Code Sent", description: "A new verification code has been sent to your email" });
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if MFA is not required
  if (!session?.requiresMfa || !showMfaModal) {
    return null;
  }

  // Render with highest possible z-index
  return (
    <>
      {session?.requiresMfa && showMfaModal && (
        <VerificationPopup
          isOpen={true}
          onClose={() => {
            setError("Verification is required to continue");
          }}
          onVerify={handleMfaVerify}
          onResend={handleResendCode}
          isLoading={isLoading}
          error={error}
          emailForDisplay={email}
        />
      )}
    </>
  );
} 