// components/ui/status-badge.tsx
// Semantic status badge component with consistent colors
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  XCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

/**
 * Color Semantics:
 * - success (Green):  Completed, verified, positive outcomes
 * - warning (Amber):  Due soon, attention needed, pending actions
 * - error (Red):      Overdue, failed, blocked, destructive
 * - info (Blue):      Informational, in-progress, neutral highlights
 * - neutral (Gray):   Disabled, secondary content, default state
 */

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        // Success - Completed, verified, positive
        success:
          'bg-green-50 text-green-700 border border-green-200',
        // Warning - Due soon, attention needed
        warning:
          'bg-amber-50 text-amber-700 border border-amber-200',
        // Error - Overdue, failed, blocked
        error:
          'bg-red-50 text-red-700 border border-red-200',
        // Info - Informational, in-progress
        info:
          'bg-blue-50 text-blue-700 border border-blue-200',
        // Neutral - Default, secondary
        neutral:
          'bg-gray-50 text-gray-600 border border-gray-200',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        default: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
);

// Map status types to variants and icons
const statusConfig: Record<
  string,
  { variant: StatusBadgeVariant; icon: LucideIcon; label: string }
> = {
  // Payment/Contribution statuses
  paid: { variant: 'success', icon: CheckCircle, label: 'Paid' },
  completed: { variant: 'success', icon: CheckCircle, label: 'Completed' },
  verified: { variant: 'success', icon: CheckCircle, label: 'Verified' },
  active: { variant: 'success', icon: CheckCircle, label: 'Active' },

  pending: { variant: 'warning', icon: Clock, label: 'Pending' },
  due_soon: { variant: 'warning', icon: AlertTriangle, label: 'Due Soon' },
  processing: { variant: 'warning', icon: Loader2, label: 'Processing' },
  awaiting: { variant: 'warning', icon: Clock, label: 'Awaiting' },

  overdue: { variant: 'error', icon: AlertCircle, label: 'Overdue' },
  failed: { variant: 'error', icon: XCircle, label: 'Failed' },
  missed: { variant: 'error', icon: XCircle, label: 'Missed' },
  late: { variant: 'error', icon: AlertCircle, label: 'Late' },
  blocked: { variant: 'error', icon: XCircle, label: 'Blocked' },

  in_progress: { variant: 'info', icon: Info, label: 'In Progress' },
  upcoming: { variant: 'info', icon: Clock, label: 'Upcoming' },
  invited: { variant: 'info', icon: Info, label: 'Invited' },

  inactive: { variant: 'neutral', icon: Clock, label: 'Inactive' },
  draft: { variant: 'neutral', icon: Clock, label: 'Draft' },
};

type StatusBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Pre-defined status type (auto-maps to variant, icon, label) */
  status?: keyof typeof statusConfig;
  /** Custom icon to display */
  icon?: LucideIcon;
  /** Show icon */
  showIcon?: boolean;
  /** Animate the icon (for loading states) */
  animate?: boolean;
}

/**
 * StatusBadge Component
 *
 * A semantic badge for displaying status with consistent colors.
 * Can be used with pre-defined status types or custom variants.
 *
 * @example
 * // Using pre-defined status
 * <StatusBadge status="paid" />
 * <StatusBadge status="overdue" />
 * <StatusBadge status="pending" />
 *
 * @example
 * // Using custom variant with children
 * <StatusBadge variant="success" icon={CheckCircle}>
 *   Custom Label
 * </StatusBadge>
 *
 * @example
 * // Sizes
 * <StatusBadge status="active" size="sm" />
 * <StatusBadge status="active" size="lg" />
 */
function StatusBadge({
  className,
  variant,
  size,
  status,
  icon: customIcon,
  showIcon = true,
  animate = false,
  children,
  ...props
}: StatusBadgeProps) {
  // Determine variant, icon, and label from status if provided
  const config = status ? statusConfig[status] : null;
  const resolvedVariant = variant ?? config?.variant ?? 'neutral';
  const Icon = customIcon ?? config?.icon;
  const label = children ?? config?.label;

  // Special case: animate loader for processing status
  const shouldAnimate = animate || status === 'processing';

  return (
    <span
      className={cn(statusBadgeVariants({ variant: resolvedVariant, size }), className)}
      {...props}
    >
      {showIcon && Icon && (
        <Icon
          className={cn(
            'shrink-0',
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5',
            shouldAnimate && 'animate-spin'
          )}
        />
      )}
      {label}
    </span>
  );
}

/**
 * PaymentStatusBadge - Pre-configured for payment statuses
 */
export function PaymentStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  status: 'paid' | 'pending' | 'overdue' | 'failed' | 'processing';
}) {
  return <StatusBadge status={status} {...props} />;
}

/**
 * ContributionStatusBadge - Pre-configured for contribution statuses
 */
export function ContributionStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  status: 'paid' | 'pending' | 'due_soon' | 'overdue' | 'missed';
}) {
  return <StatusBadge status={status} {...props} />;
}

/**
 * MemberStatusBadge - Pre-configured for member statuses
 */
export function MemberStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  status: 'active' | 'invited' | 'pending' | 'inactive';
}) {
  return <StatusBadge status={status} {...props} />;
}

/**
 * PoolStatusBadge - Pre-configured for pool statuses
 */
export function PoolStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'status'> & {
  status: 'active' | 'completed' | 'draft' | 'blocked';
}) {
  return <StatusBadge status={status} {...props} />;
}

export { StatusBadge, statusBadgeVariants, statusConfig };
