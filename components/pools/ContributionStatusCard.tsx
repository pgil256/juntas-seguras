'use client';

import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Progress } from '../ui/progress';
import { usePoolContributions } from '../../lib/hooks/usePoolContributions';
import {
  DollarSign,
  Users,
  Award,
  Clock,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ContributionStatusCardProps {
  poolId: string;
  userEmail: string;
  onMakeContribution: () => void;
}

export function ContributionStatusCard({
  poolId,
  userEmail,
  onMakeContribution,
}: ContributionStatusCardProps) {
  const {
    isLoading,
    error,
    contributionStatus,
    userContributionInfo,
    getContributionStatus,
  } = usePoolContributions({ poolId, userEmail });

  // Load status on mount
  useEffect(() => {
    getContributionStatus();
  }, [getContributionStatus]);

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate contribution progress percentage
  const getContributionProgress = () => {
    if (!contributionStatus) return 0;

    const totalMembers = contributionStatus.contributions.length;
    const completedMembers = contributionStatus.contributions.filter(
      (c) => c.hasContributed || c.isRecipient
    ).length;

    return (completedMembers / totalMembers) * 100;
  };

  // Determine user state
  const isRecipient = userContributionInfo?.isRecipient ?? false;
  const hasContributed = userContributionInfo?.hasContributed ?? false;
  const canContribute = !isRecipient && !hasContributed;

  if (isLoading && !contributionStatus) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error && !contributionStatus) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Round {contributionStatus?.currentRound} Contributions</span>
          {contributionStatus?.allContributionsReceived ? (
            <span className="text-sm font-normal bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center">
              <Check className="h-4 w-4 mr-1" />
              All Received
            </span>
          ) : (
            <span className="text-sm font-normal bg-amber-100 text-amber-800 px-3 py-1 rounded-full flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              In Progress
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Track contribution status for the current round
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {contributionStatus && (
          <>
            {/* Recipient info */}
            {contributionStatus.recipient && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center mb-2">
                  <Award className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-blue-800">
                    This Round's Recipient
                  </h3>
                </div>
                <p className="text-blue-700 font-medium text-lg">
                  {contributionStatus.recipient.name}
                </p>
                <p className="text-sm text-blue-600">
                  Will receive{' '}
                  {formatCurrency(
                    contributionStatus.contributionAmount *
                      (contributionStatus.contributions.length - 1)
                  )}
                </p>
              </div>
            )}

            {/* User status banner */}
            {isRecipient && (
              <Alert className="bg-emerald-50 border-emerald-200">
                <Award className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-800">
                  You're the Recipient!
                </AlertTitle>
                <AlertDescription className="text-emerald-700">
                  You don't need to contribute this round. Wait for other members
                  to complete their contributions.
                </AlertDescription>
              </Alert>
            )}

            {hasContributed && !isRecipient && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">
                  Contribution Complete
                </AlertTitle>
                <AlertDescription className="text-green-700">
                  You've contributed{' '}
                  {formatCurrency(contributionStatus.contributionAmount)} for this
                  round.
                </AlertDescription>
              </Alert>
            )}

            {canContribute && (
              <Alert className="bg-amber-50 border-amber-200">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">
                  Contribution Needed
                </AlertTitle>
                <AlertDescription className="text-amber-700">
                  You haven't contributed for this round yet. Contribution amount:{' '}
                  {formatCurrency(contributionStatus.contributionAmount)}
                </AlertDescription>
              </Alert>
            )}

            {/* Contribution progress */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="font-medium">Member Contributions</h3>
                </div>
                <span className="text-sm font-medium">
                  {
                    contributionStatus.contributions.filter(
                      (c) => c.hasContributed || c.isRecipient
                    ).length
                  }
                  /{contributionStatus.contributions.length} complete
                </span>
              </div>

              <Progress value={getContributionProgress()} className="h-2 mb-4" />

              <div className="space-y-2">
                {contributionStatus.contributions
                  .sort((a, b) => a.position - b.position)
                  .map((member) => (
                    <div
                      key={member.memberId}
                      className={`flex justify-between items-center px-3 py-2 rounded ${
                        member.email === userEmail
                          ? 'bg-blue-50 border border-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium flex items-center">
                        {member.isRecipient && (
                          <Award className="h-4 w-4 text-blue-500 mr-2" />
                        )}
                        {member.name}
                        {member.email === userEmail && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        {member.isRecipient && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Recipient
                          </span>
                        )}
                      </span>
                      <span>
                        {member.isRecipient ? (
                          <span className="text-xs text-gray-500">
                            No contribution required
                          </span>
                        ) : member.hasContributed ? (
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
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => getContributionStatus()}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>

        {canContribute && (
          <Button
            onClick={onMakeContribution}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Make Contribution
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
