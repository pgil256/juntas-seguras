// components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px] active:scale-[0.98] shadow-sm hover:shadow",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline:
          "border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-slate-100 hover:text-slate-900 shadow-none hover:shadow-none",
        link: "text-blue-600 underline-offset-4 hover:underline shadow-none hover:shadow-none",
        // Semantic variants
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-amber-500 text-white hover:bg-amber-600",
      },
      size: {
        default: "h-11 min-h-[44px] px-4 py-2",
        sm: "h-10 min-h-[40px] sm:min-h-[36px] rounded-md px-3 text-xs",
        lg: "h-12 min-h-[48px] rounded-md px-8 text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  });

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Text to show while loading (optional, defaults to hiding children) */
  loadingText?: string;
}

/**
 * Button Component
 *
 * Enhanced button with loading state support.
 *
 * @example
 * // Basic usage
 * <Button>Click me</Button>
 *
 * @example
 * // Loading state
 * <Button loading>Submit</Button>
 *
 * @example
 * // Loading with custom text
 * <Button loading loadingText="Saving...">Save</Button>
 *
 * @example
 * // Semantic variants
 * <Button variant="success">Confirm</Button>
 * <Button variant="warning">Proceed with caution</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, loadingText, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
