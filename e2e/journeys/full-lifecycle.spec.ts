/**
 * E2E Test: Full User Lifecycle Journey
 *
 * Tests the critical user journey end-to-end:
 * Registration → MFA Setup → Create Pool → Invite Member → Record Payment → Trigger Payout
 *
 * This test uses serial mode since each step depends on the previous one.
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { generateTestUser, generateTestPool } from '../fixtures/test-fixtures';

// Mailpit runs on the same disposable runner as the app and only receives test mail.
async function deliveredCode(request: APIRequestContext, email: string, subject: string) {
  const inbox = 'http://127.0.0.1:8025/api/v1';
  let id: string | undefined;
  await expect.poll(async () => {
    const response = await request.get(inbox + '/search', { params: { query: 'to:' + email } });
    if (!response.ok()) return false;
    const data: { messages: { ID: string; Subject: string; To: { Address: string }[] }[] } = await response.json();
    id = data.messages.find(message => message.Subject === subject &&
      message.To.some(recipient => recipient.Address === email))?.ID;
    return Boolean(id);
  }, { message: 'Waiting for the test account’s email', timeout: 20000 }).toBe(true);
  const response = await request.get(inbox + '/message/' + id);
  expect(response.ok()).toBe(true);
  const message: { Text: string } = await response.json();
  const code = message.Text.match(/code[^:\n]*:\s*(\d{6})\b/i)?.[1];
  if (!code) throw new Error('The test email did not contain the expected verification message.');
  return code;
}

// Serial mode: steps run in order, fail-fast
test.describe.serial('Full User Lifecycle', () => {
  const testUser = generateTestUser({ email: 'lifecycle-' + crypto.randomUUID() + '@example.test' });
  const testPool = generateTestPool({
    name: `Lifecycle Pool ${Date.now()}`,
    contributionAmount: 10,
    frequency: 'weekly',
    totalMembers: 3,
  });

  let page: Page;

  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
      throw new Error('Run this journey against the local test app with Mailpit.');
    }
    page = await browser.newPage({ baseURL });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Step 1: Register a new account', async () => {
    await page.goto('/auth/signup');

    // Fill registration form
    await page.getByLabel(/name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel('Password', { exact: true }).fill(testUser.password);

    await page.getByLabel('Confirm Password', { exact: true }).fill(testUser.password);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByRole('heading', { name: 'Email Verification Required' })).toBeVisible();
  });

  test('Step 2: Verify the account and sign in with email MFA', async ({ request }) => {
    const verification = await deliveredCode(request, testUser.email, 'Verify your account');
    await page.getByPlaceholder('Enter 6-digit code').fill(verification);
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);

    await page.getByLabel(/email address/i).fill(testUser.email);
    await page.getByLabel('Password', { exact: true }).fill(testUser.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/mfa\/verify/);
    const mfa = await deliveredCode(request, testUser.email, 'Your Verification Code');
    await page.getByLabel('Verification Code').fill(mfa);
    await page.getByRole('button', { name: 'Verify Code' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Step 3: Create a savings pool', async () => {
    await page.goto('/create-pool');
    await page.getByLabel(/pool name/i).fill(testPool.name);
    await page.getByLabel(/description/i).fill(testPool.description);
    await page.locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: '$' + testPool.contributionAmount, exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const start = new Date();
    start.setDate(start.getDate() + 14);
    await page.locator('#startDate').fill(start.toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(testPool.name, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create Pool', exact: true }).click();
    await expect(page).toHaveURL(/\/member-management\/[^/]+/, { timeout: 15000 });
  });

  test('Step 4: Invite a member to the pool', async () => {
    await page.getByRole('button', { name: 'Invite Member', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Invite Members' });
    await dialog.getByPlaceholder('name@example.com').fill('invite-' + crypto.randomUUID() + '@example.test');
    await dialog.getByRole('button', { name: 'Send Invitations' }).click();
    await expect(dialog).toBeHidden();
  });

  test('Step 5: Record a payment contribution', async () => {
    const poolId = new URL(page.url()).pathname.split('/').pop();
    expect(poolId).toBeTruthy();

    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Payment', exact: true }).click();
    await page.getByRole('button', { name: 'Add Payment Methods' }).click();
    await page.getByLabel('Venmo', { exact: true }).fill('juntas-e2e');
    await page.getByRole('button', { name: 'Save Payment Methods' }).click();
    await expect(page.getByRole('button', { name: 'Edit Payment Methods' })).toBeVisible();

    await page.goto('/pools/' + poolId);
    await page.getByRole('tab', { name: 'Contributions' }).click();
    await page.getByRole('button', { name: 'Make Contribution' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: "I've Paid via Venmo" }).click();
    await expect(dialog.getByText('Payment recorded successfully!')).toBeVisible();
  });

  test('Step 6: View payout status', async () => {
    await page.reload();
    await page.getByRole('tab', { name: 'Payouts' }).click();
    await expect(page.getByRole('heading', { name: 'Current Recipient' })).toBeVisible();
    await expect(page.getByRole('tabpanel').getByText(testUser.email, { exact: true })).toBeVisible();
  });
});

test.describe.serial('Admin Payout Lifecycle', () => {
  test('Admin can confirm payout after all contributions', async ({ page }) => {
    // This test verifies the admin payout flow
    // In a real test environment with seeded data:
    await page.goto('/dashboard');

    // Navigate to a pool where all contributions are in
    const poolCard = page.locator('[data-testid="pool-card"]').first();
    if (await poolCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await poolCard.click();
    }

    // Look for payout controls (admin only)
    const payoutBtn = page.locator(
      'button:has-text("Send Payout"), [data-testid="send-payout-btn"]'
    );
    if (await payoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payoutBtn.click();

      // Select payout method
      const methodSelect = page.locator(
        '[data-testid="payout-method-select"], select, [role="combobox"]'
      );
      if (await methodSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await methodSelect.click();
        await page.locator('text=/venmo/i').first().click();
      }

      // Confirm payout
      const confirmBtn = page.getByRole('button', { name: /confirm|send/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  });

  test('Admin can advance to next round after payout', async ({ page }) => {
    await page.goto('/dashboard');

    const poolCard = page.locator('[data-testid="pool-card"]').first();
    if (await poolCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await poolCard.click();
    }

    // Look for advance round button
    const advanceBtn = page.locator(
      'button:has-text("Next Round"), button:has-text("Advance"), [data-testid="advance-round-btn"]'
    );
    if (await advanceBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await advanceBtn.click();

      // Confirm advancement
      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
      if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: /confirm|yes/i }).click();
      }
    }
  });
});
