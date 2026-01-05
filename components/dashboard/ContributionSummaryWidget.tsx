'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  DollarSign,
  Clock,
  Check,
  AlertCircle,
  ArrowRight,
  Award,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PoolContributionSummary {
  poolId: string;
  poolName: string;
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  hasContributed: boolean;
  isRecipient: boolean;
  allContributionsReceived: boolean;
  contributedCount: number;
  totalMembers: number;
  nextPayoutDate?: string;
  daysUntilPayout?: number;
}

interface ContributionSummaryWidgetProps {
  pools: PoolContributionSummary[];
  isLoading?: boolean;
}

export function ContributionSummaryWidget({
  pools,
  isLoading,
}: ContributionSummaryWidgetProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate summary stats
  const pendingContributions = pools.filter(p => !p.hasContributed);
  const totalPendingAmount = pendingContributions.reduce(
    (sum, p) => sum + p.contributionAmount,
    0
  );
  const receivingPayouts = pools.filter(p => p.isRecipient);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-2 bg-gray-200 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pools.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Contribution Status</CardTitle>
            <CardDescription>Your active pool contributions</CardDescription>
          </div>
          {pendingContributions.length > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {pendingContributions.length} pending
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary banner */}
        {pendingContributions.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  {formatCurrency(totalPendingAmount)} due
                </p>
                <p className="text-sm text-amber-700">
                  {pendingContributions.length} pool{pendingContributions.length > 1 ? 's' : ''} awaiting payment
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/pools/${pendingContributions[0].poolId}`)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Pay Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Receiving payout banner */}
        {receivingPayouts.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-900">
                  You're receiving a payout!
                </p>
                <p className="text-sm text-emerald-700">
                  {receivingPayouts[0].poolName} - {formatCurrency(receivingPayouts[0].contributionAmount * receivingPayouts[0].totalMembers)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/pools/${receivingPayouts[0].poolId}`)}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              View Details
            </Button>
          </div>
        )}

        {/* Pool list */}
        <div className="space-y-3">
          {pools.map((pool) => {
            const progress = (pool.contributedCount / pool.totalMembers) * 100;
            const isPending = !pool.hasContributed;

            return (
              <div
                key={pool.poolId}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                  isPending
                    ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                    : 'border-gray-100 hover:border-gray-200'
                )}
                onClick={() => router.push(`/pools/${pool.poolId}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none">
                      {pool.poolName}
                    </span>
                    {pool.isRecipient && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        <Award className="w-3 h-3 mr-0.5" />
                        Recipient
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {pool.hasContributed ? (
                      <span className="inline-flex items-center text-green-600 text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-amber-600 text-sm font-medium">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatCurrency(pool.contributionAmount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {pool.contributedCount}/{pool.totalMembers}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>
                    Round {pool.currentRound} of {pool.totalRounds}
                  </span>
                  {pool.nextPayoutDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Payout: {formatDate(pool.nextPayoutDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* All caught up message */}
        {pendingContributions.length === 0 && pools.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">
              All contributions up to date!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
