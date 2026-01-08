// components/payments/TransactionCard.tsx
// Mobile-friendly card view for payment transactions
'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { format, parseISO, isValid } from 'date-fns';

export interface Transaction {
  id: string;
  poolId?: string;
  poolName: string;
  amount: number;
  currency?: string;
  type: 'contribution' | 'payout' | 'refund' | string;
  status: 'completed' | 'pending' | 'failed' | 'processing' | string;
  description?: string;
  member?: string;
  round?: number;
  createdAt: string;
}

interface TransactionCardProps {
  transaction: Transaction;
  onView?: (transaction: Transaction) => void;
  onAction?: (transaction: Transaction) => void;
  actionLabel?: string;
  className?: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Completed',
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Pending',
  },
  processing: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Processing',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Failed',
  },
};

const typeConfig = {
  contribution: {
    icon: ArrowUpRight,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Contribution',
  },
  payout: {
    icon: ArrowDownLeft,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Payout',
  },
  refund: {
    icon: ArrowDownLeft,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Refund',
  },
};

/**
 * TransactionCard Component
 *
 * Mobile-optimized card for displaying payment transactions.
 */
export function TransactionCard({
  transaction,
  onView,
  onAction,
  actionLabel,
  className,
}: TransactionCardProps) {
  const status = statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.pending;
  const type = typeConfig[transaction.type as keyof typeof typeConfig] || typeConfig.contribution;
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;

  // Format date safely
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
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
      {/* Header: Pool name and date */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn('p-1.5 rounded-lg shrink-0', type.bgColor)}>
            <TypeIcon className={cn('h-4 w-4', type.color)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {transaction.poolName}
            </h3>
            <p className="text-xs text-gray-500">
              {formatDate(transaction.createdAt)}
            </p>
          </div>
        </div>
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(transaction)}
            className="shrink-0 -mr-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Body: Amount and status */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xl font-semibold text-gray-900">
            {transaction.type === 'payout' ? '+' : '-'}
            {formatCurrency(transaction.amount, transaction.currency)}
          </span>
          {transaction.round && (
            <p className="text-xs text-gray-500 mt-0.5">
              Round {transaction.round}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Description if present */}
      {transaction.description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
          {transaction.description}
        </p>
      )}

      {/* Member info if present */}
      {transaction.member && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
          <Users className="h-3 w-3" />
          <span>{transaction.member}</span>
        </div>
      )}

      {/* Action button if provided */}
      {onAction && actionLabel && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(transaction)}
            className="w-full"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * TransactionCardSkeleton Component
 *
 * Loading skeleton for TransactionCard.
 */
export function TransactionCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded mt-1" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

export default TransactionCard;
