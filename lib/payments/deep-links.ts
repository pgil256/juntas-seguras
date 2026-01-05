/**
 * Deep Link Generation Utilities for Manual Payouts
 *
 * Generates payment links for Venmo, Cash App, PayPal, and handles Zelle (no deep link).
 * These links open the respective payment apps with pre-filled recipient and amount.
 */

export type PayoutMethodType = 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'bank';

export interface PayoutLinkParams {
  recipientHandle: string;
  amount: number;
  note?: string; // e.g., "Junta: Family Savings - Week 5"
}

export interface PayoutMethod {
  type: PayoutMethodType;
  handle: string;
  displayName?: string;
  updatedAt?: Date;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedHandle?: string;
}

/**
 * Validates and sanitizes a Venmo handle
 * Venmo accepts: username (alphanumeric + hyphens/underscores), email, or phone
 */
export function validateVenmoHandle(handle: string): ValidationResult {
  if (!handle || typeof handle !== 'string') {
    return { valid: false, error: 'Venmo handle is required' };
  }

  const trimmed = handle.trim();

  // Remove @ prefix if present
  const sanitized = trimmed.replace(/^@/, '');

  if (sanitized.length === 0) {
    return { valid: false, error: 'Venmo handle cannot be empty' };
  }

  // Check if it looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(sanitized)) {
    return { valid: true, sanitizedHandle: sanitized };
  }

  // Check if it looks like a phone number (digits, dashes, spaces, parentheses)
  const phoneRegex = /^[\d\s\-()]+$/;
  if (phoneRegex.test(sanitized) && sanitized.replace(/\D/g, '').length >= 10) {
    // Extract just the digits for the phone number
    return { valid: true, sanitizedHandle: sanitized.replace(/\D/g, '') };
  }

  // Check if it's a valid username (alphanumeric, hyphens, underscores, 3-30 chars)
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  if (usernameRegex.test(sanitized)) {
    return { valid: true, sanitizedHandle: sanitized };
  }

  return { valid: false, error: 'Invalid Venmo handle. Use a username, email, or phone number.' };
}

/**
 * Validates and sanitizes a Cash App cashtag
 * Cash App requires: alphanumeric only, 1-20 characters
 */
export function validateCashAppHandle(handle: string): ValidationResult {
  if (!handle || typeof handle !== 'string') {
    return { valid: false, error: 'Cash App $cashtag is required' };
  }

  const trimmed = handle.trim();

  // Remove $ prefix if present
  const sanitized = trimmed.replace(/^\$/, '');

  if (sanitized.length === 0) {
    return { valid: false, error: 'Cash App $cashtag cannot be empty' };
  }

  // Cash App cashtags are alphanumeric, 1-20 characters
  const cashtagRegex = /^[a-zA-Z][a-zA-Z0-9_]{0,19}$/;
  if (!cashtagRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid $cashtag. Use letters and numbers only (1-20 characters, must start with a letter).' };
  }

  return { valid: true, sanitizedHandle: sanitized };
}

/**
 * Validates and sanitizes a PayPal.me username
 * PayPal.me accepts: alphanumeric username (from PayPal.me URL)
 */
export function validatePayPalHandle(handle: string): ValidationResult {
  if (!handle || typeof handle !== 'string') {
    return { valid: false, error: 'PayPal.me username is required' };
  }

  const trimmed = handle.trim();

  // Handle full URL input - extract username
  let sanitized = trimmed;
  if (trimmed.includes('paypal.me/')) {
    const match = trimmed.match(/paypal\.me\/([a-zA-Z0-9]+)/i);
    if (match) {
      sanitized = match[1];
    }
  }

  if (sanitized.length === 0) {
    return { valid: false, error: 'PayPal.me username cannot be empty' };
  }

  // PayPal.me usernames are alphanumeric
  const usernameRegex = /^[a-zA-Z0-9]{1,20}$/;
  if (!usernameRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid PayPal.me username. Use letters and numbers only.' };
  }

  return { valid: true, sanitizedHandle: sanitized };
}

