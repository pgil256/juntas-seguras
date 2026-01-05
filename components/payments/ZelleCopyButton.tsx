"use client";

import { useState } from "react";
import { Copy, Check, Phone, Mail } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface ZelleCopyButtonProps {
  identifier: string;
  amount?: number;
  showAmount?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  onCopy?: () => void;
}

export function ZelleCopyButton({
  identifier,
  amount,
  showAmount = true,
  size = 'default',
  variant = 'default',
  className,
  onCopy,
}: ZelleCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const formattedAmount = amount
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    : null;

  // Determine if identifier is email or phone
  const isEmail = identifier.includes('@');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(identifier);
      setCopied(true);
      onCopy?.();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    default: 'h-11 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  const variantClasses = {
    default: 'bg-[#6D1ED4] hover:bg-[#5a19b0] text-white',
    outline: 'border-[#6D1ED4] text-[#6D1ED4] hover:bg-[#6D1ED4]/10',
    ghost: 'text-[#6D1ED4] hover:bg-[#6D1ED4]/10',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleCopy}
            variant={variant === 'outline' ? 'outline' : variant === 'ghost' ? 'ghost' : 'default'}
            className={cn(
              variant === 'default' && variantClasses.default,
              variant === 'outline' && variantClasses.outline,
              variant === 'ghost' && variantClasses.ghost,
              sizeClasses[size],
              'font-semibold transition-colors flex items-center gap-2',
              className
            )}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">
              Z
            </span>
            <span>Zelle</span>
            {showAmount && formattedAmount && (
              <span className="font-bold">{formattedAmount}</span>
            )}
            {copied ? (
              <Check className="h-4 w-4 ml-1 text-green-300" />
            ) : (
              <Copy className="h-4 w-4 ml-1 opacity-75" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : `Copy ${isEmail ? 'email' : 'phone'}: ${identifier}`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ZelleQRData {
  token?: string;
  rawContent?: string;
  imageDataUrl?: string;
  uploadedAt?: string;
}

interface ZelleInstructionsCardProps {
  identifier: string;
  recipientName: string;
  amount: number;
  zelleQR?: ZelleQRData | null;
  note?: string;
  className?: string;
}

export function ZelleInstructionsCard({
  identifier,
  recipientName,
  amount,
  zelleQR,
  note,
  className,
}: ZelleInstructionsCardProps) {
  const [copied, setCopied] = useState(false);
  const [showFullQR, setShowFullQR] = useState(false);

  const isEmail = identifier.includes('@');
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const hasQR = !!zelleQR?.imageDataUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-[#6D1ED4] to-[#5a19b0] rounded-lg p-4 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-lg font-bold">
          Z
        </span>
        <span className="text-lg font-semibold">Pay via Zelle</span>
      </div>

      {/* QR Code Section (if available) */}
      {hasQR && (
        <div className="mb-4">
          <div className="bg-white rounded-lg p-3 flex flex-col items-center">
            <button
              onClick={() => setShowFullQR(true)}
              className="relative group cursor-pointer"
            >
              <img
                src={zelleQR!.imageDataUrl}
                alt={`Zelle QR code for ${recipientName}`}
                className="w-32 h-32 object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
                <span className="text-xs text-transparent group-hover:text-gray-600 font-medium">
                  Tap to enlarge
                </span>
              </div>
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Scan with your bank app
            </p>
          </div>
        </div>
      )}

      {/* Recipient Info */}
      <div className="space-y-3">
        <div className="bg-white/10 rounded-md p-3">
          <div className="text-sm text-white/70 mb-1">
            {hasQR ? 'Or send manually to:' : 'Send to:'}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEmail ? (
                <Mail className="h-4 w-4 text-white/70" />
              ) : (
                <Phone className="h-4 w-4 text-white/70" />
              )}
              <span className="font-medium break-all">{identifier}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              title={copied ? 'Copied!' : 'Copy'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-300" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Recipient:</span>
          <span className="font-medium">{recipientName}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Amount:</span>
          <span className="font-bold text-lg">{formattedAmount}</span>
        </div>

        {note && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Note:</span>
            <span className="font-medium text-right max-w-[60%] truncate">{note}</span>
          </div>
        )}
      </div>

      {/* Step-by-step Instructions */}
      <div className="mt-4 pt-3 border-t border-white/20">
        <p className="text-xs font-medium text-white/80 mb-2">How to pay:</p>
        <ol className="text-xs text-white/60 space-y-1 list-decimal list-inside">
          <li>Open your bank app (Chase, Wells Fargo, etc.) or Zelle app</li>
          <li>Go to &quot;Send Money with Zelle&quot;</li>
          {hasQR ? (
            <li>Scan the QR code above, or enter: <span className="text-white/80 font-medium">{identifier}</span></li>
          ) : (
            <li>Enter recipient: <span className="text-white/80 font-medium">{identifier}</span></li>
          )}
          <li>Enter amount: <span className="text-white/80 font-medium">{formattedAmount}</span></li>
          <li>Review and send payment</li>
        </ol>
        <p className="text-xs text-white/50 mt-2">
          Zelle transfers are typically instant and free.
        </p>
      </div>

      {/* Full QR Modal */}
      {showFullQR && hasQR && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullQR(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6D1ED4] text-white text-sm font-bold">
                  Z
                </span>
                <span className="font-semibold text-gray-900">Zelle Payment</span>
              </div>
              <button
                onClick={() => setShowFullQR(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center">
              <img
                src={zelleQR!.imageDataUrl}
                alt={`Zelle QR code for ${recipientName}`}
                className="w-64 h-64 object-contain"
              />
              <p className="text-lg font-semibold text-gray-900 mt-4">{recipientName}</p>
              <p className="text-sm text-gray-500">{identifier}</p>
              <p className="text-2xl font-bold text-[#6D1ED4] mt-2">{formattedAmount}</p>
              <p className="text-xs text-gray-400 mt-4 text-center">
                Scan this QR code with your bank&apos;s Zelle feature
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="mt-4 w-full py-2 px-4 bg-[#6D1ED4] text-white rounded-lg font-medium hover:bg-[#5a19b0] transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy {isEmail ? 'Email' : 'Phone'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ZelleDisplayBadgeProps {
  identifier: string;
  copyable?: boolean;
  className?: string;
}

export function ZelleDisplayBadge({
  identifier,
  copyable = true,
  className,
}: ZelleDisplayBadgeProps) {
  const [copied, setCopied] = useState(false);

  const isEmail = identifier.includes('@');

  const handleCopy = async () => {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!copyable}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
        'bg-[#6D1ED4] text-white',
        copyable && 'hover:bg-[#5a19b0] cursor-pointer',
        !copyable && 'cursor-default',
        className
      )}
    >
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-xs font-bold">
        Z
      </span>
      {isEmail ? (
        <Mail className="h-3 w-3" />
      ) : (
        <Phone className="h-3 w-3" />
      )}
      <span className="max-w-[150px] truncate">{identifier}</span>
      {copyable && (
        copied ? (
          <Check className="h-3 w-3 text-green-300" />
        ) : (
          <Copy className="h-3 w-3 opacity-75" />
        )
      )}
    </button>
  );
}

export default ZelleCopyButton;
