'use client';

import React, { useEffect, useState } from 'react';
import { usePoolPayouts } from '../../lib/hooks/usePoolPayouts';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { DollarSign, Users, Calendar, Award, Clock, Check, X, AlertTriangle, Loader2, Lock } from 'lucide-react';

interface PoolPayoutsManagerProps {
  poolId: string;
  userId: string;
  isAdmin: boolean;
  poolName: string;
}

export function PoolPayoutsManager({ poolId, userId, isAdmin, poolName }: PoolPayoutsManagerProps) {
  const { 
    isLoading, 
    error, 
    payoutStatus, 
    checkPayoutStatus, 
    processPayout 
  } = usePoolPayouts({ poolId, userId });
  
  const [processingPayout, setProcessingPayout] = useState(false);
  const [payoutResult, setPayoutResult] = useState<{ success: boolean; message?: string } | null>(null);

  // Load status on mount
  useEffect(() => {
    checkPayoutStatus();
  }, [poolId]);

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
  const getContributionProgress = () => {
    if (!payoutStatus) return 0;
    
    const totalMembers = payoutStatus.contributionStatus.length;
    const nonRecipientMembers = payoutStatus.contributionStatus.filter(m => !m.isRecipient).length;
    const contributedMembers = payoutStatus.contributionStatus.filter(m => m.contributed).length;
    
    return (contributedMembers / nonRecipientMembers) * 100;
  };

  // Handle payout button click
  const handleProcessPayout = async () => {
    setProcessingPayout(true);
    setPayoutResult(null);
    
    try {
      const result = await processPayout();
      setPayoutResult(result);
      
      // Reload status after processing
      if (result.success) {
        await checkPayoutStatus();
      }
    } finally {
      setProcessingPayout(false);
    }
  };

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

            {/* Contribution status */}
            <div className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="font-medium">Member Contributions</h3>
                </div>
                <span className="text-sm font-medium">
                  {payoutStatus.contributionStatus.filter(m => m.contributed || m.isRecipient).length} 
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
                      {status.isRecipient ? (
                        <span className="text-xs text-gray-500">No contribution required</span>
                      ) : status.contributed ? (
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
              <AlertTitle>Secure Payout Process</AlertTitle>
              <AlertDescription className="text-gray-700">
                <p className="mb-1">All members must contribute before payouts can be processed.</p>
                <p>Funds are held in escrow until the designated payout date and can only be released by pool administrators.</p>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center">
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

        {isAdmin && payoutStatus && !payoutStatus.payoutProcessed && payoutStatus.allContributionsReceived && (
          <Button 
            onClick={handleProcessPayout}
            disabled={processingPayout || !payoutStatus.allContributionsReceived}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {processingPayout ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Process Payout
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}