/**
 * Utility functions for verification codes and authentication
 * Provides secure code generation and validation utilities
 */

import crypto from 'crypto';

/**
 * Generate a secure verification code
 * @param length - Length of the code (default: 6)
 * @returns A numeric string code
 */
export function generateVerificationCode(length: number = 6): string {
  // Generate a cryptographically secure random number
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  
  // Use crypto.randomInt for better security than Math.random()
  const code = crypto.randomInt(min, max + 1);
  
  return code.toString().padStart(length, '0');
}

/**
 * Generate a secure token for password resets or email verification
 * @param length - Length of the token in bytes (default: 32)
 * @returns A hex string token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure alphanumeric code
 * @param length - Length of the code (default: 8)
 * @returns An alphanumeric string
 */
export function generateAlphanumericCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Generate backup codes for 2FA recovery
 * @param count - Number of codes to generate (default: 10)
 * @param length - Length of each code (default: 8)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10, length: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    codes.push(generateAlphanumericCode(length));
  }
  
  return codes;
}

/**
 * Check if a verification code is expired
 * @param generatedAt - When the code was generated
 * @param expiryMinutes - How many minutes until expiry (default: 10)
 * @returns Boolean indicating if the code is expired
 */
export function isCodeExpired(generatedAt: Date | string, expiryMinutes: number = 10): boolean {
  const generated = typeof generatedAt === 'string' ? new Date(generatedAt) : generatedAt;
  const now = new Date();
  const ageInMinutes = (now.getTime() - generated.getTime()) / (1000 * 60);
  
  return ageInMinutes > expiryMinutes;
}

/**
 * Format a phone number for display
 * @param phone - The phone number to format
 * @returns Formatted phone number with last 4 digits visible
 */
export function formatPhoneForDisplay(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 4) {
    return '****';
  }
  
  // Show only last 4 digits
  const lastFour = cleaned.slice(-4);
  return `****${lastFour}`;
}

/**
 * Format an email for display (partially hidden)
 * @param email - The email to format
 * @returns Formatted email with partial masking
 */
export function formatEmailForDisplay(email: string): string {
  const [localPart, domain] = email.split('@');
  
  if (!domain) {
    return '****';
  }
  
  // Show first 2 characters and last character of local part
  let maskedLocal: string;
  if (localPart.length <= 3) {
    maskedLocal = localPart[0] + '***';
  } else {
    maskedLocal = localPart.slice(0, 2) + '***' + localPart.slice(-1);
  }
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Validate email format
 * @param email - The email to validate
 * @returns Boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 * @param phone - The phone number to validate
 * @returns Boolean indicating if the phone is valid
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits for international)
  return cleaned.length >= 10 && cleaned.length <= 15;
}

const verificationUtils = {
  generateVerificationCode,
  generateSecureToken,
  generateAlphanumericCode,
  generateBackupCodes,
  isCodeExpired,
  formatPhoneForDisplay,
  formatEmailForDisplay,
  isValidEmail,
  isValidPhone,
};

export default verificationUtils;