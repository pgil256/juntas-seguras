'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Textarea } from '../../../components/ui/textarea';
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  UserPlus,
  Clock,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { RulesAcknowledgmentDialog } from '../../../components/pools/RulesAcknowledgmentDialog';
import { PoolOnboardingModal } from '../../../components/payments/PoolOnboardingModal';

function JoinPoolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [invitationCode, setInvitationCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [joinedPoolData, setJoinedPoolData] = useState<{ id: string; name: string; contributionAmount: number; frequency: string } | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setInvitationCode(code);
      validateInvitation(code);
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Redirect to sign in with callback URL
      const callbackUrl = `/pools/join${invitationCode ? `?code=${invitationCode}` : ''}`;
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, invitationCode, router]);

  const validateInvitation = async (code: string) => {
    if (!code) {
      setError('Please enter an invitation code');
      return;
    }

    setIsValidating(true);
    setError('');
    setValidationResult(null);

    try {
      const response = await fetch(`/api/pools/invitations/validate?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Invalid invitation code');
        setValidationResult(null);
      } else {
        setValidationResult(data);
      }
    } catch (err) {
      setError('Failed to validate invitation code');
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitationCode || !session?.user) return;

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/pools/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
      } else {
        // Store pool data for onboarding modal
        setJoinedPoolData({
          id: data.pool.id,
          name: validationResult.pool.name,
          contributionAmount: validationResult.pool.contributionAmount,
          frequency: validationResult.pool.frequency,
        });
        // Show onboarding modal (payment + payout setup)
        setShowRulesDialog(false);
        setShowOnboardingModal(true);
      }
    } catch (err) {
      setError('Failed to process invitation');
      console.error('Accept error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);
    if (joinedPoolData) {
      router.push(`/pools/${joinedPoolData.id}`);
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingModal(false);
    if (joinedPoolData) {
      router.push(`/pools/${joinedPoolData.id}`);
    }
  };

  const handleRejectInvitation = async () => {
    if (!invitationCode || !session?.user) return;

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/pools/invitations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          invitationCode,
          reason: rejectReason 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reject invitation');
      } else {
        // Show success message and redirect
        setValidationResult(null);
        setInvitationCode('');
        router.push('/my-pool');
      }
    } catch (err) {
      setError('Failed to process rejection');
      console.error('Reject error:', err);
    } finally {
      setIsProcessing(false);
      setShowRejectDialog(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Join a Savings Pool
          </CardTitle>
          <CardDescription>
            Enter your invitation code to join a savings pool
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!validationResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Invitation Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter your invitation code"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    disabled={isValidating}
                  />
                  <Button
                    onClick={() => validateInvitation(invitationCode)}
                    disabled={isValidating || !invitationCode}
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {validationResult && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Valid Invitation</AlertTitle>
                <AlertDescription>
                  You&apos;ve been invited to join {validationResult.pool.name}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-lg">{validationResult.pool.name}</h3>
                  {validationResult.pool.description && (
                    <p className="text-gray-600">{validationResult.pool.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Contribution</p>
                        <p className="font-medium">${validationResult.pool.contributionAmount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Frequency</p>
                        <p className="font-medium capitalize">{validationResult.pool.frequency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Members</p>
                        <p className="font-medium">{validationResult.pool.memberCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Expires</p>
                        <p className="font-medium">
                          {validationResult.invitation.expiresAt
                            ? new Date(validationResult.invitation.expiresAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {validationResult.invitation.message && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-1">Personal Message:</p>
                    <p className="text-sm text-blue-800">{validationResult.invitation.message}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Invited by: <span className="font-medium">
                      {validationResult.invitation.invitedBy?.name || validationResult.invitation.invitedBy?.email}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Sent on: <span className="font-medium">
                      {validationResult.invitation.sentDate
                        ? new Date(validationResult.invitation.sentDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </p>
                </div>
              </div>

              {showRejectDialog && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for declining (optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Let them know why you're declining..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectDialog(false);
                        setRejectReason('');
                      }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRejectInvitation}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Confirm Decline
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        {validationResult && !showRejectDialog && (
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
            >
              Decline Invitation
            </Button>
            <Button
              onClick={() => setShowRulesDialog(true)}
              disabled={isProcessing}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Accept & Join Pool
            </Button>
          </CardFooter>
        )}

        {validationResult && (
          <RulesAcknowledgmentDialog
            open={showRulesDialog}
            onOpenChange={setShowRulesDialog}
            poolName={validationResult.pool.name}
            contributionAmount={validationResult.pool.contributionAmount}
            frequency={validationResult.pool.frequency}
            onAccept={handleAcceptInvitation}
            isProcessing={isProcessing}
          />
        )}

        {/* Onboarding Modal - payment method + payout account setup */}
        {joinedPoolData && (
          <PoolOnboardingModal
            isOpen={showOnboardingModal}
            onClose={handleOnboardingClose}
            onComplete={handleOnboardingComplete}
            poolId={joinedPoolData.id}
            poolName={joinedPoolData.name}
            contributionAmount={joinedPoolData.contributionAmount}
            frequency={joinedPoolData.frequency}
          />
        )}
      </Card>
    </div>
  );
}

export default function JoinPoolPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <JoinPoolContent />
    </Suspense>
  );
}