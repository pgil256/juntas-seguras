// components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Badge Variants
 *
 * Semantic color guide:
 * - success: Completed, verified, positive outcomes (green)
 * - warning: Due soon, attention needed, pending (amber)
 * - error: Overdue, failed, blocked (red) - alias for destructive
 * - info: Informational, in-progress (blue)
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Base variants
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",

        // Semantic variants
        success:
          "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
        error:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        info:
          "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

