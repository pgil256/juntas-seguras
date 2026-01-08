import { Page, expect } from '@playwright/test';

/**
 * E2E Authentication Helpers
 * Provides utilities for authentication flows in Playwright tests
 */

/**
 * Test user credentials
 */
export const testCredentials = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    name: 'Test User',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    name: 'Admin User',
  },
};

/**
 * Known test MFA code for E2E tests
 * In test mode, the app should accept this code
 */
export const TEST_MFA_CODE = '123456';

/**
 * Logs in a user through the sign-in page
 */
export const loginUser = async (
  page: Page,
  email: string,
  password: string
): Promise<void> => {
  await page.goto('/auth/signin');

  // Fill in credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation (either to MFA or dashboard)
  await page.waitForURL(/\/(mfa\/verify|dashboard)/);
};

/**
 * Completes MFA verification
 */
export const completeMfaVerification = async (
  page: Page,
  code: string = TEST_MFA_CODE
): Promise<void> => {
  // Wait for MFA page
  await expect(page).toHaveURL(/\/mfa\/verify/);

  // Fill in MFA code
  await page.fill('input[name="code"]', code);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');
};

/**
 * Performs full login flow including MFA
 */
export const fullLogin = async (
  page: Page,
  email: string = testCredentials.validUser.email,
  password: string = testCredentials.validUser.password
): Promise<void> => {
  await loginUser(page, email, password);

  // Check if we need to complete MFA
  if (page.url().includes('/mfa/verify')) {
    await completeMfaVerification(page);
  }
};

/**
 * Logs out the current user
 */
export const logout = async (page: Page): Promise<void> => {
  // Click user menu
  await page.click('[data-testid="user-menu"]');

  // Click logout
  await page.click('[data-testid="logout-button"]');

  // Wait for redirect to signin
  await page.waitForURL('/auth/signin');
};

/**
 * Checks if user is logged in
 */
export const isLoggedIn = async (page: Page): Promise<boolean> => {
  try {
    // Check for authenticated element
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

/**
 * Registers a new user
 */
export const registerUser = async (
  page: Page,
  userData: {
    email: string;
    password: string;
    name: string;
  }
): Promise<void> => {
  await page.goto('/auth/signup');

  // Fill in registration form
  await page.fill('input[name="name"]', userData.name);
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="password"]', userData.password);
  await page.fill('input[name="confirmPassword"]', userData.password);

  // Accept terms if present
  const termsCheckbox = page.locator('input[name="terms"]');
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for success or email verification page
  await page.waitForURL(/\/(auth\/verify-email|mfa\/setup)/);
};

/**
 * Sets up authentication state for tests that need a logged-in user
 * Call this in beforeEach to skip login flow
 */
export const setupAuthenticatedState = async (
  page: Page,
  storageStatePath: string
): Promise<void> => {
  // Load storage state (cookies, localStorage)
  await page.context().storageState({ path: storageStatePath });
};

/**
 * Saves authentication state after login
 * Use this to create reusable auth state
 */
export const saveAuthState = async (
  page: Page,
  storageStatePath: string
): Promise<void> => {
  await page.context().storageState({ path: storageStatePath });
};
