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
  Info,
} from 'lucide-react';

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
    makeContribution,
  } = usePoolContributions({ poolId, userEmail });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  // Load contribution status when modal opens
  useEffect(() => {
    if (isOpen) {
      getContributionStatus();
      setResult(null);
    }
  }, [isOpen, getContributionStatus]);

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleMakeContribution = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await makeContribution();
      setResult({
        success: response.success,
        message: response.success ? response.message : response.error,
      });

      if (response.success && onContributionSuccess) {
        onContributionSuccess();
      }
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
  const canContribute = !isRecipient && !hasContributed;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
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
          {isLoading && !contributionStatus && (
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
              {isRecipient && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    You're the Recipient!
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    You don't need to contribute this round. You will receive the
                    payout once all other members have contributed.
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
                              (c) => c.hasContributed || c.isRecipient
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
                          (c) => c.hasContributed || c.isRecipient
                        ).length
                      }
                      /{contributionStatus.contributions.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Demo mode notice */}
              {canContribute && (
                <Alert className="bg-gray-50 border-gray-200">
                  <Info className="h-4 w-4 text-gray-600" />
                  <AlertTitle className="text-gray-800">Demo Mode</AlertTitle>
                  <AlertDescription className="text-gray-600">
                    This is a demo contribution. In production, this would connect
                    to a payment processor.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {result?.success ? (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              {canContribute && (
                <Button
                  onClick={handleMakeContribution}
                  disabled={isSubmitting || isLoading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Confirm Contribution
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
