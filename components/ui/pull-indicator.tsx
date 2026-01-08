// components/ui/pull-indicator.tsx
// Visual indicator component for pull-to-refresh with enhanced animations
'use client';

import React, { useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PullIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
  threshold?: number;
  showSuccessState?: boolean;
  onThresholdReached?: () => void;
}

/**
 * PullIndicator Component
 *
 * Enhanced visual indicator for pull-to-refresh with:
 * - Smooth rotation animation on the icon
 * - "Updating..." state during refresh
 * - Optional success state after refresh
 * - Haptic feedback at threshold (handled by parent hook)
 */
export function PullIndicator({
  pullDistance,
  isRefreshing,
  canRefresh,
  threshold = 80,
  showSuccessState = false,
  onThresholdReached,
}: PullIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const scale = 0.8 + progress * 0.2;

  // Notify when threshold is reached
  useEffect(() => {
    if (canRefresh && onThresholdReached) {
      onThresholdReached();
    }
  }, [canRefresh, onThresholdReached]);

  if (pullDistance <= 0 && !isRefreshing && !showSuccessState) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center transition-all duration-200 ease-out',
        pullDistance > 0 || isRefreshing || showSuccessState ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        height: isRefreshing || showSuccessState ? 56 : Math.min(pullDistance, threshold + 20),
        overflow: 'hidden',
      }}
      role="status"
      aria-live="polite"
      aria-label={
        showSuccessState
          ? 'Refresh complete'
          : isRefreshing
          ? 'Refreshing content'
          : canRefresh
          ? 'Release to refresh'
          : 'Pull down to refresh'
      }
    >
      {/* Success state */}
      {showSuccessState ? (
        <div className="flex items-center gap-2 text-green-600">
          <div className="p-1.5 rounded-full bg-green-100">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Updated</span>
        </div>
      ) : isRefreshing ? (
        /* Refreshing state */
        <div className="flex items-center gap-3">
          <div className="relative">
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          </div>
          <span className="text-sm font-medium text-blue-600">Updating...</span>
        </div>
      ) : (
        /* Pull state */
        <div
          className={cn(
            'flex items-center gap-2 text-sm transition-all duration-200',
            canRefresh ? 'text-blue-600' : 'text-gray-400'
          )}
          style={{ transform: `scale(${scale})` }}
        >
          <div
            className={cn(
              'p-1.5 rounded-full transition-colors duration-200',
              canRefresh ? 'bg-blue-100' : 'bg-gray-100'
            )}
          >
            <ArrowDown
              className="h-4 w-4 transition-transform duration-150"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>
          <span className="font-medium">
            {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * PullIndicatorCompact Component
 *
 * Smaller variant for inline use.
 */
export function PullIndicatorCompact({
  isRefreshing,
  className,
}: {
  isRefreshing: boolean;
  className?: string;
}) {
  if (!isRefreshing) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-2 text-blue-600',
        className
      )}
    >
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span className="text-xs font-medium">Refreshing...</span>
    </div>
  );
}
