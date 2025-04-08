/**
 * Generates a random 6-digit verification code
 * @returns {string} A 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a random string of specified length
 * @param length The length of the string to generate
 * @returns {string} A random string
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Checks if a verification code is expired
 * @param expiryDate The expiry date of the code
 * @returns {boolean} True if the code is expired, false otherwise
 */
export function isVerificationCodeExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
} 