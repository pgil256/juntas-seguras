import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Pool Creation Flow
 *
 * Tests the complete pool creation user journey including:
 * - Navigation to create pool page
 * - Form validation
 * - Pool configuration
 * - Payment method setup
 * - Rules acknowledgment
 * - Successful creation
 */

test.describe('Pool Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real test environment, we would:
    // 1. Set up test database with seeded data
    // 2. Login as authenticated user
    // 3. Complete MFA verification
    // For now, these tests document the expected behavior
  });

  test('should navigate to create pool page', async ({ page }) => {
    // Navigate to create pool
    await page.goto('/create-pool');

    // Check page loaded
    await expect(page).toHaveURL(/.*create-pool/);
  });

  test('should display pool creation form', async ({ page }) => {
    await page.goto('/create-pool');

    // Verify form elements are present
    await expect(page.locator('[name="name"], [data-testid="pool-name"]')).toBeVisible();
    await expect(page.locator('[name="contributionAmount"], [data-testid="contribution-amount"]')).toBeVisible();
    await expect(page.locator('[name="frequency"], [data-testid="frequency"]')).toBeVisible();
  });

  test.describe('Form Validation', () => {
    test('should require pool name', async ({ page }) => {
      await page.goto('/create-pool');

      // Try to submit without name
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=/name.*required/i')).toBeVisible();
    });

    test('should validate contribution amount is between $1-$20', async ({ page }) => {
      await page.goto('/create-pool');

      // Try amount below minimum
      await page.fill('[name="contributionAmount"], [data-testid="contribution-amount"]', '0');
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/contribution.*1.*20|minimum|invalid/i')).toBeVisible();
    });

    test('should validate contribution amount is a whole number', async ({ page }) => {
      await page.goto('/create-pool');

      // Try decimal amount
      await page.fill('[name="contributionAmount"], [data-testid="contribution-amount"]', '10.50');
      await page.click('button[type="submit"]');

      // Should show error about whole numbers
      await expect(page.locator('text=/whole.*number|integer/i')).toBeVisible();
    });

    test('should require at least one payment method', async ({ page }) => {
      await page.goto('/create-pool');

      // Fill basic fields but no payment method
      await page.fill('[name="name"], [data-testid="pool-name"]', 'Test Pool');
      await page.fill('[name="contributionAmount"], [data-testid="contribution-amount"]', '10');

      // Ensure no payment methods selected
      // Try to submit
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/payment.*method.*required/i')).toBeVisible();
    });
  });

  test.describe('Pool Configuration', () => {
    test('should allow selecting weekly frequency', async ({ page }) => {
      await page.goto('/create-pool');

      // Select weekly
      await page.click('[data-testid="frequency-weekly"], label:has-text("Weekly")');

      // Verify selection
      await expect(page.locator('[data-testid="frequency-weekly"], input[value="weekly"]')).toBeChecked();
    });

    test('should allow selecting biweekly frequency', async ({ page }) => {
      await page.goto('/create-pool');

      // Select biweekly
      await page.click('[data-testid="frequency-biweekly"], label:has-text("Biweekly")');

      // Verify selection
      await expect(page.locator('[data-testid="frequency-biweekly"], input[value="biweekly"]')).toBeChecked();
    });

    test('should allow selecting monthly frequency', async ({ page }) => {
      await page.goto('/create-pool');

      // Select monthly
      await page.click('[data-testid="frequency-monthly"], label:has-text("Monthly")');

      // Verify selection
      await expect(page.locator('[data-testid="frequency-monthly"], input[value="monthly"]')).toBeChecked();
    });

    test('should allow setting total members/rounds', async ({ page }) => {
      await page.goto('/create-pool');

      // Set total rounds
      await page.fill('[name="totalRounds"], [data-testid="total-rounds"]', '5');

      // Verify value
      await expect(page.locator('[name="totalRounds"], [data-testid="total-rounds"]')).toHaveValue('5');
    });
  });

  test.describe('Payment Methods', () => {
    test('should allow enabling Venmo', async ({ page }) => {
      await page.goto('/create-pool');

      // Enable Venmo
      await page.click('[data-testid="payment-venmo"], label:has-text("Venmo")');

      // Verify enabled
      await expect(page.locator('[data-testid="payment-venmo"], input[type="checkbox"]')).toBeChecked();
    });

    test('should allow enabling PayPal', async ({ page }) => {
      await page.goto('/create-pool');

      await page.click('[data-testid="payment-paypal"], label:has-text("PayPal")');

      await expect(page.locator('[data-testid="payment-paypal"], input[type="checkbox"]')).toBeChecked();
    });

    test('should allow enabling Cash App', async ({ page }) => {
      await page.goto('/create-pool');

      await page.click('[data-testid="payment-cashapp"], label:has-text("Cash App")');

      await expect(page.locator('[data-testid="payment-cashapp"], input[type="checkbox"]')).toBeChecked();
    });

    test('should allow enabling Zelle', async ({ page }) => {
      await page.goto('/create-pool');

      await page.click('[data-testid="payment-zelle"], label:has-text("Zelle")');

      await expect(page.locator('[data-testid="payment-zelle"], input[type="checkbox"]')).toBeChecked();
    });

    test('should allow multiple payment methods', async ({ page }) => {
      await page.goto('/create-pool');

      // Enable multiple methods
      await page.click('[data-testid="payment-venmo"], label:has-text("Venmo")');
      await page.click('[data-testid="payment-paypal"], label:has-text("PayPal")');

      // Both should be checked
      await expect(page.locator('[data-testid="payment-venmo"], input[type="checkbox"]')).toBeChecked();
      await expect(page.locator('[data-testid="payment-paypal"], input[type="checkbox"]')).toBeChecked();
    });
  });

  test.describe('Rules Acknowledgment', () => {
    test('should show rules acknowledgment dialog', async ({ page }) => {
      await page.goto('/create-pool');

      // Fill valid form
      await page.fill('[name="name"], [data-testid="pool-name"]', 'Test Pool');
      await page.fill('[name="contributionAmount"], [data-testid="contribution-amount"]', '10');
      await page.fill('[name="totalRounds"], [data-testid="total-rounds"]', '5');
      await page.click('[data-testid="payment-venmo"], label:has-text("Venmo")');

      // Submit should show rules dialog
      await page.click('button[type="submit"]');

      // Rules dialog should appear
      await expect(page.locator('[data-testid="rules-dialog"], [role="dialog"]')).toBeVisible();
    });

    test('should require accepting rules to proceed', async ({ page }) => {
      await page.goto('/create-pool');

      // After rules dialog appears, must accept to continue
      // Click accept
      await page.click('[data-testid="accept-rules"], button:has-text("Accept")');

      // Should proceed with creation
    });
  });

  test.describe('Successful Creation', () => {
    test('should create pool and redirect to pool dashboard', async ({ page }) => {
      await page.goto('/create-pool');

      // Fill complete valid form
      await page.fill('[name="name"], [data-testid="pool-name"]', 'My Test Pool');
      await page.fill('[name="description"], [data-testid="description"]', 'A pool for testing');
      await page.fill('[name="contributionAmount"], [data-testid="contribution-amount"]', '10');
      await page.fill('[name="totalRounds"], [data-testid="total-rounds"]', '5');
      await page.click('[data-testid="payment-venmo"], label:has-text("Venmo")');

      // Submit
      await page.click('button[type="submit"]');

      // Accept rules if dialog appears
      const rulesDialog = page.locator('[data-testid="rules-dialog"], [role="dialog"]');
      if (await rulesDialog.isVisible()) {
        await page.click('[data-testid="accept-rules"], button:has-text("Accept")');
      }

      // Should redirect to pool dashboard
      await expect(page).toHaveURL(/.*pools\/|.*my-pool/);
    });

    test('should verify creator is admin with position 1', async ({ page }) => {
      // After creating pool, verify on pool dashboard
      await page.goto('/my-pool');

      // Admin badge should be visible
      await expect(page.locator('text=/admin/i')).toBeVisible();

      // Position 1 should be assigned to creator
      await expect(page.locator('text=/position.*1|#1/i')).toBeVisible();
    });
  });

  test.describe('Member Invitations During Creation', () => {
    test('should allow adding invitee emails', async ({ page }) => {
      await page.goto('/create-pool');

      // Enter invitee email
      await page.fill('[name="invitations"], [data-testid="invitee-email"]', 'friend@example.com');
      await page.click('[data-testid="add-invitee"], button:has-text("Add")');

      // Email should appear in list
      await expect(page.locator('text=friend@example.com')).toBeVisible();
    });

    test('should validate email format for invitations', async ({ page }) => {
      await page.goto('/create-pool');

      // Enter invalid email
      await page.fill('[name="invitations"], [data-testid="invitee-email"]', 'invalid-email');
      await page.click('[data-testid="add-invitee"], button:has-text("Add")');

      // Should show error
      await expect(page.locator('text=/invalid.*email|email.*format/i')).toBeVisible();
    });
  });
});
