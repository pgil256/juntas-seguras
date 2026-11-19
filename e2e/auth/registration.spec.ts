/**
 * E2E Tests: User Registration Flow
 *
 * Shape of the real page (app/auth/signup/page.tsx), which these tests follow:
 *
 * - One credentials form: Full Name, Email Address, Phone (Optional), Password,
 *   Confirm Password. "Password" and "Confirm Password" both match /password/i,
 *   so every locator here is exact — a loose regex resolves to two elements and
 *   fails Playwright's strict mode.
 * - Name/email/password/confirm are `required` and email is `type="email"`, so
 *   empty and malformed-email submissions are stopped by the browser before
 *   handleCredentialsSubmit runs. The app's own messages for those cases are
 *   unreachable through the UI; the password-strength and mismatch messages are
 *   reachable, and are asserted below.
 * - On success the page opens a VerificationPopup dialog. It does not navigate,
 *   so there is no /mfa or /verify URL to wait for.
 *
 * Not covered: authenticator-app (TOTP) setup at signup. The page offers email
 * verification only — there is no QR code or manual-entry secret to assert on.
 */

import { test, expect } from '@playwright/test';

const VALID_PASSWORD = 'Test-' + crypto.randomUUID() + '!';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  const fillCredentials = async (
    page: import('@playwright/test').Page,
    {
      name = 'Test User',
      email = uniqueEmail('test'),
      password = VALID_PASSWORD,
      confirmPassword = password,
    }: { name?: string; email?: string; password?: string; confirmPassword?: string } = {}
  ) => {
    await page.getByLabel('Full Name').fill(name);
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password').fill(confirmPassword);
    return { name, email, password };
  };

  const submit = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: /create account/i }).click();

  test.describe('Form Display', () => {
    test('should display registration form', async ({ page }) => {
      await expect(page.getByLabel('Full Name')).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('should offer an optional phone number field', async ({ page }) => {
      const phone = page.getByLabel(/phone number/i);

      await expect(phone).toBeVisible();
      await expect(phone).not.toHaveAttribute('required', '');
    });

    test('should have link to sign in page', async ({ page }) => {
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    });
  });

  test.describe('Browser-Level Validation', () => {
    test('should block submission of an empty form', async ({ page }) => {
      await submit(page);

      // Native constraint validation stops the submit; we stay put with the
      // required fields reported invalid.
      await expect(page).toHaveURL(/auth\/signup/);
      await expect(page.getByLabel('Full Name')).toHaveJSProperty('validity.valid', false);
    });

    test('should block an invalid email format', async ({ page }) => {
      await fillCredentials(page, { email: 'invalid-email' });
      await submit(page);

      await expect(page).toHaveURL(/auth\/signup/);
      await expect(page.getByLabel('Email Address')).toHaveJSProperty('validity.valid', false);
    });
  });

  test.describe('Password Rules', () => {
    test('should reject a password under 8 characters', async ({ page }) => {
      await fillCredentials(page, { password: crypto.randomUUID().slice(0, 6) });
      await submit(page);

      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('should require upper, lower and numeric characters', async ({ page }) => {
      await fillCredentials(page, { password: 'x'.repeat(12) });
      await submit(page);

      await expect(page.getByText(/uppercase, lowercase, and numbers/i)).toBeVisible();
    });

    test('should reject mismatched passwords', async ({ page }) => {
      await fillCredentials(page, { password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD + 'x' });
      await submit(page);

      await expect(page.getByText(/passwords don't match/i)).toBeVisible();
    });
  });

  test.describe('Email Verification', () => {
    /**
     * Completing a signup requires POST /api/auth/register to succeed, and that
     * endpoint sends a verification email before it returns. CI configures
     * placeholder SMTP credentials (EMAIL_USER=ci@example.com in e2e.yml), so a
     * real submission always answers 500 "Failed to send verification email" —
     * these assertions could never pass against the live endpoint.
     *
     * Stub the endpoint so the tests cover what the browser is actually
     * responsible for: opening the verification dialog and wiring up resend.
     * The unstubbed failure path is asserted separately below.
     */
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/auth/register', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { userId: 'e2e-user-id', mfaMethod: 'email' },
            mfaSetup: {},
          }),
        })
      );
    });

    test('should open the verification dialog after registering', async ({ page }) => {
      await fillCredentials(page, { name: 'Verification User' });
      await submit(page);

      await expect(page.getByPlaceholder(/enter 6-digit code/i)).toBeVisible({ timeout: 15000 });
    });

    test('should offer to resend the verification code', async ({ page }) => {
      await fillCredentials(page, { name: 'Resend User' });
      await submit(page);

      await expect(page.getByPlaceholder(/enter 6-digit code/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: /resend code/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for duplicate email', async ({ page }) => {
      // The seeded demo account already exists, so the duplicate check fires
      // server-side before any mail is attempted — no SMTP needed.
      await fillCredentials(page, {
        name: 'Duplicate Signup',
        email: process.env.DEMO_ACCOUNT_EMAIL || 'demo@juntas-seguras.app',
      });
      await submit(page);

      await expect(page.getByText(/already exists/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should surface a message when registration fails', async ({ page }) => {
      await page.route('**/api/auth/register', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Registration failed' }),
        })
      );

      await fillCredentials(page, { name: 'Network Failure User' });
      await submit(page);

      await expect(page.getByText(/registration failed/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should surface a mail-delivery failure to the user', async ({ page }) => {
      // Exactly what the real endpoint returns when SMTP is unreachable. The
      // user must see it rather than a silently stuck button.
      await page.route('**/api/auth/register', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send verification email' }),
        })
      );

      await fillCredentials(page, { name: 'Mail Failure User' });
      await submit(page);

      await expect(page.getByText(/failed to send verification email/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to sign in page', async ({ page }) => {
      await page.getByRole('link', { name: /sign in/i }).click();

      await expect(page).toHaveURL(/auth\/signin/);
    });

    test('should navigate to home when logo is clicked', async ({ page }) => {
      await page.getByRole('link', { name: /juntas seguras/i }).first().click();

      await expect(page).toHaveURL(/localhost:3000\/?$/);
    });
  });
});