/**
 * Validates and sanitizes a Zelle identifier
 * Zelle accepts: email or phone number (no deep link available)
 */
export function validateZelleHandle(handle: string): ValidationResult {
  if (!handle || typeof handle !== 'string') {
    return { valid: false, error: 'Zelle email or phone is required' };
  }

  const trimmed = handle.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Zelle identifier cannot be empty' };
  }

  // Check if it looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return { valid: true, sanitizedHandle: trimmed };
  }

  // Check if it looks like a phone number
  const phoneDigits = trimmed.replace(/\D/g, '');
  if (phoneDigits.length >= 10 && phoneDigits.length <= 15) {
    return { valid: true, sanitizedHandle: trimmed };
  }

  return { valid: false, error: 'Invalid Zelle identifier. Use an email or phone number.' };
}

/**
 * Validates a payout handle based on its type
 */
export function validatePayoutHandle(type: PayoutMethodType, handle: string): ValidationResult {
  switch (type) {
    case 'venmo':
      return validateVenmoHandle(handle);
    case 'cashapp':
      return validateCashAppHandle(handle);
    case 'paypal':
      return validatePayPalHandle(handle);
    case 'zelle':
      return validateZelleHandle(handle);
    case 'bank':
      // Bank transfers don't have handles - they use Stripe Connect
      return { valid: true, sanitizedHandle: handle };
    default:
      return { valid: false, error: 'Unknown payout method type' };
  }
}

/**
 * Generates a Venmo deep link
 * Supports amount, recipient, and note
 *
 * @example
 * generateVenmoLink({ recipientHandle: 'john-doe', amount: 100, note: 'Junta payout' })
 * // => 'https://venmo.com/?txn=pay&recipients=john-doe&amount=100&note=Junta%20payout'
 */
export function generateVenmoLink(params: PayoutLinkParams): string {
  const { recipientHandle, amount, note } = params;

  // Validate and sanitize handle
  const validation = validateVenmoHandle(recipientHandle);
  if (!validation.valid || !validation.sanitizedHandle) {
    throw new Error(validation.error || 'Invalid Venmo handle');
  }

  const cleanHandle = validation.sanitizedHandle;

  // Build URL with query parameters
  const url = new URL('https://venmo.com/');
  url.searchParams.set('txn', 'pay');
  url.searchParams.set('recipients', cleanHandle);
  url.searchParams.set('amount', amount.toFixed(2));

  if (note) {
    url.searchParams.set('note', note);
  }

  return url.toString();
}

/**
 * Generates a Cash App deep link
 * Supports amount and recipient only (no note support)
 *
 * @example
 * generateCashAppLink({ recipientHandle: 'johndoe', amount: 100 })
 * // => 'https://cash.app/$johndoe/100'
 */
export function generateCashAppLink(params: PayoutLinkParams): string {
  const { recipientHandle, amount } = params;

  // Validate and sanitize handle
  const validation = validateCashAppHandle(recipientHandle);
  if (!validation.valid || !validation.sanitizedHandle) {
    throw new Error(validation.error || 'Invalid Cash App handle');
  }

  const cleanHandle = validation.sanitizedHandle;

  // Cash App format: https://cash.app/$cashtag/amount
  return `https://cash.app/$${cleanHandle}/${amount.toFixed(2)}`;
}

/**
 * Generates a PayPal.me deep link
 * Supports amount and recipient only (no note support)
 *
 * @example
 * generatePayPalLink({ recipientHandle: 'johndoe', amount: 100 })
 * // => 'https://paypal.me/johndoe/100USD'
 */
