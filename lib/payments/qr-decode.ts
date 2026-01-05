/**
 * QR Code Decoding Utility for Zelle QR Codes
 *
 * Decodes QR codes from uploaded images to extract Zelle payment information.
 * Uses jsqr for QR code decoding and sharp for image processing.
 */

import jsQR from 'jsqr';
import sharp from 'sharp';

export interface ZelleQRData {
  /** The Zelle token/identifier from the QR code */
  token: string;
  /** The recipient identifier (email or phone) if extractable */
  recipient?: string;
  /** The display name if available in the QR data */
  displayName?: string;
  /** Raw QR code content */
  rawContent: string;
}

export interface QRDecodeResult {
  success: boolean;
  data?: ZelleQRData;
  error?: string;
  /** The original image as a base64 data URL (resized for storage) */
  imageDataUrl?: string;
}

/**
 * Validates that a base64 string is a valid image
 */
export function isValidImageBase64(base64: string): boolean {
  // Check for common image data URL prefixes
  const validPrefixes = [
    'data:image/png;base64,',
    'data:image/jpeg;base64,',
    'data:image/jpg;base64,',
    'data:image/webp;base64,',
    'data:image/gif;base64,',
  ];

  return validPrefixes.some((prefix) => base64.startsWith(prefix));
}

/**
 * Extracts the pure base64 data from a data URL
 */
