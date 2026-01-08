'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function TotpSetup() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const setupTotp = async () => {
      if (status === 'authenticated') {
        try {
          setIsLoading(true);
          // Call the API route instead of directly using the function
          const response = await fetch('/api/auth/totp-setup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to set up TOTP');
          }
          
          const data = await response.json();
          setSecret(data.secret);
          setQrCode(data.qrCode);
        } catch (error) {
          setError('Failed to generate TOTP setup. Please try again.');
          console.error('TOTP setup error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    setupTotp();
  }, [status, session]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('TOTP setup successful! You can now use your authenticator app for 2FA.');
        setTimeout(() => {
          router.push('/settings');
        }, 2000);
      } else {
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set up TOTP Authentication
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Step 1: Scan QR Code</h3>
            <p className="text-sm text-gray-500 mb-4">
              Open your authenticator app (like Google Authenticator, Microsoft Authenticator, or Authy) and scan this QR code.
            </p>
            {qrCode && (
              <div className="flex justify-center">
                <Image
                  src={qrCode}
                  alt="TOTP QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Step 2: Enter Secret Key</h3>
            <p className="text-sm text-gray-500 mb-2">
              If you can't scan the QR code, you can enter this secret key manually:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
              {secret}
            </div>
          </div>

          <form onSubmit={handleVerification} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Step 3: Enter Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter 6-digit code from your app"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify and Enable TOTP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 