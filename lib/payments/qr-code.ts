/**
 * QR Code Generation Utilities for Payment Links
 *
 * Generates QR codes for Venmo, Cash App, and PayPal payment links.
 * QR codes allow desktop users to scan with their mobile device to open
 * the payment app directly with pre-filled information.
 */

import * as QRCode from 'qrcode';
import { PayoutMethodType, generateVenmoLink, generateCashAppLink, generatePayPalLink } from './deep-links';

export interface QRCodeOptions {
  /** Width/height of the QR code in pixels (default: 200) */
  size?: number;
  /** Margin around the QR code in modules (default: 2) */
  margin?: number;
  /** Error correction level: L (7%), M (15%), Q (25%), H (30%) - default: M */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Dark color (foreground) - default: '#000000' */
  darkColor?: string;
  /** Light color (background) - default: '#ffffff' */
  lightColor?: string;
}

export interface QRCodeResult {
  /** Base64-encoded data URL for the QR code image */
  dataUrl: string;
  /** The URL/content encoded in the QR code */
  content: string;
  /** Size of the generated QR code */
  size: number;
}

export interface PaymentQRCodeParams {
  recipientHandle: string;
  amount: number;
  note?: string;
}

const DEFAULT_OPTIONS: Required<QRCodeOptions> = {
  size: 200,
  margin: 2,
  errorCorrectionLevel: 'M',
  darkColor: '#000000',
  lightColor: '#ffffff',
};

/**
 * Generates a QR code as a data URL (base64-encoded PNG)
 */
export async function generateQRCodeDataUrl(
  content: string,
  options: QRCodeOptions = {}
): Promise<QRCodeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const dataUrl = await QRCode.toDataURL(content, {
      width: opts.size,
      margin: opts.margin,
      errorCorrectionLevel: opts.errorCorrectionLevel,
      color: {
        dark: opts.darkColor,
        light: opts.lightColor,
      },
    });

    return {
      dataUrl,
      content,
      size: opts.size,
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a QR code as an SVG string
 */
export async function generateQRCodeSvg(
  content: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const svg = await QRCode.toString(content, {
      type: 'svg',
      width: opts.size,
      margin: opts.margin,
      errorCorrectionLevel: opts.errorCorrectionLevel,
      color: {
        dark: opts.darkColor,
        light: opts.lightColor,
      },
    });

    return svg;
  } catch (error) {
    throw new Error(`Failed to generate QR code SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a Venmo payment QR code
 */
export async function generateVenmoQRCode(
  params: PaymentQRCodeParams,
  options: QRCodeOptions = {}
): Promise<QRCodeResult> {
  const link = generateVenmoLink(params);
  return generateQRCodeDataUrl(link, options);
}

/**
 * Generates a Cash App payment QR code
 */
export async function generateCashAppQRCode(
  params: PaymentQRCodeParams,
  options: QRCodeOptions = {}
): Promise<QRCodeResult> {
  const link = generateCashAppLink(params);
  return generateQRCodeDataUrl(link, options);
}

/**
 * Generates a PayPal payment QR code
 */
export async function generatePayPalQRCode(
  params: PaymentQRCodeParams,
  options: QRCodeOptions = {}
): Promise<QRCodeResult> {
  const link = generatePayPalLink(params);
  return generateQRCodeDataUrl(link, options);
}

/**
 * Generates a payment QR code based on the payment method type
 * Returns null for methods that don't support QR codes (Zelle, Bank)
 */
export async function generatePaymentQRCode(
  method: PayoutMethodType,
  params: PaymentQRCodeParams,
  options: QRCodeOptions = {}
): Promise<QRCodeResult | null> {
  try {
    switch (method) {
      case 'venmo':
        return await generateVenmoQRCode(params, options);
      case 'cashapp':
        return await generateCashAppQRCode(params, options);
      case 'paypal':
        return await generatePayPalQRCode(params, options);
      case 'zelle':
      case 'bank':
        // These methods don't support QR code payments
        return null;
      default:
        return null;
    }
  } catch {
    // If generation fails, return null instead of throwing
    return null;
  }
}

/**
 * Generates a Junta-specific payment QR code with a formatted note
 */
export async function generateJuntaPaymentQRCode(
  method: PayoutMethodType,
  recipientHandle: string,
  amount: number,
  poolName: string,
  round?: number,
  options: QRCodeOptions = {}
): Promise<QRCodeResult | null> {
  const note = round
    ? `Junta: ${poolName} - Round ${round}`
    : `Junta: ${poolName}`;

  return generatePaymentQRCode(
    method,
    { recipientHandle, amount, note },
    options
  );
}

/**
 * Checks if a payment method supports QR code generation
 */
export function supportsQRCode(method: PayoutMethodType): boolean {
  return ['venmo', 'cashapp', 'paypal'].includes(method);
}

/**
 * Gets the recommended QR code size based on the display context
 */
export function getRecommendedQRSize(context: 'small' | 'medium' | 'large' | 'print'): number {
  const sizes: Record<typeof context, number> = {
    small: 128,
    medium: 200,
    large: 300,
    print: 400,
  };
  return sizes[context];
}

/**
 * Generates QR codes for all supported payment methods
 * Returns a map of method to QR code result (null if not supported or failed)
 */
export async function generateAllPaymentQRCodes(
  methods: { type: PayoutMethodType; handle: string }[],
  amount: number,
  note?: string,
  options: QRCodeOptions = {}
): Promise<Map<PayoutMethodType, QRCodeResult | null>> {
  const results = new Map<PayoutMethodType, QRCodeResult | null>();

  await Promise.all(
    methods.map(async ({ type, handle }) => {
      const result = await generatePaymentQRCode(
        type,
        { recipientHandle: handle, amount, note },
        options
      );
      results.set(type, result);
    })
  );

  return results;
}
