'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

/**
 * EmailVerificationModal - A super simplified standalone MFA verification component
 * That avoids loading app/auth/layout.js or any other problematic chunks
 */
export default function EmailVerificationModal() {
  const { data: session, status, update } = useSession();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Check if MFA is required on session change
  useEffect(() => {
    // ONLY show modal if status is definitively known, user is authenticated, AND requires MFA
    if (status !== 'loading' && status === 'authenticated' && session?.requiresMfa) {
      console.log('*** EmailVerificationModal: MFA Required - Showing Modal ***');
      setShowModal(true);
      if (session.user?.email) {
        setEmail(session.user.email);
      }
    } else {
      // Otherwise, ensure the modal is hidden
      // This covers loading, unauthenticated, or authenticated-but-MFA-not-required states
      if (showModal) { // Only log/set if it was previously shown
        console.log(`*** EmailVerificationModal: Hiding Modal (Status: ${status}, Requires MFA: ${session?.requiresMfa}) ***`);
        setShowModal(false);
      }
    }
  }, [session, status, showModal]); // Add showModal to dependencies

  // Don't show anything if modal state is false
  if (!showModal) {
    return null;
  }

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log(`Verifying code: ${verificationCode}`);
      
      // Login again with the verification code
      const result = await signIn('credentials', {
        email: session?.user?.email,
        password: 'placeholder-not-used', // Not actually used
        mfaCode: verificationCode,
        redirect: false, // Keep redirect false
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        console.log('MFA verification OK. Session should update automatically.');
        // Force update session to remove MFA requirement
        // const updatedSession = await update(); // Temporarily removed for testing
        // console.log('Updated session after MFA verify:', updatedSession);
        // if (updatedSession && !updatedSession.requiresMfa) {
            setShowModal(false); // Close the modal
            // The user should now be on the correct page (likely /dashboard)
            // due to the initial redirect logic or previous state.
            console.log('MFA complete, modal closed.');
        // } else {
        //     setError('MFA verification succeeded but session still requires MFA. Please try again or contact support.');
        // }
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification code');
      }

      setError('New verification code sent to your email');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple inline styles for the modal
  const modalStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 9999,
  };

  const contentStyles: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    marginTop: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    width: '100%',
  };

  const secondaryButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    marginRight: '8px',
  };

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
    marginTop: '8px',
    textAlign: 'center',
    letterSpacing: '0.2em',
  };

  const errorStyles: React.CSSProperties = {
    color: '#ef4444',
    marginTop: '8px',
    fontSize: '14px',
  };

  return (
    <div style={modalStyles}>
      <div style={contentStyles}>
        <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Email Verification Required
        </h2>
        
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#4b5563' }}>
          We've sent a verification code to {email}. Please enter it below:
        </p>

        {/* DEV MODE HINT */}
        <p style={{ marginBottom: '16px', fontSize: '12px', color: '#f59e0b', textAlign: 'center', fontWeight: 500 }}>
          (Dev Mode: Use code 123456)
        </p>

        {error && <p style={errorStyles}>{error}</p>}

        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          maxLength={6}
          placeholder="6-digit code"
          style={inputStyles}
          disabled={isLoading}
        />

        <div style={{ display: 'flex', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            style={secondaryButtonStyles}
          >
            {isLoading ? 'Sending...' : 'Resend Code'}
          </button>
          
          <button
            type="button"
            onClick={handleVerify}
            disabled={isLoading || verificationCode.length !== 6}
            style={buttonStyles}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
} 