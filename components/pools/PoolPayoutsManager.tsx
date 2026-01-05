'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePoolPayouts } from '../../lib/hooks/usePoolPayouts';
import { useEarlyPayout } from '../../lib/hooks/useEarlyPayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { EarlyPayoutModal } from './EarlyPayoutModal';
import { DollarSign, Users, Calendar, Award, Clock, Check, X, AlertTriangle, Loader2, Lock, Zap, Wallet, Copy, ExternalLink } from 'lucide-react';
import {
  generateJuntaPayoutLink,
  getPayoutMethodLabel as getPayoutLabel,
  getManualPaymentInstructions,
  supportsDeepLink,
  PayoutMethodType,
} from '../../lib/payments/deep-links';

interface PoolPayoutsManagerProps {
  poolId: string;
  userId: string;
  isAdmin: boolean;
  poolName: string;
  onPayoutSuccess?: () => void;
}

export function PoolPayoutsManager({ poolId, userId, isAdmin, poolName, onPayoutSuccess }: PoolPayoutsManagerProps) {
  const {
    isLoading,
    error,
    payoutStatus,
    checkPayoutStatus,
    processPayout
  } = usePoolPayouts({ poolId, userId });

  const {
    earlyPayoutStatus,
    checkEarlyPayoutStatus,
  } = useEarlyPayout({ poolId, userId });

  const [processingPayout, setProcessingPayout] = useState(false);
  const [payoutResult, setPayoutResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [showEarlyPayoutModal, setShowEarlyPayoutModal] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);

  // Helper to get payout method label - use imported function
  const getPayoutMethodLabel = (type: string) => {
    return getPayoutLabel(type as PayoutMethodType);
  };

  // Copy payout handle to clipboard
  const copyPayoutHandle = (handle: string) => {
    navigator.clipboard.writeText(handle);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  // Generate payment link based on payout method type with note support
  const getPaymentLink = (type: string, handle: string, amount?: number) => {
    if (!amount) {
      // Without amount, generate a simple link
      return generateJuntaPayoutLink(
        type as PayoutMethodType,
        handle,
        0,
        poolName
      );
    }

    // Generate link with amount and pool name as note
    return generateJuntaPayoutLink(
      type as PayoutMethodType,
      handle,
      amount,
      poolName,
      payoutStatus?.round
    );
  };

  // Load status on mount
  useEffect(() => {
    checkPayoutStatus();
    // Also check early payout status if user is admin
    if (isAdmin) {
      checkEarlyPayoutStatus();
    }
  }, [checkPayoutStatus, checkEarlyPayoutStatus, isAdmin]);

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate contribution progress percentage
  // UNIVERSAL CONTRIBUTION MODEL: All members must contribute, including recipient
  const getContributionProgress = () => {
    if (!payoutStatus?.contributionStatus?.length) return 0;

    const totalMembers = payoutStatus.contributionStatus.length;
    // All members must contribute - no special handling for recipient
    const contributedMembers = payoutStatus.contributionStatus.filter(m => m.contributed).length;

    return (contributedMembers / totalMembers) * 100;
  };

  // Handle payout button click
  const handleProcessPayout = async () => {
    setProcessingPayout(true);
    setPayoutResult(null);

    try {
      const result = await processPayout();
      setPayoutResult(result);

      // Reload status after processing and notify parent
      if (result.success) {
        await checkPayoutStatus();
        // Call the callback to refresh pool data in parent component
        onPayoutSuccess?.();
      }
    } finally {
      setProcessingPayout(false);
    }
  };

  // Handle early payout success
  const handleEarlyPayoutSuccess = async () => {
    await checkPayoutStatus();
    await checkEarlyPayoutStatus();
    onPayoutSuccess?.();
  };

  // Check if early payout is available
  // Early payout is available when:
  // 1. User is admin
  // 2. Payout not already processed
  // 3. All contributions are received
  // 4. Current date is before scheduled payout date
  const canShowEarlyPayoutButton = isAdmin &&
    payoutStatus &&
    !payoutStatus.payoutProcessed &&
    payoutStatus.allContributionsReceived &&
    payoutStatus.nextPayoutDate &&
    new Date() < new Date(payoutStatus.nextPayoutDate);

  if (isLoading && !payoutStatus) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error && !payoutStatus) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Round {payoutStatus?.round} of {payoutStatus?.totalRounds} Payouts</span>
          {payoutStatus?.payoutProcessed ? (
            <span className="text-sm font-normal bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Payout Complete
            </span>
          ) : payoutStatus?.allContributionsReceived ? (
            <span className="text-sm font-normal bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Ready for Payout
            </span>
          ) : (
            <span className="text-sm font-normal bg-amber-100 text-amber-800 px-3 py-1 rounded-full flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Awaiting Contributions
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {payoutResult && (
          <Alert variant={payoutResult.success ? 'default' : 'destructive'} className={payoutResult.success ? 'bg-green-50 border-green-200' : ''}>
            <AlertTitle>{payoutResult.success ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{payoutResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Round and recipient info */}
        {payoutStatus && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex items-center mb-2">
                  <Award className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-blue-800">Current Recipient</h3>
                </div>
                <p className="text-blue-700 font-medium text-lg">
                  {payoutStatus.recipient.name}
                </p>
                <p className="text-blue-600 text-sm">
                  {payoutStatus.recipient.email}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-md border border-emerald-100">
                <div className="flex items-center mb-2">
                  <DollarSign className="h-5 w-5 text-emerald-600 mr-2" />
                  <h3 className="font-medium text-emerald-800">Payout Amount</h3>
                </div>
                <p className="text-emerald-700 font-medium text-lg">
                  {formatCurrency(payoutStatus.payoutAmount)}
                </p>
                <p className="text-emerald-600 text-sm">
                  Platform fee: {formatCurrency(payoutStatus.platformFee)}
                </p>
              </div>
            </div>

            {/* Recipient's payout method - visible to admins */}
            {isAdmin && payoutStatus.recipient.payoutMethod && (
              <div className="p-4 bg-purple-50 rounded-md border border-purple-100">
                <div className="flex items-center mb-2">
                  <Wallet className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="font-medium text-purple-800">Recipient&apos;s Payout Method</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 font-medium">
                      {getPayoutMethodLabel(payoutStatus.recipient.payoutMethod.type)}
                    </p>
                    <p className="text-purple-600 text-lg font-mono">
                      {payoutStatus.recipient.payoutMethod.handle}
                    </p>
                    {payoutStatus.recipient.payoutMethod.displayName && (
                      <p className="text-purple-500 text-sm">
                        {payoutStatus.recipient.payoutMethod.displayName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPayoutHandle(payoutStatus.recipient.payoutMethod!.handle)}
                      className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                      title="Copy handle"
                    >
                      {copiedHandle ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Payment link button */}
                {(() => {
                  const paymentLink = getPaymentLink(
                    payoutStatus.recipient.payoutMethod.type,
                    payoutStatus.recipient.payoutMethod.handle,
                    payoutStatus.payoutAmount
                  );
                  if (paymentLink) {
                    return (
                      <a
                        href={paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Send via {getPayoutMethodLabel(payoutStatus.recipient.payoutMethod.type)}
                      </a>
                    );
                  }
                  return (
                    <p className="text-purple-500 text-xs mt-3">
                      {getManualPaymentInstructions(
                        payoutStatus.recipient.payoutMethod.type as PayoutMethodType,
                        payoutStatus.recipient.payoutMethod.handle
                      )}
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Warning if recipient hasn't set up payout method */}
            {isAdmin && !payoutStatus.recipient.payoutMethod && !payoutStatus.payoutProcessed && (
              <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Payout Method Not Set</AlertTitle>
                <AlertDescription className="text-amber-700">
                  {payoutStatus.recipient.name} has not set up their payout method yet.
                  Please remind them to set up their Venmo, PayPal, Zelle, or Cash App
                  in their account settings before processing the payout.
                </AlertDescription>
              </Alert>
            )}

            {/* Contribution status */}
            {/* UNIVERSAL CONTRIBUTION MODEL: All members must contribute */}
            {payoutStatus.contributionStatus && payoutStatus.contributionStatus.length > 0 && (
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="font-medium">Member Contributions</h3>
                  </div>
                  <span className="text-sm font-medium">
                    {payoutStatus.contributionStatus.filter(m => m.contributed).length}
                    /
                    {payoutStatus.contributionStatus.length} complete
                  </span>
                </div>

                <Progress value={getContributionProgress()} className="h-2 mb-3" />

                <div className="space-y-2 mt-4">
                  {payoutStatus.contributionStatus.map((status, index) => (
                    <div key={index} className="flex justify-between items-center px-2 py-1 rounded hover:bg-gray-50">
                      <span className="text-sm font-medium flex items-center">
                        {status.isRecipient && (
                          <Award className="h-4 w-4 text-blue-500 mr-1" />
                        )}
                        {status.name}
                        {status.isRecipient && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Recipient
                          </span>
                        )}
                      </span>
                      <span>
                        {/* UNIVERSAL CONTRIBUTION MODEL: All members show contribution status */}
                        {status.contributed ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <Check className="h-4 w-4 mr-1" />
                            Paid
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-600 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Pending
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next payout info */}
            <div className="border rounded-md p-4">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="font-medium">Next Payout Date</h3>
              </div>
              <p className="text-lg">
                {formatDate(payoutStatus.nextPayoutDate)}
              </p>
              <p className="text-sm text-gray-500">
                {payoutStatus.frequency === 'monthly' ? 'Monthly' : 
                 payoutStatus.frequency === 'biweekly' ? 'Every two weeks' : 
                 payoutStatus.frequency === 'weekly' ? 'Weekly' : 
                 'Custom'} frequency
              </p>
            </div>

            {/* Explanation of how payouts work */}
            <Alert className="bg-gray-50 border-gray-200 text-gray-800">
              <Lock className="h-4 w-4" />
              <AlertTitle>How Payouts Work</AlertTitle>
              <AlertDescription className="text-gray-700">
                <p className="mb-1">All members must contribute before payouts can be processed.</p>
                <p>The pool admin sends the payout manually using the recipient&apos;s preferred payment method (Venmo, PayPal, Zelle, or Cash App), then marks it as sent.</p>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={checkPayoutStatus}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Refresh Status'
          )}
        </Button>

        <div className="flex gap-2 flex-wrap">
          {/* Early Payout Button - Only visible to admin when contributions are complete and before scheduled date */}
          {canShowEarlyPayoutButton && (
            <Button
              variant="outline"
              onClick={() => setShowEarlyPayoutModal(true)}
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              <Zap className="mr-2 h-4 w-4" />
              Initiate Early Payout
            </Button>
          )}

          {/* Mark Payout as Sent Button */}
          {isAdmin && payoutStatus && !payoutStatus.payoutProcessed && payoutStatus.allContributionsReceived && (
            <Button
              onClick={handleProcessPayout}
              disabled={processingPayout || !payoutStatus.allContributionsReceived}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processingPayout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking as Sent...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Mark Payout as Sent
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Early Payout Modal */}
      <EarlyPayoutModal
        poolId={poolId}
        poolName={poolName}
        userId={userId}
        isOpen={showEarlyPayoutModal}
        onClose={() => setShowEarlyPayoutModal(false)}
        onPayoutSuccess={handleEarlyPayoutSuccess}
      />
    </Card>
  );
}