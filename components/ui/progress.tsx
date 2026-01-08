'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Accessible label for the progress bar */
  label?: string;
  /** Show percentage text visually */
  showValue?: boolean;
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error';
}

/**
 * Progress Component
 *
 * An accessible progress bar with semantic color variants.
 *
 * @example
 * <Progress value={75} label="Upload progress" />
 *
 * @example
 * // With visible percentage
 * <Progress value={50} showValue label="Completion" />
 *
 * @example
 * // Semantic variants
 * <Progress value={90} variant="success" />
 * <Progress value={30} variant="warning" />
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, label, showValue, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('relative', showValue && 'space-y-1')}>
      {showValue && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-gray-600">{label}</span>}
          <span className="text-gray-900 font-medium tabular-nums">{Math.round(value || 0)}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-gray-100',
          className
        )}
        aria-label={label}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 transition-all duration-300 ease-out',
            variantClasses[variant]
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
