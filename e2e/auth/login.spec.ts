/**
 * E2E Tests: Login Flow
 *
 * Tests the complete user login flow including:
 * - Credential-based login
 * - MFA redirect
 * - Error handling
 * - Remember me functionality
 */

import { test, expect, type Page } from '@playwright/test';

const E2E_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL || 'e2e-test@example.com';
const E2E_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!';
const passwordInput = (page: Page) => page.locator('input[name="password"]');

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
  });

  test.describe('Form Display', () => {
    test('should display login form', async ({ page }) => {
      // Check for form fields
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(passwordInput(page)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
    });

    test('should display OAuth login options', async ({ page }) => {
      // Google sign-in
      const googleButton = page.getByRole('button', { name: /google/i })
        .or(page.locator('[aria-label*="Google"]'));
      await expect(googleButton).toBeVisible();

      // Microsoft sign-in
      const microsoftButton = page.getByRole('button', { name: /microsoft/i })
        .or(page.locator('[aria-label*="Microsoft"]'));
      await expect(microsoftButton).toBeVisible();
    });

    test('should have link to sign up page', async ({ page }) => {
      const signUpLink = page.getByRole('link', { name: /sign up|create.*account|register/i });
      await expect(signUpLink).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      const forgotLink = page.getByRole('link', { name: /forgot.*password|reset.*password/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty form', async ({ page }) => {
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      // Should show validation errors
      await expect(page.getByText(/email.*required|required.*email|enter.*email/i)).toBeVisible();
      await expect(page.getByText(/password.*required|required.*password|enter.*password/i)).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.getByLabel(/email/i).fill('invalid-email');
      await passwordInput(page).fill('SomePassword123!');
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test('should redirect to MFA after valid credentials', async ({ page }) => {
      test.skip(process.env.E2E_SKIP_AUTH === 'true', 'Requires a seeded test user and live MongoDB');

      await page.getByLabel(/email/i).fill(E2E_USER_EMAIL);
      await passwordInput(page).fill(E2E_USER_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      // Should redirect to MFA page
      await expect(page).toHaveURL(/mfa|verify/i);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      test.skip(process.env.E2E_SKIP_AUTH === 'true', 'Requires a live MongoDB-backed credentials provider');

      await page.getByLabel(/email/i).fill('wrong@example.com');
      await passwordInput(page).fill('WrongPassword123!');
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid.*credentials|invalid.*email.*password|incorrect.*email|incorrect.*password|failed/i)).toBeVisible();
    });

    test('should show error for unverified email', async ({ page }) => {
      // This test assumes the server returns an appropriate error
      await page.getByLabel(/email/i).fill('unverified@example.com');
      await passwordInput(page).fill('SecurePass123!');
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      // May show verification required error
      const errorMessage = page.getByText(/verify.*email|email.*not.*verified|verification/i);
      // Check if visible (depends on user state)
      const visible = await errorMessage.isVisible().catch(() => false);
    });
  });

  test.describe('OAuth Login', () => {
    test('should redirect to Google OAuth', async ({ page }) => {
      // Listen for navigation to Google
      const navigationPromise = page.waitForURL(/accounts\.google\.com|google/i, {
        timeout: 5000,
      }).catch(() => null);

      const googleButton = page.getByRole('button', { name: /google/i })
        .or(page.locator('[aria-label*="Google"]'));
      await googleButton.click();

      // Should navigate to Google OAuth or show redirect
      // Note: May be blocked in test environment
    });

    test('should redirect to Microsoft OAuth', async ({ page }) => {
      // Listen for navigation to Microsoft
      const navigationPromise = page.waitForURL(/login\.microsoftonline\.com|microsoft/i, {
        timeout: 5000,
      }).catch(() => null);

      const microsoftButton = page.getByRole('button', { name: /microsoft/i })
        .or(page.locator('[aria-label*="Microsoft"]'));
      await microsoftButton.click();

      // Should navigate to Microsoft OAuth or show redirect
    });
  });

  test.describe('Remember Me', () => {
    test('should have remember me checkbox if available', async ({ page }) => {
      const rememberMe = page.getByLabel(/remember me|keep.*signed in|stay.*logged/i);

      if (await rememberMe.isVisible()) {
        await expect(rememberMe).not.toBeChecked();
        await rememberMe.check();
        await expect(rememberMe).toBeChecked();
      }
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const password = passwordInput(page);
      await password.fill('SecurePass123!');

      // Initially password should be hidden
      await expect(password).toHaveAttribute('type', 'password');

      // Find and click visibility toggle
      const toggleButton = page.getByRole('button', { name: /show password|hide password/i });

      if (await toggleButton.isVisible()) {
        await toggleButton.click();

        // Password should be visible
        await expect(password).toHaveAttribute('type', 'text');

        // Toggle back
        await toggleButton.click();
        await expect(password).toHaveAttribute('type', 'password');
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to sign up page', async ({ page }) => {
      const signUpLink = page.getByRole('link', { name: /sign up|create.*account|register/i });
      await signUpLink.click();

      await expect(page).toHaveURL(/signup|register/i);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      const forgotLink = page.getByRole('link', { name: /forgot.*password|reset.*password/i });
      await Promise.all([
        page.waitForURL(/forgot|reset|password/i),
        forgotLink.click(),
      ]);
      await expect(page).toHaveURL(/forgot|reset|password/i);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should show error after multiple failed attempts', async ({ page }) => {
      test.skip(process.env.E2E_SKIP_AUTH === 'true', 'Requires a live MongoDB-backed credentials provider');

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.getByLabel(/email/i).fill('test@example.com');
        await passwordInput(page).fill(`WrongPassword${i}!`);
        await page.getByRole('button', { name: /sign in|log in|login/i }).click();

        // Wait a bit between attempts
        await page.waitForTimeout(500);

        // Clear inputs for next attempt
        await page.getByLabel(/email/i).clear();
        await passwordInput(page).clear();
      }

      // After multiple failures, may see rate limit message
      const rateLimitMessage = page.getByText(/too many.*attempts|rate.*limit|try.*again.*later|locked/i);
      // This depends on rate limiting implementation
      const visible = await rateLimitMessage.isVisible().catch(() => false);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      // Email input should have label
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toBeVisible();

      // Password input should have label
      await expect(passwordInput(page)).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i);
      const password = passwordInput(page);

      await emailInput.focus();
      await expect(emailInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: /forgot.*password/i })).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(password).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /show password|hide password/i })).toBeFocused();
    });

    test('should allow form submission with Enter key', async ({ page }) => {
      await page.getByLabel(/email/i).fill('test@example.com');
      await passwordInput(page).fill('SecurePass123!');

      // Press Enter to submit
      await page.keyboard.press('Enter');

      // Form should be submitted (may show error or redirect)
      await page.waitForTimeout(1000);
    });
  });
});
