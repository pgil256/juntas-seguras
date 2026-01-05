// components/ui/input.tsx
import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, iconPosition = 'left', error, success, ...props }, ref) => {
    const hasIcon = !!Icon;

    return (
      <div className="relative w-full">
        {/* Left icon */}
        {hasIcon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={cn(
              "h-5 w-5 transition-colors",
              error ? "text-red-400" : success ? "text-green-500" : "text-gray-400"
            )} />
          </div>
        )}

        <input
          type={type}
          className={cn(
            // Base styles
            "flex h-12 sm:h-11 min-h-[44px] w-full rounded-xl border bg-white",
            "px-4 py-2.5 text-base sm:text-sm",
            "ring-offset-white transition-all duration-200",
            // Placeholder
            "placeholder:text-gray-400",
            // File input
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            // Focus states
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            // Icon padding adjustments
            hasIcon && iconPosition === 'left' && "pl-11",
            hasIcon && iconPosition === 'right' && "pr-11",
            // State-based colors
            error
              ? "border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500"
              : success
                ? "border-green-300 focus-visible:ring-green-500 focus-visible:border-green-500"
                : "border-gray-200 hover:border-gray-300 focus-visible:ring-blue-500 focus-visible:border-blue-500",
            className
          )}
          ref={ref}
          {...props}
        />

        {/* Right icon */}
        {hasIcon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={cn(
              "h-5 w-5 transition-colors",
              error ? "text-red-400" : success ? "text-green-500" : "text-gray-400"
            )} />
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// Search input variant with built-in styling
const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        type="search"
        className={cn(
          "rounded-full bg-gray-50 border-gray-200",
          "focus-visible:bg-white",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";

// Floating label input for forms
interface FloatingInputProps extends InputProps {
  label: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            "peer flex h-14 w-full rounded-xl border bg-white",
            "px-4 pt-5 pb-2 text-base sm:text-sm",
            "ring-offset-white transition-all duration-200",
            "placeholder-transparent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            "border-gray-200 hover:border-gray-300 focus-visible:border-blue-500",
            className
          )}
          placeholder={label}
          ref={ref}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2",
            "text-gray-500 text-base sm:text-sm",
            "transition-all duration-200 pointer-events-none",
            "peer-focus:top-3 peer-focus:text-xs peer-focus:text-blue-600",
            "peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

export { Input, SearchInput as SearchInputStyled, FloatingInput };
