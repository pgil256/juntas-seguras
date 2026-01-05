// components/ui/pull-indicator.tsx
// Visual indicator component for pull-to-refresh
'use client';

import React from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PullIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
  threshold?: number;
}

export function PullIndicator({
  pullDistance,
  isRefreshing,
  canRefresh,
  threshold = 80,
}: PullIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center py-4 transition-opacity duration-200",
        pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
      )}
      style={{
        height: isRefreshing ? 48 : Math.min(pullDistance, threshold),
        overflow: 'hidden',
      }}
    >
      {isRefreshing ? (
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            canRefresh ? "text-blue-600" : "text-gray-400"
          )}
        >
          <ArrowDown
            className="h-5 w-5 transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <span className="font-medium">
            {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}
    </div>
  );
}