export function extractBase64Data(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

/**
 * Decodes a QR code from a base64 image data URL
 */
export async function decodeQRFromBase64(imageDataUrl: string): Promise<QRDecodeResult> {
  try {
    // Validate the input
    if (!isValidImageBase64(imageDataUrl)) {
      return {
        success: false,
        error: 'Invalid image format. Please upload a PNG, JPEG, or WebP image.',
      };
    }

    // Extract base64 data
    const extracted = extractBase64Data(imageDataUrl);
    if (!extracted) {
      return {
        success: false,
        error: 'Could not parse image data.',
      };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(extracted.data, 'base64');

    // Process image with sharp to get raw pixel data
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha() // Ensure RGBA format
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Decode QR code using jsQR
    const qrCode = jsQR(
      new Uint8ClampedArray(data),
      info.width,
      info.height
    );

    if (!qrCode) {
      return {
        success: false,
        error: 'No QR code found in the image. Please ensure the QR code is clearly visible.',
      };
    }

    // Parse the QR code content
    const zelleData = parseZelleQRContent(qrCode.data);

    if (!zelleData) {
      return {
        success: false,
        error: 'The QR code does not appear to be a valid Zelle QR code.',
      };
    }

    // Create a resized version of the image for storage
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const resizedDataUrl = `data:image/png;base64,${resizedImageBuffer.toString('base64')}`;

    return {
      success: true,
      data: zelleData,
      imageDataUrl: resizedDataUrl,
    };
  } catch (error) {
    console.error('QR decode error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode QR code.',
    };
  }
}

/**
 * Parses Zelle QR code content to extract payment information
 *
 * Zelle QR codes typically contain URLs or encoded data in various formats:
 * - https://enroll.zellepay.com/qr/{token}
 * - https://www.zellepay.com/qr/{token}
 * - zelle://pay?token={token}
 * - Custom bank-specific formats
 */
export function parseZelleQRContent(content: string): ZelleQRData | null {
  const rawContent = content.trim();

  // Pattern 1: Zelle Pay URL format
  const zellePayUrlPattern = /zellepay\.com\/qr\/([A-Za-z0-9_-]+)/i;
  const zellePayMatch = rawContent.match(zellePayUrlPattern);
  if (zellePayMatch) {
    return {
      token: zellePayMatch[1],
      rawContent,
    };
  }

  // Pattern 2: Zelle deep link format
  const zelleDeepLinkPattern = /zelle:\/\/pay\?token=([A-Za-z0-9_-]+)/i;
  const deepLinkMatch = rawContent.match(zelleDeepLinkPattern);
  if (deepLinkMatch) {
    return {
      token: deepLinkMatch[1],
      rawContent,
    };
  }

  // Pattern 3: Zelle enroll URL format
  const enrollUrlPattern = /enroll\.zellepay\.com\/qr\/([A-Za-z0-9_-]+)/i;
  const enrollMatch = rawContent.match(enrollUrlPattern);
  if (enrollMatch) {
    return {
      token: enrollMatch[1],
      rawContent,
    };
  }

  // Pattern 4: Generic Zelle URL with token parameter
  const tokenParamPattern = /[?&]token=([A-Za-z0-9_-]+)/i;
  const tokenMatch = rawContent.match(tokenParamPattern);
  if (tokenMatch && rawContent.toLowerCase().includes('zelle')) {
    return {
      token: tokenMatch[1],
      rawContent,
    };
  }

  // Pattern 5: Direct token format (alphanumeric, 20+ characters)
  // Some Zelle QR codes may just contain the token directly
  if (/^[A-Za-z0-9_-]{20,}$/.test(rawContent)) {
    return {
      token: rawContent,
      rawContent,
    };
  }

  // Pattern 6: JSON format (some banks use this)
  try {
    const jsonData = JSON.parse(rawContent);
    if (jsonData.token || jsonData.zelleToken || jsonData.id) {
      return {
        token: jsonData.token || jsonData.zelleToken || jsonData.id,
        recipient: jsonData.email || jsonData.phone || jsonData.recipient,
        displayName: jsonData.name || jsonData.displayName,
        rawContent,
      };
    }
  } catch {
    // Not JSON, continue to other patterns
  }

  // Pattern 7: Bank-specific URL patterns
  // Wells Fargo, Chase, Bank of America, etc. may have custom formats
  const bankPatterns = [
    /wellsfargo\.com.*zelle.*\/([A-Za-z0-9_-]+)/i,
    /chase\.com.*zelle.*\/([A-Za-z0-9_-]+)/i,
    /bankofamerica\.com.*zelle.*\/([A-Za-z0-9_-]+)/i,
  ];

  for (const pattern of bankPatterns) {
    const match = rawContent.match(pattern);
    if (match) {
      return {
        token: match[1],
        rawContent,
      };
    }
  }

  // If the content contains "zelle" (case insensitive) and has a reasonable structure,
  // store it as a custom format that may still be valid
  if (rawContent.toLowerCase().includes('zelle') && rawContent.length > 10) {
    return {
      token: rawContent, // Store the entire content as the token
      rawContent,
    };
  }

  return null;
}

/**
 * Decodes a QR code from a Buffer (for server-side processing)
 */
export async function decodeQRFromBuffer(imageBuffer: Buffer): Promise<QRDecodeResult> {
  try {
    // Process image with sharp to get raw pixel data
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Decode QR code
    const qrCode = jsQR(
      new Uint8ClampedArray(data),
      info.width,
      info.height
    );

    if (!qrCode) {
      return {
        success: false,
        error: 'No QR code found in the image.',
      };
    }

    // Parse the QR code content
    const zelleData = parseZelleQRContent(qrCode.data);

    if (!zelleData) {
      return {
        success: false,
        error: 'The QR code does not appear to be a valid Zelle QR code.',
      };
    }

    // Create a resized version for storage
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const resizedDataUrl = `data:image/png;base64,${resizedImageBuffer.toString('base64')}`;

    return {
      success: true,
      data: zelleData,
      imageDataUrl: resizedDataUrl,
    };
  } catch (error) {
    console.error('QR decode error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode QR code.',
    };
  }
}

/**
 * Validates a Zelle token format
 */
export function isValidZelleToken(token: string): boolean {
  // Zelle tokens are typically alphanumeric with hyphens/underscores, 10+ characters
  return /^[A-Za-z0-9_-]{10,}$/.test(token);
}

/**
 * Creates a Zelle QR code URL from a token
 */
export function createZelleQRUrl(token: string): string {
  return `https://enroll.zellepay.com/qr/${token}`;
}
