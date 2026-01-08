// components/ui/empty-state.tsx
// Reusable empty state component for consistent empty states across the app
import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import {
  FolderOpen,
  Search,
  CreditCard,
  Users,
  Bell,
  MessageCircle,
  FileText,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  type LucideIcon
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  iconColor?: 'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

const iconColorClasses = {
  blue: 'bg-blue-50 text-blue-500',
  gray: 'bg-gray-100 text-gray-400',
  green: 'bg-green-50 text-green-500',
  orange: 'bg-orange-50 text-orange-500',
  purple: 'bg-purple-50 text-purple-500',
  red: 'bg-red-50 text-red-500',
};

export function EmptyState({
  icon: Icon = FolderOpen,
  iconColor = 'gray',
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          compact ? 'w-12 h-12' : 'w-16 h-16',
          iconColorClasses[iconColor]
        )}
      >
        <Icon className={cn(compact ? 'h-6 w-6' : 'h-8 w-8')} />
      </div>

      <h3
        className={cn(
          'font-semibold text-gray-900',
          compact ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-gray-500 max-w-md mt-1',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn('flex flex-col sm:flex-row gap-3', compact ? 'mt-4' : 'mt-6')}>
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
              size={compact ? 'sm' : 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              size={compact ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function NoPoolsEmptyState({ onCreatePool }: { onCreatePool: () => void }) {
  return (
    <EmptyState
      icon={Users}
      iconColor="blue"
      title="No pools yet"
      description="Create your first savings pool and invite friends or family to start saving together."
      action={{
        label: 'Create a Pool',
        onClick: onCreatePool,
      }}
    />
  );
}

export function NoPaymentsEmptyState({ onCreatePool }: { onCreatePool: () => void }) {
  return (
    <EmptyState
      icon={CreditCard}
      iconColor="green"
      title="No payment history"
      description="Your transaction history will appear here once you start making contributions or receive payouts."
      action={{
        label: 'Create a Pool',
        onClick: onCreatePool,
      }}
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      icon={Bell}
      iconColor="purple"
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
      compact
    />
  );
}

export function NoSearchResultsEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={Search}
      iconColor="gray"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try different keywords or filters.`}
      action={{
        label: 'Clear Search',
        onClick: onClear,
        variant: 'outline',
      }}
    />
  );
}

export function NoMessagesEmptyState({ onStartConversation }: { onStartConversation?: () => void }) {
  return (
    <EmptyState
      icon={MessageCircle}
      iconColor="blue"
      title="No messages yet"
      description="Start a conversation with pool members to coordinate payments and discuss plans."
      action={onStartConversation ? {
        label: 'Start a Discussion',
        onClick: onStartConversation,
      } : undefined}
    />
  );
}

export function NoDataEmptyState({ title, description }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={FileText}
      iconColor="gray"
      title={title || "No data available"}
      description={description || "Data will appear here once available."}
      compact
    />
  );
}

// Error state for failed data loading
export function ErrorEmptyState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      iconColor="red"
      title={title || "Something went wrong"}
      description={description || "We couldn't load the data. Please try again."}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}

// First-time user empty state
export function FirstTimeEmptyState({
  title,
  description,
  onGetStarted,
  actionLabel,
}: {
  title: string;
  description: string;
  onGetStarted: () => void;
  actionLabel?: string;
}) {
  return (
    <EmptyState
      icon={Sparkles}
      iconColor="blue"
      title={title}
      description={description}
      action={{
        label: actionLabel || 'Get Started',
        onClick: onGetStarted,
      }}
    />
  );
}

// Loading failed state with refresh option
export function LoadingFailedEmptyState({
  onRefresh,
}: {
  onRefresh: () => void;
}) {
  return (
    <EmptyState
      icon={RefreshCw}
      iconColor="orange"
      title="Failed to load"
      description="There was an issue loading this content."
      action={{
        label: 'Refresh',
        onClick: onRefresh,
        variant: 'outline',
      }}
      compact
    />
  );
}
