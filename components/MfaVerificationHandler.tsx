"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import VerificationPopup from './auth/VerificationPopup';
import { useToast } from "../hooks/use-toast";

export default function MfaVerificationHandler() {
  const { data: session, status, update } = useSession();
  const { toast } = useToast();
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  // Mount effect and get pathname
  useEffect(() => {
    setIsMounted(true);
    // Use window.location.pathname instead of usePathname to avoid router issues
    setCurrentPath(window.location.pathname);
  }, []);

  // Check if MFA is required on initial load or session change
  useEffect(() => {
    // Don't run until mounted
    if (!isMounted) return;
    
    // No need to check if not authenticated or no session
    if (status !== "authenticated" || !session) {
      setShowMfaModal(false);
      return;
    }

    // Don't show MFA popup unless explicitly required
    if (!session.requiresMfa) {
      if (showMfaModal) {
        console.log("*** CLEARING MFA MODAL - No longer required ***");
        setShowMfaModal(false);
      }
      return;
    }

    // Define pages where MFA popup should NOT appear
    const isOnAuthPage = currentPath.startsWith('/auth/');
    const isOnMfaPage = currentPath.includes('/mfa/verify');
    const isOnPublicPage = currentPath === '/' || 
                          currentPath.startsWith('/help/') || 
                          currentPath.startsWith('/about') ||
                          currentPath.startsWith('/search') ||
                          currentPath === '/contact';
    
    // Only show MFA modal on protected pages that actually need it
    const isOnProtectedPage = currentPath.startsWith('/dashboard') ||
                             currentPath.startsWith('/profile') ||
                             currentPath.startsWith('/pools') ||
                             currentPath.startsWith('/payments') ||
                             currentPath.startsWith('/settings') ||
                             currentPath.startsWith('/notifications') ||
                             currentPath.startsWith('/my-pool') ||
                             currentPath.startsWith('/create-pool') ||
                             currentPath.startsWith('/member-management') ||
                             currentPath.startsWith('/analytics');
    
    // Don't show MFA popup on auth pages, MFA pages, or public pages
    if (isOnAuthPage || isOnMfaPage || isOnPublicPage) {
      if (showMfaModal) {
        console.log("*** CLEARING MFA MODAL - On excluded page ***", { currentPath });
        setShowMfaModal(false);
      }
      return;
    }
    
    // Only show MFA popup if on a protected page that requires it
    if (!isOnProtectedPage) {
      if (showMfaModal) {
        console.log("*** CLEARING MFA MODAL - Not on protected page ***", { currentPath });
        setShowMfaModal(false);
      }
      return;
    }
    
    console.log("*** MFA REQUIRED FOR PROTECTED PAGE ***", { 
      path: currentPath,
      requiresMfa: session.requiresMfa
    });
    
    // First check if the user actually has MFA enabled in the database
    // If not, force a session refresh to clear the requiresMfa flag
    const checkMfaStatus = async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.ok) {
          const profile = await response.json();
          if (!profile.twoFactorAuth?.enabled) {
            console.log('User does not have MFA enabled, refreshing session...');
            await update(); // This should trigger JWT callback to refresh MFA status
            return;
          }
        }
      } catch (error) {
        console.error('Error checking MFA status:', error);
      }
      
      // If we get here, show the MFA modal
      setShowMfaModal(true);
      
      // Get the email from the session if available
      if (session.user?.email) {
        setEmail(session.user.email);
      }
    };
    
    checkMfaStatus();
  }, [status, session, currentPath, update, showMfaModal, isMounted]);

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
      
      // First try direct API call to verify MFA
      const apiResponse = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (apiResponse.ok) {
        // If successful, close modal first, then update session
        setShowMfaModal(false);
        setError("");
        
        // Update session to clear requiresMfa flag
        await update();
        
        toast({ 
          title: "Verification Successful", 
          description: "You are now fully authenticated" 
        });
        return;
      } else {
        // Log the API error for debugging
        const errorData = await apiResponse.json();
        console.error('MFA API verification failed:', errorData);
        setError(errorData.error || 'Verification failed');
        return;
      }
    } catch (error) {
      console.error("MFA verification error:", error);
      setError(error instanceof Error ? error.message : "An error occurred during verification");
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
    } catch (err) {
      console.error('Resend code error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend verification code');
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
            // Don't allow closing - MFA is required
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