// components/pools/MemberCard.tsx
// Mobile-friendly card view for pool members
'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  Mail,
  Bell,
  MoreHorizontal,
  User,
  ChevronRight,
  ChevronDown,
  History,
  CreditCard,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface ContributionRecord {
  round: number;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'late' | 'missed';
  method?: string;
}

export interface PaymentMethodInfo {
  type: 'venmo' | 'paypal' | 'zelle' | 'cashapp' | 'bank';
  verified: boolean;
  lastUsed?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  position?: number;
  hasContributed?: boolean;
  isRecipient?: boolean;
  contributionAmount?: number;
  joinedAt?: string;
  role?: 'admin' | 'member';
  contributionHistory?: ContributionRecord[];
  paymentMethod?: PaymentMethodInfo;
}

interface MemberCardProps {
  member: Member;
  poolName?: string;
  currentRound?: number;
  onRemind?: (member: Member) => void;
  onMessage?: (member: Member) => void;
  onRemove?: (member: Member) => void;
  onView?: (member: Member) => void;
  showActions?: boolean;
  isAdmin?: boolean;
  showHistory?: boolean;
  showPaymentMethod?: boolean;
  className?: string;
}

/**
 * MemberCard Component
 *
 * Mobile-optimized card for displaying pool members.
 */
export function MemberCard({
  member,
  poolName,
  currentRound,
  onRemind,
  onMessage,
  onRemove,
  onView,
  showActions = true,
  isAdmin = false,
  showHistory = false,
  showPaymentMethod = false,
  className,
}: MemberCardProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  // Determine member status
  const getStatusConfig = () => {
    if (member.isRecipient) {
      return {
        icon: Award,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: 'Receiving',
      };
    }
    if (member.hasContributed) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Paid',
      };
    }
    return {
      icon: Clock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Pending',
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 transition-shadow hover:shadow-md',
        status.borderColor,
        className
      )}
    >
      {/* Header: Avatar, name, status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium',
              member.avatar ? '' : 'bg-blue-100 text-blue-600'
            )}
          >
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(member.name)
            )}
          </div>

          {/* Name and email */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">
                {member.name}
              </h3>
              {member.role === 'admin' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{member.email}</p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (onRemind || onMessage || onRemove || onView) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 -mr-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(member)}>
                  <User className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              )}
              {onMessage && (
                <DropdownMenuItem onClick={() => onMessage(member)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
              )}
              {onRemind && !member.hasContributed && !member.isRecipient && (
                <DropdownMenuItem onClick={() => onRemind(member)}>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </DropdownMenuItem>
              )}
              {onRemove && isAdmin && member.role !== 'admin' && (
                <DropdownMenuItem
                  onClick={() => onRemove(member)}
                  className="text-red-600 focus:text-red-600"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Remove Member
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Body: Position, status, amount */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          {/* Position */}
          {member.position !== undefined && (
            <div className="text-sm">
              <span className="text-gray-500">Position:</span>{' '}
              <span className="font-medium">#{member.position}</span>
            </div>
          )}

          {/* Contribution amount */}
          {member.contributionAmount !== undefined && (
            <div className="text-sm">
              <span className="font-medium text-gray-900">
                {formatCurrency(member.contributionAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            status.bgColor,
            status.color
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      {/* Recipient banner */}
      {member.isRecipient && (
        <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <Award className="h-3 w-3" />
            Receiving payout this round
          </p>
        </div>
      )}

      {/* Payment Method Status */}
      {showPaymentMethod && member.paymentMethod && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 capitalize">
                {member.paymentMethod.type}
              </span>
            </div>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                member.paymentMethod.verified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}
            >
              {member.paymentMethod.verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
          {member.paymentMethod.lastUsed && (
            <p className="text-xs text-gray-400 mt-1 ml-6">
              Last used: {new Date(member.paymentMethod.lastUsed).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Contribution History Toggle */}
      {showHistory && member.contributionHistory && member.contributionHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Contribution History ({member.contributionHistory.length})
            </span>
            {isHistoryExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Expanded History */}
          {isHistoryExpanded && (
            <div className="mt-2 space-y-2">
              {member.contributionHistory.slice(0, 5).map((record) => (
                <div
                  key={record.round}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">R{record.round}</span>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        record.status === 'paid' && 'bg-green-500',
                        record.status === 'pending' && 'bg-yellow-500',
                        record.status === 'late' && 'bg-orange-500',
                        record.status === 'missed' && 'bg-red-500'
                      )}
                    />
                    <span className="text-gray-600">
                      {formatCurrency(record.amount)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(record.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
              {member.contributionHistory.length > 5 && (
                <p className="text-xs text-gray-400 text-center">
                  + {member.contributionHistory.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * MemberCardSkeleton Component
 *
 * Loading skeleton for MemberCard.
 */
export function MemberCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded mt-1" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

/**
 * MemberListHeader Component
 *
 * Header for member list with count and actions.
 */
interface MemberListHeaderProps {
  totalMembers: number;
  contributedCount: number;
  onInvite?: () => void;
  className?: string;
}

export function MemberListHeader({
  totalMembers,
  contributedCount,
  onInvite,
  className,
}: MemberListHeaderProps) {
  const progress = totalMembers > 0 ? (contributedCount / totalMembers) * 100 : 0;

  return (
    <div className={cn('mb-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">
          Members ({totalMembers})
        </h3>
        {onInvite && (
          <Button variant="outline" size="sm" onClick={onInvite}>
            Invite
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 shrink-0">
          {contributedCount}/{totalMembers} paid
        </span>
      </div>
    </div>
  );
}

export default MemberCard;
