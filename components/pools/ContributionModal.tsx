'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { usePoolContributions } from '../../lib/hooks/usePoolContributions';
import {
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Award,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  generatePayoutLink,
  getPayoutMethodLabel,
  supportsDeepLink,
  type PayoutMethodType,
} from '../../lib/payments/deep-links';

interface AdminPaymentMethods {
  venmo?: string;
  cashapp?: string;
  paypal?: string;
  zelle?: string;
  preferred?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | null;
}

interface ContributionModalProps {
  poolId: string;
  poolName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onContributionSuccess?: () => void;
}

export function ContributionModal({
  poolId,
  poolName,
  userEmail,
  isOpen,
  onClose,
  onContributionSuccess,
}: ContributionModalProps) {
  const {
    isLoading,
    error,
    contributionStatus,
    userContributionInfo,
    getContributionStatus,
  } = usePoolContributions({ poolId, userEmail });

  const [adminPaymentMethods, setAdminPaymentMethods] = useState<AdminPaymentMethods | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  // Load contribution status and admin payment methods when modal opens
  useEffect(() => {
    if (isOpen) {
      getContributionStatus();
      setResult(null);
      fetchAdminPaymentMethods();
    }
  }, [isOpen, getContributionStatus, poolId]);

  const fetchAdminPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch(`/api/pools/${poolId}/admin-payment-methods`);
      if (response.ok) {
        const data = await response.json();
        setAdminPaymentMethods(data.adminPaymentMethods || null);
      }
    } catch (err) {
      console.error('Error fetching admin payment methods:', err);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleCopyToClipboard = async (text: string, method: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMethod(method);
      setTimeout(() => setCopiedMethod(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenPaymentLink = (method: PayoutMethodType, handle: string) => {
    if (!contributionStatus) return;

    const link = generatePayoutLink(method, {
      recipientHandle: handle,
      amount: contributionStatus.contributionAmount,
      note: `${poolName} - Round ${contributionStatus.currentRound} contribution`,
    });

    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleConfirmPayment = async (paymentMethod: string) => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_manual',
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: 'Payment confirmation sent! The pool admin will verify your payment.',
        });
        if (onContributionSuccess) {
          onContributionSuccess();
        }
        // Refresh contribution status
        await getContributionStatus();
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to confirm payment',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Failed to confirm payment',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  // Determine user state
  const isRecipient = userContributionInfo?.isRecipient ?? false;
  const hasContributed = userContributionInfo?.hasContributed ?? false;
  const canContribute = !hasContributed;

  // Get available payment methods
  const availablePaymentMethods = adminPaymentMethods
    ? (['venmo', 'cashapp', 'paypal', 'zelle'] as const).filter(
        (method) => adminPaymentMethods[method]
      )
    : [];

  const preferredMethod = adminPaymentMethods?.preferred;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
            Make Contribution
          </DialogTitle>
          <DialogDescription>
            Contribute to {poolName} for Round {contributionStatus?.currentRound || '...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Loading state */}
          {(isLoading || isLoadingPaymentMethods) && !contributionStatus && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success/failure result */}
          {result && (
            <Alert
              variant={result.success ? 'default' : 'destructive'}
              className={result.success ? 'bg-green-50 border-green-200' : ''}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{result.success ? 'Success!' : 'Error'}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          {/* Main content */}
          {contributionStatus && !result?.success && (
            <>
              {/* Recipient info */}
              {contributionStatus.recipient && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center mb-2">
                    <Award className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">
                      This Round's Recipient
                    </span>
                  </div>
                  <p className="text-blue-700 font-medium">
                    {contributionStatus.recipient.name}
                  </p>
                  <p className="text-sm text-blue-600">
                    Position {contributionStatus.recipient.position} of{' '}
                    {contributionStatus.totalRounds}
                  </p>
                </div>
              )}

              {/* User is recipient */}
              {isRecipient && !hasContributed && (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">
                    You're the Recipient!
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    You will receive the payout this round! Your contribution of{' '}
                    {contributionStatus && formatCurrency(contributionStatus.contributionAmount)} goes
                    into the pool you receive. Total payout:{' '}
                    {contributionStatus && formatCurrency(
                      contributionStatus.contributionAmount * contributionStatus.contributions.length
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* User already contributed */}
              {hasContributed && !isRecipient && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">
                    Already Contributed
                  </AlertTitle>
                  <AlertDescription className="text-green-700">
                    You've already made your contribution for Round{' '}
                    {contributionStatus.currentRound}. Thank you!
                  </AlertDescription>
                </Alert>
              )}

              {/* Contribution amount */}
              {canContribute && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Contribution Amount:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(contributionStatus.contributionAmount)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Round {contributionStatus.currentRound} of{' '}
                    {contributionStatus.totalRounds}
                  </p>
                </div>
              )}

              {/* Payment Methods */}
              {canContribute && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Pay the Pool Admin</h4>

                  {availablePaymentMethods.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Payment Methods Available</AlertTitle>
                      <AlertDescription>
                        The pool admin hasn't set up payment methods yet. Please contact them directly.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {availablePaymentMethods.map((method) => {
                        const handle = adminPaymentMethods![method]!;
                        const isPreferred = method === preferredMethod;
                        const hasDeepLink = supportsDeepLink(method);

                        return (
                          <div
                            key={method}
                            className={`p-3 rounded-lg border ${
                              isPreferred
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {getPayoutMethodLabel(method)}
                                </span>
                                {isPreferred && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    Preferred
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopyToClipboard(handle, method)}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                                  title="Copy handle"
                                >
                                  {copiedMethod === method ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                                {hasDeepLink && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenPaymentLink(method, handle)}
                                    className="text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open App
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {method === 'venmo' && `@${handle}`}
                              {method === 'cashapp' && `$${handle}`}
                              {method === 'paypal' && `paypal.me/${handle}`}
                              {method === 'zelle' && handle}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleConfirmPayment(method)}
                              disabled={isSubmitting}
                              className="mt-2 w-full text-sm"
                            >
                              {isSubmitting ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              I've Paid via {getPayoutMethodLabel(method)}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Contribution progress */}
              {canContribute && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Contribution Progress:
                  </p>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${
                            (contributionStatus.contributions.filter(
                              (c) => c.hasContributed
                            ).length /
                              contributionStatus.contributions.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {
                        contributionStatus.contributions.filter(
                          (c) => c.hasContributed
                        ).length
                      }
                      /{contributionStatus.contributions.length}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {result?.success ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
