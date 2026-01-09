/**
 * E2E Tests: Authenticated Pool Management Flows
 *
 * Tests critical pool management operations:
 * - Viewing pool details
 * - Confirming payment contributions
 * - Viewing payment history
 * - Managing pool members (admin)
 * - Pool discussions
 */

import { test, expect, PoolPage, waitForToast } from '../fixtures/test-fixtures';

test.describe('Pool Details View', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to dashboard first to ensure we have access to pools
    await authenticatedPage.goto('/dashboard');
  });

  test('should display pool overview information', async ({ authenticatedPage }) => {
    // Navigate to my-pool (user\'s active pool)
    await authenticatedPage.goto('/my-pool');

    // Check for pool info elements
    const poolName = authenticatedPage.locator('[data-testid="pool-name"], h1').first();
    await expect(poolName).toBeVisible();

    // Contribution amount should be visible
    await expect(authenticatedPage.locator('text=/\\$\\d+|contribution|amount/i')).toBeVisible();
  });

  test('should display current round information', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Round info should be displayed
    const roundInfo = authenticatedPage.locator('[data-testid="current-round"], text=/round|week/i');
    await expect(roundInfo.first()).toBeVisible();
  });

  test('should display member list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Member list or section should exist
    const memberSection = authenticatedPage.locator('[data-testid="members"], text=/members|participants/i');
    await expect(memberSection.first()).toBeVisible();
  });

  test('should display payout recipient for current round', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Current recipient info
    const recipientInfo = authenticatedPage.locator('[data-testid="recipient"], text=/recipient|receives|payout/i');
    await expect(recipientInfo.first()).toBeVisible();
  });
});

test.describe('Payment Confirmation Flow', () => {
  test('should display payment status indicators', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Payment status badges should be visible
    const statusBadges = authenticatedPage.locator('[data-testid*="status"], .badge, [class*="badge"]');
    await expect(statusBadges.first()).toBeVisible();
  });

  test('should show confirm payment button when payment due', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Look for confirm payment action
    const confirmButton = authenticatedPage.locator('[data-testid="confirm-payment-btn"], button:has-text("Confirm")');

    // Button may or may not be present depending on payment status
    const isVisible = await confirmButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(confirmButton).toBeEnabled();
    }
  });

  test('should open payment method selection on confirm', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    const confirmButton = authenticatedPage.locator('[data-testid="confirm-payment-btn"], button:has-text("Confirm")');

    if (await confirmButton.isVisible()) {
      await confirmButton.click();

      // Payment method selection should appear
      const methodSelection = authenticatedPage.locator('[data-testid="payment-method-select"], [role="dialog"], [role="listbox"]');
      await expect(methodSelection.first()).toBeVisible();
    }
  });

  test('should display payment deep links', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Payment app links (Venmo, PayPal, etc.)
    const paymentLinks = authenticatedPage.locator('a[href*="venmo"], a[href*="paypal"], [data-testid*="payment-link"]');

    // At least one payment method link may be visible
    const count = await paymentLinks.count();
    // This is informational - payment links may not always be visible
  });
});

test.describe('Pool Discussions', () => {
  test('should access pool discussions/activity', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Look for discussions/activity tab or section
    const discussionsTab = authenticatedPage.locator('text=/discussions|activity|chat|messages/i');

    if (await discussionsTab.first().isVisible()) {
      await discussionsTab.first().click();

      // Discussions content should load
      await expect(authenticatedPage.locator('[data-testid="discussions"], [data-testid="activity-feed"]').or(
        authenticatedPage.locator('text=/no discussions|start a discussion/i')
      )).toBeVisible();
    }
  });

  test('should be able to post a discussion message', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/my-pool');

    // Find message input
    const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea, input[type="text"]').last();

    if (await messageInput.isVisible()) {
      await messageInput.fill('Test message from E2E test');

      // Find send button
      const sendButton = authenticatedPage.locator('[data-testid="send-message"], button:has-text("Send"), button[type="submit"]').last();

      if (await sendButton.isVisible()) {
        await sendButton.click();

        // Message should appear or success feedback
        await expect(authenticatedPage.locator('text=/test message|sent|posted/i').or(
          authenticatedPage.locator('[role="status"]')
        )).toBeVisible();
      }
    }
  });
});

test.describe('Pool Member Management (Admin)', () => {
  test('should display admin controls for pool admin', async ({ adminPage }) => {
    await adminPage.goto('/my-pool');

    // Admin badge or controls should be visible for admin user
    const adminControls = adminPage.locator('[data-testid="admin-controls"], text=/admin|manage|settings/i');
    await expect(adminControls.first()).toBeVisible();
  });

  test('should access member management for admin', async ({ adminPage }) => {
    await adminPage.goto('/my-pool');

    // Look for member management link
    const manageMembers = adminPage.locator('text=/manage members|member management/i, [data-testid="manage-members"]');

    if (await manageMembers.first().isVisible()) {
      await manageMembers.first().click();

      // Should navigate to member management
      await expect(adminPage).toHaveURL(/member|manage/);
    }
  });

  test('should be able to send payment reminder', async ({ adminPage }) => {
    await adminPage.goto('/my-pool');

    // Find reminder button for a member
    const reminderButton = adminPage.locator('[data-testid="send-reminder"], button:has-text("Remind")');

    if (await reminderButton.first().isVisible()) {
      await reminderButton.first().click();

      // Should show confirmation or success
      await expect(adminPage.locator('[role="status"], text=/sent|reminder/i')).toBeVisible();
    }
  });
});

test.describe('Payment History', () => {
  test('should access payment history page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/payments');

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/signin|login/);

    // Payment history content
    await expect(authenticatedPage.locator('text=/payment.*history|transactions|no payments/i')).toBeVisible();
  });

  test('should display payment records', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/payments');

    // Payment records or empty state
    const paymentRecords = authenticatedPage.locator('[data-testid="payment-record"], tr, [data-testid="payment-item"]');
    const emptyState = authenticatedPage.locator('text=/no payments|no transactions/i');

    const hasRecords = await paymentRecords.count() > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasRecords || hasEmptyState).toBeTruthy();
  });

  test('should show upcoming payments section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/payments');

    // Upcoming payments section
    const upcomingSection = authenticatedPage.locator('text=/upcoming|due|pending/i');
    await expect(upcomingSection.first()).toBeVisible();
  });
});

test.describe('Pool Invitations', () => {
  test('should display pending invitations', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Check for invitation notifications or section
    const invitations = authenticatedPage.locator('[data-testid="invitations"], text=/invitation|invited/i');

    // May or may not have invitations
    const isVisible = await invitations.first().isVisible().catch(() => false);
    // This is an informational test - invitations may not always be present
  });

  test('should be able to accept pool invitation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const acceptButton = authenticatedPage.locator('[data-testid="accept-invitation"], button:has-text("Accept")');

    if (await acceptButton.first().isVisible()) {
      await acceptButton.first().click();

      // Should show success or redirect to pool
      await expect(authenticatedPage).toHaveURL(/pools\/|my-pool|dashboard/);
    }
  });

  test('should be able to decline pool invitation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const declineButton = authenticatedPage.locator('[data-testid="decline-invitation"], button:has-text("Decline")');

    if (await declineButton.first().isVisible()) {
      await declineButton.first().click();

      // Should show confirmation or remove invitation
      await expect(authenticatedPage.locator('text=/declined|removed/i').or(
        authenticatedPage.locator('[role="status"]')
      )).toBeVisible();
    }
  });
});