export function generatePayPalLink(params: PayoutLinkParams): string {
  const { recipientHandle, amount } = params;

  // Validate and sanitize handle
  const validation = validatePayPalHandle(recipientHandle);
  if (!validation.valid || !validation.sanitizedHandle) {
    throw new Error(validation.error || 'Invalid PayPal handle');
  }

  const cleanHandle = validation.sanitizedHandle;

  // PayPal.me format: https://paypal.me/username/amountUSD
  return `https://paypal.me/${cleanHandle}/${amount.toFixed(2)}USD`;
}

/**
 * Generates a payout link based on the payment method type
 * Returns null for methods without deep link support (Zelle, Bank)
 *
 * @example
 * generatePayoutLink('venmo', { recipientHandle: 'john-doe', amount: 100, note: 'Junta payout' })
 * // => 'https://venmo.com/?txn=pay&recipients=john-doe&amount=100&note=Junta%20payout'
 */
export function generatePayoutLink(
  method: PayoutMethodType,
  params: PayoutLinkParams
): string | null {
  try {
    switch (method) {
      case 'venmo':
        return generateVenmoLink(params);
      case 'cashapp':
        return generateCashAppLink(params);
      case 'paypal':
        return generatePayPalLink(params);
      case 'zelle':
        // Zelle doesn't have a universal deep link
        return null;
      case 'bank':
        // Bank transfers use Stripe, not deep links
        return null;
      default:
        return null;
    }
  } catch {
    // If validation fails, return null instead of throwing
    return null;
  }
}

/**
 * Generates a payment link with a formatted note for Junta payouts
 */
export function generateJuntaPayoutLink(
  method: PayoutMethodType,
  recipientHandle: string,
  amount: number,
  poolName: string,
  round?: number
): string | null {
  const note = round
    ? `Junta: ${poolName} - Round ${round} Payout`
    : `Junta: ${poolName} - Payout`;

  return generatePayoutLink(method, {
    recipientHandle,
    amount,
    note,
  });
}

/**
 * Gets a human-readable label for a payout method type
 */
export function getPayoutMethodLabel(type: PayoutMethodType): string {
  const labels: Record<PayoutMethodType, string> = {
    venmo: 'Venmo',
    paypal: 'PayPal',
    zelle: 'Zelle',
    cashapp: 'Cash App',
    bank: 'Bank Transfer',
  };
  return labels[type] || type;
}

/**
 * Gets placeholder text for handle input based on payment method type
 */
export function getHandlePlaceholder(type: PayoutMethodType): string {
  const placeholders: Record<PayoutMethodType, string> = {
    venmo: '@username, email, or phone',
    paypal: 'PayPal.me username',
    zelle: 'Email or phone number',
    cashapp: '$cashtag (without the $)',
    bank: 'Bank account',
  };
  return placeholders[type] || 'Account identifier';
}

/**
 * Gets help text for handle input based on payment method type
 */
export function getHandleHelpText(type: PayoutMethodType): string {
  const helpTexts: Record<PayoutMethodType, string> = {
    venmo: 'Enter your Venmo username (e.g., john-doe), email, or phone number',
    paypal: 'Enter your PayPal.me username (the part after paypal.me/)',
    zelle: 'Enter the email or phone number linked to your Zelle account',
    cashapp: 'Enter your $cashtag without the $ symbol (e.g., johndoe)',
    bank: 'Bank transfers are processed through Stripe',
  };
  return helpTexts[type] || '';
}

/**
 * Checks if a payment method type supports deep links
 */
export function supportsDeepLink(type: PayoutMethodType): boolean {
  return ['venmo', 'cashapp', 'paypal'].includes(type);
}

/**
 * Gets instructions for manual payment when deep link is not available
 */
export function getManualPaymentInstructions(type: PayoutMethodType, handle: string): string {
  switch (type) {
    case 'zelle':
      return `Open your Zelle app or bank's Zelle feature and send to: ${handle}`;
    case 'bank':
      return 'This recipient receives payouts via bank transfer through Stripe.';
    default:
      return `Send payment using ${getPayoutMethodLabel(type)} to: ${handle}`;
  }
}
