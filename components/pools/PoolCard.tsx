'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
} from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  DollarSign,
  Users,
  Clock,
  Award,
  Check,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { MemberContributionAvatars } from './MemberContributionAvatars';
import { PayoutCountdownCompact } from './PayoutCountdown';
import { cn } from '../../lib/utils';

interface PoolMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  hasContributed: boolean;
  isRecipient: boolean;
  position: number;
}

interface PoolCardProps {
  poolId: string;
  poolName: string;
  description?: string;
  status: 'active' | 'pending' | 'completed';
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  frequency: string;
  nextPayoutDate?: string;
  members: PoolMember[];
  currentUserEmail?: string;
  userHasContributed: boolean;
  userIsRecipient: boolean;
  allContributionsReceived: boolean;
  payoutProcessed: boolean;
  onMakePayment?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function PoolCard({
  poolId,
  poolName,
  description,
  status,
  currentRound,
  totalRounds,
  contributionAmount,
  frequency,
  nextPayoutDate,
  members,
  currentUserEmail,
  userHasContributed,
  userIsRecipient,
  allContributionsReceived,
  payoutProcessed,
  onMakePayment,
  variant = 'default',
  className,
}: PoolCardProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const contributedCount = members.filter((m) => m.hasContributed).length;
  const progress = (contributedCount / members.length) * 100;
  const payoutAmount = contributionAmount * members.length;

  const handleClick = () => {
    router.push(`/pools/${poolId}`);
  };

  const handlePayment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMakePayment) {
      onMakePayment();
    } else {
      router.push(`/pools/${poolId}`);
    }
  };

  // Compact variant for dashboard lists
  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'p-4 rounded-lg border bg-white card-interactive btn-press',
          userIsRecipient && 'border-emerald-200 bg-emerald-50/50',
          !userHasContributed && !userIsRecipient && 'border-amber-200 bg-amber-50/50',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{poolName}</h3>
              {userIsRecipient && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 shrink-0">
                  <Award className="w-3 h-3 mr-0.5" />
                  Receiving
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>Round {currentRound}/{totalRounds}</span>
              <span>•</span>
              <span>{formatCurrency(contributionAmount)}/{frequency}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {userHasContributed ? (
              <span className="inline-flex items-center text-green-600 text-sm">
                <Check className="w-4 h-4 mr-1" />
                Paid
              </span>
            ) : (
              <Button
                size="sm"
                onClick={handlePayment}
                className={cn(
                  'shrink-0',
                  userIsRecipient ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                )}
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Pay
              </Button>
            )}

            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{contributedCount}/{members.length} paid</span>
            {nextPayoutDate && (
              <PayoutCountdownCompact
                payoutDate={nextPayoutDate}
                payoutAmount={payoutAmount}
                isUserRecipient={userIsRecipient}
                allContributionsReceived={allContributionsReceived}
                payoutProcessed={payoutProcessed}
              />
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>
    );
  }

  // Default full card
  return (
    <Card
      className={cn(
        'cursor-pointer hover-glow btn-press overflow-hidden',
        userIsRecipient && 'ring-2 ring-emerald-200',
        className
      )}
      onClick={handleClick}
    >
      {/* Header banner for special states */}
      {userIsRecipient && !payoutProcessed && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-white text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4" />
          You're receiving {formatCurrency(payoutAmount)} this round!
        </div>
      )}
      {!userHasContributed && !userIsRecipient && status === 'active' && (
        <div className="bg-amber-500 px-4 py-2 text-white text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Payment of {formatCurrency(contributionAmount)} due
        </div>
      )}

      <CardContent className="p-4 sm:p-5">
        {/* Title and status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{poolName}</h3>
            {description && (
              <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
              status === 'active' && 'bg-green-100 text-green-700',
              status === 'pending' && 'bg-amber-100 text-amber-700',
              status === 'completed' && 'bg-blue-100 text-blue-700'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">
              {currentRound}/{totalRounds}
            </p>
            <p className="text-xs text-gray-500">Round</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(contributionAmount)}
            </p>
            <p className="text-xs text-gray-500">{frequency}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{members.length}</p>
            <p className="text-xs text-gray-500">Members</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(payoutAmount)}
            </p>
            <p className="text-xs text-gray-500">Payout</p>
          </div>
        </div>

        {/* Contribution progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              Contributions: {contributedCount}/{members.length}
            </span>
            <span className="font-medium">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Member avatars */}
        <div className="flex items-center justify-between">
          <MemberContributionAvatars
            members={members}
            currentUserEmail={currentUserEmail}
            size="sm"
            maxDisplay={5}
          />

          {nextPayoutDate && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <PayoutCountdownCompact
                payoutDate={nextPayoutDate}
                payoutAmount={payoutAmount}
                isUserRecipient={userIsRecipient}
                allContributionsReceived={allContributionsReceived}
                payoutProcessed={payoutProcessed}
              />
            </div>
          )}
        </div>

        {/* Action button */}
        {!userHasContributed && status === 'active' && (
          <Button
            onClick={handlePayment}
            className={cn(
              'w-full mt-4',
              userIsRecipient
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {userIsRecipient ? 'Make Payment (Recipient)' : 'Make Payment'}
          </Button>
        )}

        {userHasContributed && (
          <div className="flex items-center justify-center gap-2 mt-4 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">Payment Complete</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Pool card skeleton for loading states
export function PoolCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="p-4 rounded-lg border bg-white animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
        <div className="mt-3 h-1.5 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="animate-pulse">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-60" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded mb-4" />
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-8 h-8 bg-gray-200 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
