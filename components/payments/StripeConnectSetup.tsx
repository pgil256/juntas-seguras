/**
 * Stripe Connect Setup Component
 *
 * Allows users to set up their Stripe Connect account
 * to receive pool payouts
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Wallet,
  AlertTriangle,
} from 'lucide-react';

interface ConnectStatus {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  accountId?: string;
}

interface StripeConnectSetupProps {
  onStatusChange?: (status: ConnectStatus) => void;
}

export function StripeConnectSetup({ onStatusChange }: StripeConnectSetupProps) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get account status');
      }

      setStatus(data);
      onStatusChange?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check for URL params (returning from Stripe)
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      // Refresh status after successful onboarding
      fetchStatus();
    }
    if (params.get('refresh') === 'true') {
      // User needs to complete onboarding
      fetchStatus();
    }
  }, []);

  // Create new Connect account
  const handleCreateAccount = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      setActionLoading(false);
    }
  };

  // Continue onboarding
  const handleContinueOnboarding = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'onboarding' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get onboarding link');
      }

      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue onboarding');
      setActionLoading(false);
    }
  };

  // Open Stripe dashboard
  const handleOpenDashboard = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dashboard' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open dashboard');
      }

      window.open(data.dashboardUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open dashboard');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading payout settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payout Account
        </CardTitle>
        <CardDescription>
          Set up your account to receive pool payouts directly to your bank account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* No account yet */}
        {!status?.hasAccount && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need to set up a payout account before you can receive pool payouts.
                This is a secure process powered by Stripe.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleCreateAccount}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Set Up Payout Account
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Account exists but not complete */}
        {status?.hasAccount && !status.detailsSubmitted && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Incomplete</Badge>
              <span className="text-sm text-muted-foreground">
                Additional information required
              </span>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete your account setup to start receiving payouts.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleContinueOnboarding}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Complete Setup
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Account complete but payouts not enabled */}
        {status?.hasAccount && status.detailsSubmitted && !status.payoutsEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Pending</Badge>
              <span className="text-sm text-muted-foreground">
                Account under review
              </span>
            </div>
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Your account is being reviewed by Stripe. This usually takes 1-2 business days.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={() => fetchStatus()}
              disabled={actionLoading}
              className="w-full"
            >
              Refresh Status
            </Button>
          </div>
        )}

        {/* Fully set up */}
        {status?.hasAccount && status.payoutsEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Badge variant="default" className="bg-green-500">
                Active
              </Badge>
              <span className="text-sm text-muted-foreground">
                Ready to receive payouts
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your payout account is fully set up. Pool payouts will be sent directly
              to your connected bank account.
            </p>
            <Button
              variant="outline"
              onClick={handleOpenDashboard}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  View Payout Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StripeConnectSetup;
