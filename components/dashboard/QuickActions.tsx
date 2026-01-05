'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import {
  DollarSign,
  Plus,
  Users,
  Bell,
  Settings,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  badge?: string | number;
}

interface QuickActionsProps {
  onCreatePool?: () => void;
  onMakePayment?: () => void;
  pendingPaymentsCount?: number;
  className?: string;
}

export function QuickActions({
  onCreatePool,
  onMakePayment,
  pendingPaymentsCount = 0,
  className,
}: QuickActionsProps) {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: 'pay',
      label: 'Make Payment',
      description: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} pending` : 'All caught up',
      icon: <DollarSign className="w-5 h-5" />,
      onClick: onMakePayment || (() => router.push('/my-pool')),
      variant: pendingPaymentsCount > 0 ? 'warning' : 'default',
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
    },
    {
      id: 'create',
      label: 'Create Pool',
      description: 'Start a new savings pool',
      icon: <Plus className="w-5 h-5" />,
      onClick: onCreatePool,
      variant: 'primary',
    },
    {
      id: 'invite',
      label: 'Invite Members',
      description: 'Grow your pool',
      icon: <Users className="w-5 h-5" />,
      href: '/my-pool',
    },
    {
      id: 'help',
      label: 'How It Works',
      description: 'Learn about juntas',
      icon: <HelpCircle className="w-5 h-5" />,
      href: '/help/documentation',
    },
  ];

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300';
      case 'success':
        return 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300';
      case 'warning':
        return 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300';
      default:
        return 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300';
    }
  };

  const getIconStyles = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-100 text-blue-600';
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'warning':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleClick(action)}
          className={cn(
            'relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200 text-left group',
            getVariantStyles(action.variant)
          )}
        >
          {/* Badge */}
          {action.badge && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
              {action.badge}
            </span>
          )}

          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl mb-3 transition-transform group-hover:scale-105',
              getIconStyles(action.variant)
            )}
          >
            {action.icon}
          </div>

          {/* Content */}
          <span className="font-medium text-gray-900 text-sm text-center">
            {action.label}
          </span>
          {action.description && (
            <span className="text-xs text-gray-500 mt-0.5 text-center">
              {action.description}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Compact version for sidebar or mobile
export function QuickActionsCompact({
  onCreatePool,
  onMakePayment,
  pendingPaymentsCount = 0,
}: QuickActionsProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      {pendingPaymentsCount > 0 && (
        <Button
          onClick={onMakePayment || (() => router.push('/my-pool'))}
          className="w-full justify-between bg-amber-500 hover:bg-amber-600"
        >
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Make Payment
          </span>
          <span className="flex items-center gap-1 text-xs bg-amber-400/50 px-2 py-0.5 rounded">
            {pendingPaymentsCount} pending
            <ArrowRight className="w-3 h-3" />
          </span>
        </Button>
      )}

      <Button
        onClick={onCreatePool}
        variant="outline"
        className="w-full justify-start gap-2"
      >
        <Plus className="w-4 h-4" />
        Create New Pool
      </Button>
    </div>
  );
}
