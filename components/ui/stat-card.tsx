// components/ui/stat-card.tsx
// Responsive stat card component with mobile-optimized layout
import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-gray-100 text-gray-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
  primary: {
    icon: 'bg-blue-100 text-blue-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
  success: {
    icon: 'bg-green-100 text-green-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
  warning: {
    icon: 'bg-amber-100 text-amber-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
  danger: {
    icon: 'bg-red-100 text-red-600',
    trend: {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500',
    },
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-4 sm:p-5",
        "transition-all duration-200 hover:shadow-md hover:border-gray-300",
        "group",
        className
      )}
    >
      {/* Background decoration */}
      <div
        className={cn(
          "absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.05]",
          "transition-transform duration-300 group-hover:scale-110",
          styles.icon.replace('bg-', 'bg-').replace('-100', '-500')
        )}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-xl shrink-0",
            "w-10 h-10 sm:w-12 sm:h-12",
            "transition-transform duration-200 group-hover:scale-105",
            styles.icon
          )}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 truncate">
            {value}
          </p>

          {/* Trend or description */}
          {trend ? (
            <div className="flex items-center gap-1 mt-1">
              <span className={cn("text-xs font-medium", styles.trend[trend.direction])}>
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-400">{trend.label}</span>
              )}
            </div>
          ) : description ? (
            <p className="text-xs text-gray-400 mt-1 truncate">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Horizontal scrolling stat row for mobile
interface StatRowProps {
  children: React.ReactNode;
  className?: string;
}

export function StatRow({ children, className }: StatRowProps) {
  return (
    <div
      className={cn(
        // Mobile: horizontal scroll
        "flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory",
        // Desktop: grid layout
        "sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0",
        className
      )}
    >
      {React.Children.map(children, (child) => (
        <div className="min-w-[200px] sm:min-w-0 snap-start">
          {child}
        </div>
      ))}
    </div>
  );
}

// Compact stat for inline display
interface StatInlineProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function StatInline({ label, value, icon: Icon, className }: StatInlineProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Icon && (
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
