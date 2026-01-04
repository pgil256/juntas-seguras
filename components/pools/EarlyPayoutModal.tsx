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
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useEarlyPayout } from '../../lib/hooks/useEarlyPayout';
import {
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  CreditCard,
  Info,
} from 'lucide-react';

interface EarlyPayoutModalProps {
  poolId: string;
  poolName: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onPayoutSuccess?: () => void;
}

export function EarlyPayoutModal({
  poolId,
  poolName,
  userId,
  isOpen,
  onClose,
  onPayoutSuccess,
}: EarlyPayoutModalProps) {
  const {
    isLoading,
    error,
    earlyPayoutStatus,
    checkEarlyPayoutStatus,
    initiateEarlyPayout,
  } = useEarlyPayout({ poolId, userId });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  // Load early payout status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkEarlyPayoutStatus();
      setResult(null);
      setReason('');
    }
  }, [isOpen, checkEarlyPayoutStatus]);

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleInitiateEarlyPayout = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await initiateEarlyPayout(reason);

      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Early payout processed successfully',
        });
        // Notify parent component
        onPayoutSuccess?.();
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to process early payout',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Failed to process early payout',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-amber-600" />
            Initiate Early Payout
          </DialogTitle>
          <DialogDescription>
            Process payout for {poolName} before the scheduled date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Loading state */}
          {isLoading && !earlyPayoutStatus && (
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

          {/* Early payout not allowed */}
          {earlyPayoutStatus && !earlyPayoutStatus.allowed && !result && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Early Payout Not Available</AlertTitle>
              <AlertDescription className="text-amber-700">
                {earlyPayoutStatus.reason}
                {earlyPayoutStatus.missingContributions && earlyPayoutStatus.missingContributions.length > 0 && (
                  <div className="mt-2">
                    <strong>Missing contributions from:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {earlyPayoutStatus.missingContributions.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {earlyPayoutStatus.recipientConnectStatus && (
                  <div className="mt-2">
                    <strong>Stripe account status:</strong> {earlyPayoutStatus.recipientConnectStatus}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Main content when early payout is allowed */}
          {earlyPayoutStatus && earlyPayoutStatus.allowed && !result?.success && (
            <>
              {/* Confirmation details */}
              <div className="space-y-3">
                {/* Recipient info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Recipient</span>
                  </div>
                  <p className="text-blue-700 font-medium text-lg">
                    {earlyPayoutStatus.recipient?.name}
                  </p>
                  <p className="text-sm text-blue-600">
                    {earlyPayoutStatus.recipient?.email}
                  </p>
                </div>

                {/* Amount */}
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center mb-2">
                    <DollarSign className="h-5 w-5 text-emerald-600 mr-2" />
                    <span className="font-medium text-emerald-800">Amount</span>
                  </div>
                  <p className="text-emerald-700 font-medium text-2xl">
                    {formatCurrency(earlyPayoutStatus.payoutAmount || 0)}
                  </p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-xs text-gray-500">Scheduled Date</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(earlyPayoutStatus.scheduledDate || '')}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center mb-1">
                      <Clock className="h-4 w-4 text-amber-500 mr-1" />
                      <span className="text-xs text-amber-600">Processing Now</span>
                    </div>
                    <p className="text-sm font-medium text-amber-700">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Bank account info if available */}
                {earlyPayoutStatus.recipient?.stripeLast4 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600">
                        Payout to account ending in{' '}
                        <span className="font-mono font-medium">
                          {earlyPayoutStatus.recipient.stripeLast4}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm text-gray-600">
                    Reason for early payout (optional)
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter a reason for initiating early payout..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                {/* Important note */}
                <Alert className="bg-gray-50 border-gray-200">
                  <Info className="h-4 w-4 text-gray-500" />
                  <AlertDescription className="text-gray-600 text-sm">
                    Future payouts will remain on their scheduled dates. Only this round's payout
                    will be processed early.
                  </AlertDescription>
                </Alert>
              </div>
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
              {earlyPayoutStatus?.allowed && (
                <Button
                  onClick={handleInitiateEarlyPayout}
                  disabled={isSubmitting || isLoading}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Confirm Payout
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
