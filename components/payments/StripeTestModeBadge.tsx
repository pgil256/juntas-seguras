'use client';

// StripeTestModeBadge — a high-visibility badge shown anywhere Stripe UI
// appears, making it unmistakable that this is a sandbox: NO real money moves.
// This application integrates Stripe in TEST MODE only.

import { FlaskConical } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StripeTestModeBadgeProps {
  className?: string;
  label?: string;
}

export function StripeTestModeBadge({ className, label }: StripeTestModeBadgeProps) {
  return (
    <span
      role="status"
      aria-label="Stripe test mode — no real money"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800',
        className
      )}
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      {label || 'TEST MODE — no real money'}
    </span>
  );
}

export default StripeTestModeBadge;
