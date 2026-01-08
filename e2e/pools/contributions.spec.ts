import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Contribution Flow
 *
 * Tests the complete contribution user journey including:
 * - Viewing contribution status
 * - Confirming payments
 * - Payment method selection
 * - QR code display
 * - Admin verification
 *
 * UNIVERSAL CONTRIBUTION MODEL:
 * All members contribute every week, INCLUDING the payout recipient.
 */

test.describe('Contribution Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, login as pool member and navigate to pool
  });

  test.describe('View Contribution Status', () => {
    test('should display all members contribution status', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Should show contribution status for each member
      await expect(page.locator('[data-testid="contribution-status"]')).toBeVisible();

      // Should list all members
      await expect(page.locator('[data-testid="member-contribution-row"]')).toHaveCount(5);
    });

    test('should show current round number', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Current round indicator
      await expect(page.locator('text=/round.*1/i')).toBeVisible();
    });

    test('should indicate which member receives payout this round', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Recipient indicator
      await expect(page.locator('[data-testid="current-recipient"]')).toBeVisible();
      await expect(page.locator('text=/receives.*payout|payout.*recipient/i')).toBeVisible();
    });

    test('should show pending status for unpaid contributions', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Pending indicator
      await expect(page.locator('[data-testid="status-pending"]')).toBeVisible();
    });

    test('should show confirmed status for member-confirmed payments', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Confirmed indicator (member confirmed, awaiting admin verification)
      await expect(page.locator('[data-testid="status-confirmed"]')).toBeVisible();
    });

    test('should show verified status for admin-verified payments', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Verified indicator
      await expect(page.locator('[data-testid="status-verified"]')).toBeVisible();
    });
  });

  test.describe('Confirm Contribution Payment', () => {
    test('should show confirm payment button for pending contribution', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Confirm button should be visible
      await expect(page.locator('[data-testid="confirm-payment-btn"]')).toBeVisible();
    });

    test('should open payment confirmation dialog', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Click confirm payment
      await page.click('[data-testid="confirm-payment-btn"]');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should require selecting payment method', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');

      // Try to submit without selecting method
      await page.click('[data-testid="submit-confirmation"]');

      // Should show error
      await expect(page.locator('text=/select.*payment.*method/i')).toBeVisible();
    });

    test('should allow selecting Venmo as payment method', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');
      await page.click('[data-testid="method-venmo"], label:has-text("Venmo")');

      await expect(page.locator('[data-testid="method-venmo"] input')).toBeChecked();
    });

    test('should confirm payment and update status', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');
      await page.click('[data-testid="method-venmo"], label:has-text("Venmo")');
      await page.click('[data-testid="submit-confirmation"]');

      // Success message
      await expect(page.locator('text=/payment.*recorded|confirmed/i')).toBeVisible();

      // Status should update
      await expect(page.locator('[data-testid="status-verified"]')).toBeVisible();
    });
  });

  test.describe('Universal Contribution Model', () => {
    test('should show recipient must also contribute', async ({ page }) => {
      // Login as the current round recipient
      await page.goto('/pools/test-pool-id');

      // Even as recipient, should see contribution requirement
      await expect(page.locator('text=/you.*also.*contribute|everyone.*contributes/i')).toBeVisible();
    });

    test('should show all members in contribution list including recipient', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Get member count from contribution list
      const memberRows = page.locator('[data-testid="member-contribution-row"]');
      const count = await memberRows.count();

      // Should include all members, including recipient
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Payment Method Display', () => {
    test('should display admin payment QR code for Zelle', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');
      await page.click('[data-testid="method-zelle"], label:has-text("Zelle")');

      // QR code should appear
      await expect(page.locator('[data-testid="zelle-qr-code"]')).toBeVisible();
    });

    test('should display admin Venmo username', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');
      await page.click('[data-testid="method-venmo"], label:has-text("Venmo")');

      // Admin Venmo handle
      await expect(page.locator('text=/@/i')).toBeVisible();
    });

    test('should show payment amount', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');

      // Amount should be visible
      await expect(page.locator('text=/$10/i')).toBeVisible();
    });

    test('should show deep link to open payment app', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      await page.click('[data-testid="confirm-payment-btn"]');
      await page.click('[data-testid="method-venmo"], label:has-text("Venmo")');

      // Deep link button
      await expect(page.locator('[data-testid="open-venmo-btn"], a:has-text("Open Venmo")')).toBeVisible();
    });
  });

  test.describe('Admin Verification', () => {
    test('should show pending verifications for admin', async ({ page }) => {
      // Login as pool admin
      await page.goto('/pools/test-pool-id');

      // Verification section visible to admin
      await expect(page.locator('[data-testid="pending-verifications"]')).toBeVisible();
    });

    test('should allow admin to verify member contribution', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Click verify button
      await page.click('[data-testid="verify-member-btn"]');

      // Confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Confirm verification
      await page.click('[data-testid="confirm-verify-btn"]');

      // Success message
      await expect(page.locator('text=/verified|confirmed/i')).toBeVisible();
    });

    test('should update member status after verification', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // After verification, status should update
      await expect(page.locator('[data-testid="status-verified"]')).toBeVisible();
    });
  });

  test.describe('Undo Payment', () => {
    test('should allow member to undo their payment confirmation', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Undo button should be visible after confirming
      await expect(page.locator('[data-testid="undo-payment-btn"]')).toBeVisible();

      await page.click('[data-testid="undo-payment-btn"]');

      // Confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Confirm undo
      await page.click('[data-testid="confirm-undo-btn"]');

      // Status should revert
      await expect(page.locator('[data-testid="status-pending"]')).toBeVisible();
    });
  });

  test.describe('Round Progress', () => {
    test('should show progress toward payout', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Progress indicator
      await expect(page.locator('[data-testid="contribution-progress"]')).toBeVisible();
    });

    test('should show how many members have contributed', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // "3 of 5 members paid"
      await expect(page.locator('text=/\\d+.*of.*\\d+.*paid|contributed/i')).toBeVisible();
    });

    test('should show ready for payout when all verified', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // When all verified, show ready message
      await expect(page.locator('text=/ready.*payout|all.*contributed/i')).toBeVisible();
    });
  });

  test.describe('Contribution History', () => {
    test('should show past round contributions', async ({ page }) => {
      await page.goto('/pools/test-pool-id/history');

      // Transaction history
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible();
    });

    test('should show payment method used', async ({ page }) => {
      await page.goto('/pools/test-pool-id/history');

      // Payment method in history
      await expect(page.locator('text=/venmo|paypal|zelle|cashapp/i')).toBeVisible();
    });

    test('should show timestamp of contribution', async ({ page }) => {
      await page.goto('/pools/test-pool-id/history');

      // Timestamp
      await expect(page.locator('[data-testid="contribution-date"]')).toBeVisible();
    });
  });
});
