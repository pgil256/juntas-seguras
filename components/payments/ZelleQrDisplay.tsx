"use client";

import { useState, useCallback } from "react";
import {
  QrCode,
  Copy,
  Check,
  Download,
  Smartphone,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../../lib/utils";

interface ZelleQRData {
  token?: string;
  rawContent?: string;
  imageDataUrl?: string;
  uploadedAt?: string;
}

interface ZelleQrDisplayProps {
  /** The Zelle QR code data to display */
  zelleQR: ZelleQRData | null | undefined;
  /** Fallback Zelle identifier (email/phone) if no QR */
  zelleIdentifier?: string;
  /** Display name of the recipient */
  recipientName?: string;
  /** Amount to pay (for display purposes) */
  amount?: number;
  /** Note/memo for the payment */
  note?: string;
  /** Size of the QR code display */
  size?: "small" | "medium" | "large";
  /** Whether to show download button */
  showDownload?: boolean;
  /** Whether to show expand button for full-screen view */
  showExpand?: boolean;
  /** Additional class names */
  className?: string;
}

const sizeMap = {
  small: 128,
  medium: 200,
  large: 300,
} as const;

/**
 * ZelleQrDisplay Component
 *
 * Displays a Zelle QR code for others to scan and make payments.
 * Falls back to showing the Zelle identifier if no QR code is available.
 */
export function ZelleQrDisplay({
  zelleQR,
  zelleIdentifier,
  recipientName,
  amount,
  note,
  size = "medium",
  showDownload = true,
  showExpand = true,
  className,
}: ZelleQrDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  const pixelSize = sizeMap[size];
  const hasQR = !!zelleQR?.imageDataUrl;

  const formattedAmount = amount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : null;

  // Copy Zelle identifier to clipboard
  const handleCopyIdentifier = useCallback(async () => {
    const textToCopy = zelleIdentifier || zelleQR?.rawContent || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [zelleIdentifier, zelleQR]);

  // Download QR code image
  const handleDownload = useCallback(() => {
    if (!zelleQR?.imageDataUrl) return;

    const link = document.createElement("a");
    link.href = zelleQR.imageDataUrl;
    link.download = `zelle-qr-${recipientName?.replace(/\s+/g, "-") || "payment"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [zelleQR, recipientName]);

  // If no QR and no identifier, show placeholder
  if (!hasQR && !zelleIdentifier) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-[#6D1ED4]/30 bg-[#6D1ED4]/5",
          className
        )}
        style={{ width: pixelSize, minHeight: pixelSize }}
      >
        <QrCode className="h-12 w-12 text-[#6D1ED4]/40 mb-3" />
        <p className="text-sm text-gray-500 text-center">
          No Zelle QR code available
        </p>
        <p className="text-xs text-gray-400 mt-1 text-center">
          Ask the recipient for their Zelle info
        </p>
      </div>
    );
  }

  // If no QR but has identifier, show copy interface
  if (!hasQR && zelleIdentifier) {
    return (
      <div
        className={cn(
          "flex flex-col items-center p-6 rounded-lg border-2 border-[#6D1ED4] bg-[#6D1ED4]/5",
          className
        )}
      >
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#6D1ED4]/20 mb-4">
          <span className="text-2xl font-bold text-[#6D1ED4]">Z</span>
        </div>

        {recipientName && (
          <p className="text-sm text-gray-600 mb-1">Send to</p>
        )}
        {recipientName && (
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {recipientName}
          </p>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border mb-4">
          <span className="text-[#6D1ED4] font-medium">{zelleIdentifier}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyIdentifier}
            className="h-7 px-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {formattedAmount && (
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {formattedAmount}
          </p>
        )}

        {note && (
          <p className="text-sm text-gray-500 text-center max-w-[200px]">
            {note}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          Open your Zelle app and send to this email/phone
        </p>
      </div>
    );
  }

  // Has QR code - show scannable display
  return (
    <>
      <div className={cn("flex flex-col items-center", className)}>
        {/* QR Code Container */}
        <div className="relative p-4 rounded-lg border-2 border-[#6D1ED4] bg-white">
          {/* QR Code Image */}
          <img
            src={zelleQR!.imageDataUrl}
            alt={`Zelle QR code${recipientName ? ` for ${recipientName}` : ""}`}
            width={pixelSize}
            height={pixelSize}
            className="block"
          />

          {/* Zelle Label */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-white">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6D1ED4]">
              Zelle
            </span>
          </div>

          {/* Expand Button */}
          {showExpand && (
            <button
              onClick={() => setShowFullScreen(true)}
              className="absolute top-1 right-1 p-1.5 rounded-md bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="View full screen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Recipient Info */}
        {recipientName && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-500">Pay</p>
            <p className="text-lg font-semibold text-gray-900">{recipientName}</p>
          </div>
        )}

        {/* Amount Display */}
        {formattedAmount && (
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formattedAmount}
          </p>
        )}

        {/* Note */}
        {note && (
          <p className="mt-1 text-xs text-gray-500 max-w-[200px] truncate text-center">
            {note}
          </p>
        )}

        {/* Scan Instructions */}
        <div className="mt-3 flex items-center gap-1.5 text-gray-500">
          <Smartphone className="h-4 w-4" />
          <span className="text-xs">Scan with your Zelle app</span>
        </div>

        {/* Fallback Identifier (if available) */}
        {zelleIdentifier && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">or send to</span>
            <button
              onClick={handleCopyIdentifier}
              className="flex items-center gap-1 text-xs text-[#6D1ED4] hover:text-[#5a17b0] font-medium"
            >
              {zelleIdentifier}
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {showDownload && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Save QR Code
            </Button>
          </div>
        )}
      </div>

      {/* Full Screen Dialog */}
      <Dialog open={showFullScreen} onOpenChange={setShowFullScreen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-[#6D1ED4]">Zelle</span> Payment
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <img
              src={zelleQR!.imageDataUrl}
              alt="Zelle QR Code"
              className="w-64 h-64 object-contain"
            />
            {recipientName && (
              <p className="mt-4 text-lg font-semibold text-gray-900">
                {recipientName}
              </p>
            )}
            {formattedAmount && (
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formattedAmount}
              </p>
            )}
            {note && (
              <p className="mt-2 text-sm text-gray-500">{note}</p>
            )}
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              {zelleIdentifier && (
                <Button
                  variant="outline"
                  onClick={handleCopyIdentifier}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact Zelle QR display for inline use
 */
interface ZelleQrBadgeProps {
  zelleQR: ZelleQRData | null | undefined;
  zelleIdentifier?: string;
  recipientName?: string;
  className?: string;
}

export function ZelleQrBadge({
  zelleQR,
  zelleIdentifier,
  recipientName,
  className,
}: ZelleQrBadgeProps) {
  const [showQR, setShowQR] = useState(false);
  const hasQR = !!zelleQR?.imageDataUrl;

  if (!hasQR && !zelleIdentifier) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowQR(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "bg-[#6D1ED4]/10 text-[#6D1ED4] hover:bg-[#6D1ED4]/20",
          "text-sm font-medium transition-colors",
          className
        )}
      >
        {hasQR ? (
          <>
            <QrCode className="h-4 w-4" />
            Scan Zelle QR
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4" />
            Zelle
          </>
        )}
      </button>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay with Zelle</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <ZelleQrDisplay
              zelleQR={zelleQR}
              zelleIdentifier={zelleIdentifier}
              recipientName={recipientName}
              size="large"
              showExpand={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Zelle QR code with payment info card
 */
interface ZelleQrCardProps {
  zelleQR: ZelleQRData | null | undefined;
  zelleIdentifier?: string;
  recipientName?: string;
  amount?: number;
  note?: string;
  className?: string;
}

export function ZelleQrCard({
  zelleQR,
  zelleIdentifier,
  recipientName,
  amount,
  note,
  className,
}: ZelleQrCardProps) {
  const [copied, setCopied] = useState(false);
  const hasQR = !!zelleQR?.imageDataUrl;

  const formattedAmount = amount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : null;

  const handleCopy = async () => {
    const textToCopy = zelleIdentifier || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-[#6D1ED4] bg-[#6D1ED4]/5 p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-[#6D1ED4]">Zelle</span>
          {zelleIdentifier && (
            <span className="text-gray-600">{zelleIdentifier}</span>
          )}
        </div>
        {formattedAmount && (
          <span className="text-lg font-bold text-gray-900">
            {formattedAmount}
          </span>
        )}
      </div>

      <div className="flex gap-4">
        {hasQR && (
          <div className="flex-shrink-0">
            <img
              src={zelleQR!.imageDataUrl}
              alt="Zelle QR Code"
              className="w-24 h-24 rounded-lg border bg-white"
            />
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          {recipientName && (
            <p className="text-sm text-gray-600 mb-1">Send to {recipientName}</p>
          )}
          {note && <p className="text-xs text-gray-500 mb-2">{note}</p>}

          <div className="flex gap-2">
            {zelleIdentifier && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
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
                    Copy ID
                  </>
                )}
              </Button>
            )}
            {hasQR && (
              <ZelleQrBadge
                zelleQR={zelleQR}
                zelleIdentifier={zelleIdentifier}
                recipientName={recipientName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZelleQrDisplay;
