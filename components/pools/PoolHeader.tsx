'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import {
  ChevronLeft,
  Settings,
  Share2,
  Users,
  DollarSign,
  Clock,
  Check,
  Award,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

type PoolStatus = 'active' | 'pending' | 'completed' | 'paused';
type UserRole = 'admin' | 'creator' | 'member';

interface PoolHeaderProps {
  poolId: string;
  poolName: string;
  description?: string;
  status: PoolStatus;
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  frequency: string;
  memberCount: number;
  nextPayoutDate?: string;
  userRole: UserRole;
  userHasContributed: boolean;
  userIsRecipient: boolean;
  allContributionsReceived: boolean;
  onMakePayment?: () => void;
  onSettings?: () => void;
  onInvite?: () => void;
  onShare?: () => void;
}

export function PoolHeader({
  poolId,
  poolName,
  description,
  status,
  currentRound,
  totalRounds,
  contributionAmount,
  frequency,
  memberCount,
  nextPayoutDate,
  userRole,
  userHasContributed,
  userIsRecipient,
  allContributionsReceived,
  onMakePayment,
  onSettings,
  onInvite,
  onShare,
}: PoolHeaderProps) {
  const router = useRouter();

  const isAdmin = userRole === 'admin' || userRole === 'creator';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    const baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';

    switch (status) {
      case 'active':
        return (
          <span className={cn(baseStyles, 'bg-green-100 text-green-700')}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className={cn(baseStyles, 'bg-amber-100 text-amber-700')}>
            <Clock className="w-3 h-3" />
            Pending Start
          </span>
        );
      case 'completed':
        return (
          <span className={cn(baseStyles, 'bg-blue-100 text-blue-700')}>
            <Check className="w-3 h-3" />
            Completed
          </span>
        );
      case 'paused':
        return (
          <span className={cn(baseStyles, 'bg-gray-100 text-gray-700')}>
            Paused
          </span>
        );
      default:
        return null;
    }
  };

  const getUserStatusBadge = () => {
    if (userIsRecipient) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <Award className="w-3 h-3" />
          You're Receiving
        </span>
      );
    }

    if (userHasContributed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Check className="w-3 h-3" />
          Paid
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />
        Payment Due
      </span>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 -mx-4 px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Top row: Back button and quick actions */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/my-pool')}
          className="text-gray-600 hover:text-gray-900 -ml-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          My Pools
        </Button>

        <div className="flex items-center gap-2">
          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={onSettings}>
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Mobile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Pool
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onInvite}>
                <Users className="w-4 h-4 mr-2" />
                Invite Members
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSettings}>
                    <Settings className="w-4 h-4 mr-2" />
                    Pool Settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main header content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left side: Pool info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {poolName}
            </h1>
            {getStatusBadge()}
            {getUserStatusBadge()}
          </div>

          {description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-1">{description}</p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-gray-400" />
              {formatCurrency(contributionAmount)}/{frequency}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              {memberCount} members
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              Round {currentRound}/{totalRounds}
            </span>
            {nextPayoutDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Next payout: {formatDate(nextPayoutDate)}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Primary action */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
          {!userHasContributed ? (
            <Button
              onClick={onMakePayment}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {userIsRecipient ? 'Make Payment (Recipient)' : 'Make Payment'}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled
              className="w-full sm:w-auto text-green-600 border-green-200"
            >
              <Check className="w-4 h-4 mr-2" />
              Payment Complete
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onInvite}
            className="w-full sm:w-auto"
          >
            <Users className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>
      </div>

      {/* Alert bar for pending actions */}
      {!userHasContributed && status === 'active' && (
        <div className={cn(
          'mt-4 p-3 rounded-lg flex items-center justify-between',
          userIsRecipient
            ? 'bg-emerald-50 border border-emerald-100'
            : 'bg-amber-50 border border-amber-100'
        )}>
          <div className="flex items-center gap-2">
            {userIsRecipient ? (
              <>
                <Award className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-800">
                  <strong>You're the recipient!</strong> Make your {formatCurrency(contributionAmount)} contribution to receive the full payout.
                </span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800">
                  Your {formatCurrency(contributionAmount)} contribution is due for Round {currentRound}
                </span>
              </>
            )}
          </div>
          <Button
            size="sm"
            onClick={onMakePayment}
            className={userIsRecipient ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            Pay Now
          </Button>
        </div>
      )}

      {/* All contributions received notice */}
      {allContributionsReceived && !userIsRecipient && (
        <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-100 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800">
            All contributions received! Payout will be processed soon.
          </span>
        </div>
      )}
    </div>
  );
}
