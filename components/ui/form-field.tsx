// components/ui/form-field.tsx
// Reusable form field components for consistent validation and styling
import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

/**
 * FormField Component
 *
 * Wrapper for form inputs with consistent spacing and structure.
 */
interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormField({ className, children, ...props }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * FormError Component
 *
 * Displays inline validation errors below form fields.
 */
interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  showIcon?: boolean;
}

export function FormError({
  className,
  children,
  showIcon = true,
  ...props
}: FormErrorProps) {
  if (!children) return null;

  return (
    <p
      className={cn(
        'text-sm text-destructive flex items-center gap-1.5',
        className
      )}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {showIcon && (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
    </p>
  );
}

/**
 * FormHelper Component
 *
 * Displays helper text below form fields.
 */
interface FormHelperProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  showIcon?: boolean;
}

export function FormHelper({
  className,
  children,
  showIcon = false,
  ...props
}: FormHelperProps) {
  if (!children) return null;

  return (
    <p
      className={cn(
        'text-sm text-muted-foreground flex items-center gap-1.5',
        className
      )}
      {...props}
    >
      {showIcon && (
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
    </p>
  );
}

/**
 * FormSuccess Component
 *
 * Displays success messages below form fields.
 */
interface FormSuccessProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  showIcon?: boolean;
}

export function FormSuccess({
  className,
  children,
  showIcon = true,
  ...props
}: FormSuccessProps) {
  if (!children) return null;

  return (
    <p
      className={cn(
        'text-sm text-green-600 flex items-center gap-1.5',
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      {showIcon && (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
    </p>
  );
}

/**
 * FormLabel Component
 *
 * Enhanced label with optional required indicator and description.
 */
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  description?: string;
}

export function FormLabel({
  className,
  children,
  required,
  optional,
  description,
  ...props
}: FormLabelProps) {
  return (
    <div className="space-y-1">
      <label
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        )}
        {optional && (
          <span className="text-muted-foreground font-normal ml-1">
            (optional)
          </span>
        )}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/**
 * getInputClassName
 *
 * Helper function to get consistent input styling with error state.
 */
export function getInputClassName(hasError: boolean, className?: string) {
  return cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    hasError && 'border-destructive focus-visible:ring-destructive',
    className
  );
}

export default FormField;
