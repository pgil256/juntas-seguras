"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export type PaymentMethodType = 'venmo' | 'cashapp' | 'paypal' | 'zelle';

interface PaymentLinkButtonProps {
  type: PaymentMethodType;
  link: string | null;
  amount: number;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onClick?: () => void;
}

const methodConfig: Record<PaymentMethodType, {
  label: string;
  bgColor: string;
  hoverColor: string;
  textColor: string;
  icon: string;
}> = {
  venmo: {
    label: 'Venmo',
    bgColor: 'bg-[#3D95CE]',
    hoverColor: 'hover:bg-[#2d7fb8]',
    textColor: 'text-white',
    icon: 'V',
  },
  cashapp: {
    label: 'Cash App',
    bgColor: 'bg-[#00D632]',
    hoverColor: 'hover:bg-[#00b82b]',
    textColor: 'text-white',
    icon: '$',
  },
  paypal: {
    label: 'PayPal',
    bgColor: 'bg-[#003087]',
    hoverColor: 'hover:bg-[#002470]',
    textColor: 'text-white',
    icon: 'P',
  },
  zelle: {
    label: 'Zelle',
    bgColor: 'bg-[#6D1ED4]',
    hoverColor: 'hover:bg-[#5a19b0]',
    textColor: 'text-white',
    icon: 'Z',
  },
};

export function PaymentLinkButton({
  type,
  link,
  amount,
  disabled = false,
  size = 'default',
  className,
  onClick,
}: PaymentLinkButtonProps) {
  const config = methodConfig[type];
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  if (!link) {
    return null;
  }

  const handleClick = () => {
    onClick?.();
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    default: 'h-11 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        config.bgColor,
        config.hoverColor,
        config.textColor,
        sizeClasses[size],
        'font-semibold transition-colors flex items-center gap-2',
        className
      )}
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">
        {config.icon}
      </span>
      <span>{config.label}</span>
      <span className="font-bold">{formattedAmount}</span>
      <ExternalLink className="h-4 w-4 ml-1 opacity-75" />
    </Button>
  );
}

interface PaymentMethodBadgeProps {
  type: PaymentMethodType;
  handle: string;
  showLink?: boolean;
  link?: string | null;
  className?: string;
}

export function PaymentMethodBadge({
  type,
  handle,
  showLink = false,
  link,
  className,
}: PaymentMethodBadgeProps) {
  const config = methodConfig[type];

  // Format handle for display
  const displayHandle = (() => {
    switch (type) {
      case 'venmo':
        return handle.startsWith('@') ? handle : `@${handle}`;
      case 'cashapp':
        return handle.startsWith('$') ? handle : `$${handle}`;
      case 'paypal':
        return `paypal.me/${handle}`;
      case 'zelle':
        return handle;
      default:
        return handle;
    }
  })();

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-xs font-bold">
        {config.icon}
      </span>
      <span>{displayHandle}</span>
      {showLink && link && (
        <ExternalLink className="h-3 w-3 opacity-75" />
      )}
    </span>
  );

  if (showLink && link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block hover:opacity-90 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return content;
}

interface PaymentMethodsListProps {
  methods: {
    venmo?: string | null;
    cashapp?: string | null;
    paypal?: string | null;
    zelle?: string | null;
  };
  amount?: number;
  note?: string;
  onPaymentClick?: (type: PaymentMethodType) => void;
  generateLinks?: boolean;
  showAsButtons?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function PaymentMethodsList({
  methods,
  amount = 0,
  note = '',
  onPaymentClick,
  generateLinks = true,
  showAsButtons = true,
  size = 'default',
  className,
}: PaymentMethodsListProps) {
  // Import dynamically to avoid circular dependencies
  const { generatePayoutLink } = require('../../lib/payments/deep-links');

  const availableMethods: PaymentMethodType[] = ['venmo', 'cashapp', 'paypal', 'zelle'];

  const getLink = (type: PaymentMethodType, handle: string | null | undefined): string | null => {
    if (!generateLinks || !handle) return null;
    try {
      return generatePayoutLink(type, { recipientHandle: handle, amount, note });
    } catch {
      return null;
    }
  };

  const activeMethods = availableMethods.filter(type => methods[type]);

  if (activeMethods.length === 0) {
    return (
      <div className={cn("text-gray-500 text-sm italic", className)}>
        No payment methods set up
      </div>
    );
  }

  if (showAsButtons) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {activeMethods.map(type => {
          const handle = methods[type];
          if (!handle) return null;

          const link = getLink(type, handle);

          // Special handling for Zelle (no deep link)
          if (type === 'zelle') {
            return (
              <PaymentMethodBadge
                key={type}
                type={type}
                handle={handle}
                className="cursor-default"
              />
            );
          }

          return (
            <PaymentLinkButton
              key={type}
              type={type}
              link={link}
              amount={amount}
              size={size}
              onClick={() => onPaymentClick?.(type)}
            />
          );
        })}
      </div>
    );
  }

  // Show as badges
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activeMethods.map(type => {
        const handle = methods[type];
        if (!handle) return null;

        const link = getLink(type, handle);

        return (
          <PaymentMethodBadge
            key={type}
            type={type}
            handle={handle}
            showLink={!!link}
            link={link}
          />
        );
      })}
    </div>
  );
}

export default PaymentLinkButton;
