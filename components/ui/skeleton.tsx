// components/ui/skeleton.tsx
// Reusable skeleton components for consistent loading states
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'shimmer' | 'wave';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Skeleton({
  className,
  variant = 'shimmer',
  rounded = 'md',
}: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-100",
        roundedClasses[rounded],
        variant === 'shimmer' && "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        variant === 'wave' && "animate-pulse",
        variant === 'default' && "animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  );
}

// Skeleton text with realistic line heights
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-4/5" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Card skeleton for general card loading states
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-white p-4 sm:p-6 shadow-sm", className)}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-2/3" rounded="lg" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 shrink-0" rounded="lg" />
        </div>
        <SkeletonText lines={2} />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24" rounded="lg" />
          <Skeleton className="h-9 w-20" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

// Stats card skeleton - more realistic with icon placement
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 sm:gap-4">
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 shrink-0" rounded="xl" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Avatar skeleton
export function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b">
      <AvatarSkeleton size="sm" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// Button skeleton
export function ButtonSkeleton({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-20",
    default: "h-10 w-24",
    lg: "h-12 w-32",
  };

  return <Skeleton className={cn("rounded-md", sizeClasses[size])} />;
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 mb-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

// Dashboard stats grid skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Full page loading skeleton
export function PageLoadingSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="space-y-6">
      {title && <PageHeaderSkeleton />}
      <DashboardStatsSkeleton />
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

// Mobile-optimized horizontal scroll skeleton
export function HorizontalScrollSkeleton({
  itemCount = 4,
  itemWidth = 200,
}: {
  itemCount?: number;
  itemWidth?: number;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 sm:shrink"
          style={{ width: `${itemWidth}px`, minWidth: `${itemWidth}px` }}
        >
          <StatCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Pool card skeleton with member avatars
export function PoolCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" rounded="lg" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" rounded="full" />
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full" rounded="full" />
        </div>

        {/* Member avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 border-2 border-white" rounded="full" />
            ))}
          </div>
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-24" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12" rounded="xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-full mt-6" rounded="xl" />
    </div>
  );
}

// Notification/Activity list skeleton
export function ActivityListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
          <Skeleton className="h-10 w-10 shrink-0" rounded="full" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
