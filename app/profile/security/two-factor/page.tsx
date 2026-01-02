'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import TwoFactorSetup from '../../../../components/security/TwoFactorSetup';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { ChevronLeft, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { useSession } from 'next-auth/react';

export default function TwoFactorPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || null;
  const router = useRouter();
  const [setupMode, setSetupMode] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    method?: string;
    lastUpdated?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the current 2FA status
  useEffect(() => {
    async function fetchTwoFactorStatus() {
      try {
        setLoading(true);
        setError(null);
        
        if (!userId) {
          setError('You must be logged in to manage two-factor authentication');
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/security/two-factor/setup?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch two-factor authentication status');
        }
        
        const data = await response.json();
        setTwoFactorStatus(data);
      } catch (error: any) {
        console.error('Failed to fetch 2FA status:', error);
        setError(error.message || 'Failed to load two-factor authentication status');
        setTwoFactorStatus(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTwoFactorStatus();
  }, [setupMode, userId]);

  const startSetup = () => {
    setSetupMode(true);
  };

  const cancelSetup = () => {
    setSetupMode(false);
  };

  const completedSetup = () => {
    setSetupMode(false);
    // In a real app, you'd also update the user's authentication context
  };

  const disableTwoFactor = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userId) {
        setError('You must be logged in to manage two-factor authentication');
        return;
      }
      // Make API call to disable 2FA
      const response = await fetch(`/api/security/two-factor/setup?userId=${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable two-factor authentication');
      }
      
      // Update local state after success
      setTwoFactorStatus({
        enabled: false
      });
    } catch (error: any) {
      console.error('Failed to disable 2FA:', error);
      setError(error.message || 'Failed to disable two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  // Render the appropriate content based on setup mode
  const renderContent = () => {
    if (setupMode) {
      return (
        <TwoFactorSetup
          userId={userId || ''}
          onSetupComplete={completedSetup}
          onCancel={cancelSetup}
        />
      );
    }

    if (loading) {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center">
              <div className="h-8 w-8 rounded-full border-t-2 border-b-2 border-gray-900 animate-spin mb-4"></div>
              <p className="text-gray-500">Loading security settings...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="w-full max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Alert>
      );
    }

    if (twoFactorStatus?.enabled) {
      // Show the enabled status and options
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Your account has an extra layer of security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Enabled</AlertTitle>
              <AlertDescription className="text-green-700">
                Two-factor authentication is active on your account
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Authentication Method</p>
                  <p className="text-xs text-gray-500">
                    {twoFactorStatus.method === 'app' ? 'Authenticator App' :
                     twoFactorStatus.method === 'email' ? 'Email' : 'Unknown Method'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={startSetup}>
                  Change
                </Button>
              </div>
              
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-xs text-gray-500">
                  {twoFactorStatus.lastUpdated ? 
                    new Date(twoFactorStatus.lastUpdated).toLocaleDateString() : 
                    'Unknown'}
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={disableTwoFactor}
                >
                  Disable Two-Factor Authentication
                </Button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  This will remove the additional security from your account
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Show the initial setup options
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center bg-blue-50 p-4 rounded-md border border-blue-100">
            <Shield className="h-8 w-8 text-blue-500 mr-4" />
            <div>
              <p className="text-sm font-medium text-blue-800">Protect your account</p>
              <p className="text-xs text-blue-600 mt-1">
                Two-factor authentication adds an additional security layer to your account, helping to ensure that only you can access it, even if your password is compromised.
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">How it works</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="bg-gray-200 text-gray-700 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                <span>Set up an authentication method (app or email)</span>
              </li>
              <li className="flex items-start">
                <span className="bg-gray-200 text-gray-700 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                <span>When you sign in, enter your password as usual</span>
              </li>
              <li className="flex items-start">
                <span className="bg-gray-200 text-gray-700 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                <span>You'll be prompted for a verification code from your chosen method</span>
              </li>
            </ul>
          </div>
          
          <Button onClick={startSetup} className="w-full">
            Set Up Two-Factor Authentication
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/profile')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Button>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}