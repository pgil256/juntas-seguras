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
      console.log("MFA required globally, showing verification popup");
      setShowMfaModal(true);
      
      // Get the email from the session if available
      if (session.user?.email) {
        setEmail(session.user.email);
      }
      
      // IMPORTANT: Prevent any navigation attempts while MFA is required
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "MFA verification is required to continue. Please complete verification.";
        return "MFA verification is required to continue. Please complete verification.";
      };
      
      // Add event listener to prevent navigation
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
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
      console.log(`Submitting MFA code globally: ${code}`);
      // We need to sign in again with the MFA code
      const result = await signIn("credentials", {
        email: session.user.email,
        password: "placeholder-not-used", // Not actually used for verification
        mfaCode: code,
        redirect: false,
      });

      console.log('Global MFA verification signIn result:', result);

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        setShowMfaModal(false);
        toast({ title: "Verification Successful", description: "You are now fully authenticated." });
        // Force a session update to remove requiresMfa flag
        await update();
      } else {
        setError("Verification failed unexpectedly.");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during verification");
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

  // Only render the popup if MFA is required
  if (!session?.requiresMfa) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center" 
      style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Add a higher opacity overlay to prevent seeing content underneath */}
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      
      <div className="relative z-50">
        <VerificationPopup
          isOpen={showMfaModal}
          onClose={() => {
            // Don't allow closing without verifying
            // User must complete MFA verification
            setError("Verification is required to continue.");
          }}
          onVerify={handleMfaVerify}
          onResend={handleResendCode}
          verificationMethod={session?.mfaMethod || 'email'}
          isLoading={isLoading}
          error={error}
          emailForDisplay={email}
        />
      </div>
    </div>
  );
} 