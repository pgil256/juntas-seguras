"use client";

import { useState, useEffect, useCallback } from "react";
import { QrCode, Download, Copy, Check, Smartphone, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import type { PaymentMethodType } from "./PaymentLinkButton";

interface PaymentQrCodeProps {
  type: PaymentMethodType;
  handle: string;
  amount: number;
  note?: string;
  size?: 'small' | 'medium' | 'large';
  showDownload?: boolean;
  showCopyLink?: boolean;
  className?: string;
  onGenerated?: (dataUrl: string) => void;
  onError?: (error: Error) => void;
}

interface QRCodeData {
  dataUrl: string;
  content: string;
  size: number;
}

const sizeMap = {
  small: 128,
  medium: 200,
  large: 300,
} as const;

const methodConfig: Record<PaymentMethodType, {
  label: string;
  bgColor: string;
  borderColor: string;
  supportsQR: boolean;
}> = {
  venmo: {
    label: 'Venmo',
    bgColor: 'bg-[#3D95CE]/10',
    borderColor: 'border-[#3D95CE]',
    supportsQR: true,
  },
  cashapp: {
    label: 'Cash App',
    bgColor: 'bg-[#00D632]/10',
    borderColor: 'border-[#00D632]',
    supportsQR: true,
  },
  paypal: {
    label: 'PayPal',
    bgColor: 'bg-[#003087]/10',
    borderColor: 'border-[#003087]',
    supportsQR: true,
  },
  zelle: {
    label: 'Zelle',
    bgColor: 'bg-[#6D1ED4]/10',
    borderColor: 'border-[#6D1ED4]',
    supportsQR: false,
  },
};

/**
 * PaymentQrCode Component
 *
 * Generates and displays QR codes for Venmo, Cash App, and PayPal payment links.
 * Allows desktop users to scan with their mobile device to open the payment app.
 */
export function PaymentQrCode({
  type,
  handle,
  amount,
  note,
  size = 'medium',
  showDownload = true,
  showCopyLink = true,
  className,
  onGenerated,
  onError,
}: PaymentQrCodeProps) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const config = methodConfig[type];
  const pixelSize = sizeMap[size];

  const generateQRCode = useCallback(async () => {
    if (!config.supportsQR) {
      setError(`${config.label} does not support QR code payments`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Dynamic import for server-side safety
      const { generatePaymentQRCode } = await import('../../lib/payments/qr-code');

      const result = await generatePaymentQRCode(
        type,
        { recipientHandle: handle, amount, note },
        { size: pixelSize }
      );

      if (result) {
        setQrData(result);
        onGenerated?.(result.dataUrl);
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [type, handle, amount, note, pixelSize, config.supportsQR, config.label, onGenerated, onError]);

  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  const handleDownload = useCallback(() => {
    if (!qrData) return;

    const link = document.createElement('a');
    link.href = qrData.dataUrl;
    link.download = `${type}-payment-qr-${amount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrData, type, amount]);

  const handleCopyLink = useCallback(async () => {
    if (!qrData) return;

    try {
      await navigator.clipboard.writeText(qrData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = qrData.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [qrData]);

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  // If method doesn't support QR codes, show a message
  if (!config.supportsQR) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed",
          config.borderColor,
          config.bgColor,
          className
        )}
        style={{ width: pixelSize, minHeight: pixelSize }}
      >
        <QrCode className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 text-center">
          {config.label} doesn&apos;t support QR code payments
        </p>
        <p className="text-xs text-gray-500 mt-1 text-center">
          Copy the {config.label} ID to pay manually
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 rounded-lg border-2",
          config.borderColor,
          config.bgColor,
          className
        )}
        style={{ width: pixelSize, minHeight: pixelSize }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-2" />
        <p className="text-sm text-gray-600">Generating QR code...</p>
      </div>
    );
  }

  // Error state
  if (error || !qrData) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 rounded-lg border-2 border-red-200 bg-red-50",
          className
        )}
        style={{ width: pixelSize, minHeight: pixelSize }}
      >
        <QrCode className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-red-600 text-center">{error || 'Failed to generate QR code'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={generateQRCode}
          className="mt-3"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Success state with QR code
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* QR Code Container */}
      <div
        className={cn(
          "relative p-4 rounded-lg border-2 bg-white",
          config.borderColor
        )}
      >
        {/* QR Code Image */}
        <img
          src={qrData.dataUrl}
          alt={`${config.label} payment QR code for ${formattedAmount}`}
          width={pixelSize}
          height={pixelSize}
          className="block"
        />

        {/* Method Label */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-white">
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            type === 'venmo' && 'text-[#3D95CE]',
            type === 'cashapp' && 'text-[#00D632]',
            type === 'paypal' && 'text-[#003087]',
          )}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Amount Display */}
      <div className="mt-3 text-center">
        <p className="text-lg font-semibold text-gray-900">{formattedAmount}</p>
        {note && (
          <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">{note}</p>
        )}
      </div>

      {/* Scan Instructions */}
      <div className="mt-3 flex items-center gap-1.5 text-gray-500">
        <Smartphone className="h-4 w-4" />
        <span className="text-xs">Scan with your phone to pay</span>
      </div>

      {/* Action Buttons */}
      {(showDownload || showCopyLink) && (
        <div className="mt-4 flex gap-2">
          {showDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Save
            </Button>
          )}
          {showCopyLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact QR code button that expands to show the QR code
 */
interface QrCodeButtonProps {
  type: PaymentMethodType;
  handle: string;
  amount: number;
  note?: string;
  disabled?: boolean;
  className?: string;
}

export function QrCodeButton({
  type,
  handle,
  amount,
  note,
  disabled = false,
  className,
}: QrCodeButtonProps) {
  const [showQR, setShowQR] = useState(false);
  const config = methodConfig[type];

  if (!config.supportsQR) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowQR(!showQR)}
        disabled={disabled}
        className="gap-1.5"
        aria-label={`Show ${config.label} QR code`}
      >
        <QrCode className="h-4 w-4" />
        QR Code
      </Button>

      {showQR && (
        <div className="absolute z-50 mt-2 p-4 bg-white rounded-lg shadow-lg border">
          <button
            onClick={() => setShowQR(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="Close QR code"
          >
            ×
          </button>
          <PaymentQrCode
            type={type}
            handle={handle}
            amount={amount}
            note={note}
            size="small"
            showDownload={false}
            showCopyLink={false}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Grid of QR codes for all available payment methods
 */
interface PaymentQrCodeGridProps {
  methods: {
    venmo?: string | null;
    cashapp?: string | null;
    paypal?: string | null;
    zelle?: string | null;
  };
  amount: number;
  note?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function PaymentQrCodeGrid({
  methods,
  amount,
  note,
  size = 'medium',
  className,
}: PaymentQrCodeGridProps) {
  const availableMethods: PaymentMethodType[] = ['venmo', 'cashapp', 'paypal'];

  const activeMethods = availableMethods.filter(type => {
    const handle = methods[type];
    return handle && methodConfig[type].supportsQR;
  });

  if (activeMethods.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <QrCode className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No QR-compatible payment methods available</p>
        <p className="text-sm mt-1">Set up Venmo, Cash App, or PayPal to use QR codes</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-6",
      activeMethods.length === 1 && "grid-cols-1",
      activeMethods.length === 2 && "grid-cols-2",
      activeMethods.length >= 3 && "grid-cols-3",
      className
    )}>
      {activeMethods.map(type => {
        const handle = methods[type];
        if (!handle) return null;

        return (
          <PaymentQrCode
            key={type}
            type={type}
            handle={handle}
            amount={amount}
            note={note}
            size={size}
          />
        );
      })}
    </div>
  );
}

/**
 * Card with payment link and optional QR code toggle
 */
interface PaymentQrCodeCardProps {
  type: PaymentMethodType;
  handle: string;
  amount: number;
  note?: string;
  link?: string | null;
  className?: string;
}

export function PaymentQrCodeCard({
  type,
  handle,
  amount,
  note,
  link,
  className,
}: PaymentQrCodeCardProps) {
  const [showQR, setShowQR] = useState(false);
  const config = methodConfig[type];

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  // Format handle for display
  const displayHandle = (() => {
    switch (type) {
      case 'venmo':
        return handle.startsWith('@') ? handle : `@${handle}`;
      case 'cashapp':
        return handle.startsWith('$') ? handle : `$${handle}`;
      case 'paypal':
        return `paypal.me/${handle}`;
      default:
        return handle;
    }
  })();

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 transition-all",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-lg font-semibold",
            type === 'venmo' && 'text-[#3D95CE]',
            type === 'cashapp' && 'text-[#00D632]',
            type === 'paypal' && 'text-[#003087]',
            type === 'zelle' && 'text-[#6D1ED4]',
          )}>
            {config.label}
          </span>
          <span className="text-gray-600">{displayHandle}</span>
        </div>
        <span className="text-lg font-bold text-gray-900">{formattedAmount}</span>
      </div>

      <div className="flex gap-2">
        {link && (
          <Button
            asChild
            size="sm"
            className={cn(
              "flex-1",
              type === 'venmo' && 'bg-[#3D95CE] hover:bg-[#2d7fb8]',
              type === 'cashapp' && 'bg-[#00D632] hover:bg-[#00b82b]',
              type === 'paypal' && 'bg-[#003087] hover:bg-[#002470]',
            )}
          >
            <a href={link} target="_blank" rel="noopener noreferrer" className="gap-1.5">
              <ExternalLink className="h-4 w-4" />
              Pay with {config.label}
            </a>
          </Button>
        )}

        {config.supportsQR && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQR(!showQR)}
            className="gap-1.5"
          >
            <QrCode className="h-4 w-4" />
            {showQR ? 'Hide' : 'QR'}
          </Button>
        )}
      </div>

      {showQR && config.supportsQR && (
        <div className="mt-4 flex justify-center">
          <PaymentQrCode
            type={type}
            handle={handle}
            amount={amount}
            note={note}
            size="small"
          />
        </div>
      )}
    </div>
  );
}

export default PaymentQrCode;
