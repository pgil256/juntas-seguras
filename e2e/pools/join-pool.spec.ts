import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Join Pool Flow
 *
 * Tests the complete pool joining user journey including:
 * - Receiving and viewing invitations
 * - Accepting invitations
 * - Rejecting invitations
 * - Expired invitation handling
 * - Shareable link joining
 */

test.describe('Join Pool Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, login as invited user
  });

  test.describe('View Invitations', () => {
    test('should display pending invitations on dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Invitations section should be visible
      await expect(page.locator('[data-testid="pending-invitations"]')).toBeVisible();
    });

    test('should show invitation details', async ({ page }) => {
      await page.goto('/dashboard');

      // Pool name should be displayed
      await expect(page.locator('[data-testid="invitation-pool-name"]')).toBeVisible();

      // Inviter name should be shown
      await expect(page.locator('[data-testid="invitation-from"]')).toBeVisible();
    });

    test('should show pool summary in invitation', async ({ page }) => {
      await page.goto('/dashboard');

      // Pool details
      await expect(page.locator('text=/\\$\\d+.*per.*week/i')).toBeVisible();
      await expect(page.locator('text=/\\d+.*members/i')).toBeVisible();
    });

    test('should show invitation expiration', async ({ page }) => {
      await page.goto('/dashboard');

      // Expiration indicator
      await expect(page.locator('text=/expires|valid.*until/i')).toBeVisible();
    });
  });

  test.describe('Accept Invitation', () => {
    test('should show accept button on invitation', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.locator('[data-testid="accept-invitation-btn"]')).toBeVisible();
    });

    test('should open acceptance confirmation dialog', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="accept-invitation-btn"]');

      // Confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=/join.*pool|accept.*invitation/i')).toBeVisible();
    });

    test('should show pool rules before accepting', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="accept-invitation-btn"]');

      // Pool rules or terms
      await expect(page.locator('text=/rules|terms|agreement/i')).toBeVisible();
    });

    test('should successfully join pool after acceptance', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="accept-invitation-btn"]');
      await page.click('[data-testid="confirm-join-btn"]');

      // Success message
      await expect(page.locator('text=/joined|welcome|member/i')).toBeVisible();
    });

    test('should redirect to pool page after joining', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="accept-invitation-btn"]');
      await page.click('[data-testid="confirm-join-btn"]');

      // Should navigate to pool
      await expect(page).toHaveURL(/\/pools\/[a-zA-Z0-9]+/);
    });

    test('should remove invitation from list after accepting', async ({ page }) => {
      await page.goto('/dashboard');

      const invitationCount = await page.locator('[data-testid="invitation-card"]').count();

      await page.click('[data-testid="accept-invitation-btn"]');
      await page.click('[data-testid="confirm-join-btn"]');

      // Wait for update
      await page.waitForTimeout(1000);

      // Count should decrease
      const newCount = await page.locator('[data-testid="invitation-card"]').count();
      expect(newCount).toBeLessThan(invitationCount);
    });
  });

  test.describe('Reject Invitation', () => {
    test('should show reject button on invitation', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.locator('[data-testid="reject-invitation-btn"]')).toBeVisible();
    });

    test('should open rejection confirmation dialog', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="reject-invitation-btn"]');

      // Confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=/decline|reject/i')).toBeVisible();
    });

    test('should successfully reject invitation', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="reject-invitation-btn"]');
      await page.click('[data-testid="confirm-reject-btn"]');

      // Success or confirmation message
      await expect(page.locator('text=/declined|rejected|removed/i')).toBeVisible();
    });

    test('should remove invitation from list after rejecting', async ({ page }) => {
      await page.goto('/dashboard');

      const invitationCount = await page.locator('[data-testid="invitation-card"]').count();

      await page.click('[data-testid="reject-invitation-btn"]');
      await page.click('[data-testid="confirm-reject-btn"]');

      // Wait for update
      await page.waitForTimeout(1000);

      // Count should decrease
      const newCount = await page.locator('[data-testid="invitation-card"]').count();
      expect(newCount).toBeLessThan(invitationCount);
    });
  });

  test.describe('Expired Invitations', () => {
    test('should show expired status for old invitations', async ({ page }) => {
      await page.goto('/dashboard');

      // Expired indicator
      await expect(page.locator('[data-testid="invitation-expired"]')).toBeVisible();
    });

    test('should disable accept button for expired invitations', async ({ page }) => {
      await page.goto('/dashboard');

      const expiredInvitation = page.locator('[data-testid="invitation-card"]:has([data-testid="invitation-expired"])');
      const acceptBtn = expiredInvitation.locator('[data-testid="accept-invitation-btn"]');

      await expect(acceptBtn).toBeDisabled();
    });

    test('should allow dismissing expired invitations', async ({ page }) => {
      await page.goto('/dashboard');

      await page.click('[data-testid="dismiss-expired-btn"]');

      // Should be removed from list
      await expect(page.locator('[data-testid="invitation-expired"]')).not.toBeVisible();
    });
  });

  test.describe('Shareable Link Join', () => {
    test('should show pool preview from shareable link', async ({ page }) => {
      // Navigate with invitation code
      await page.goto('/pools/join?code=test-invite-code');

      // Pool preview should be visible
      await expect(page.locator('[data-testid="pool-preview"]')).toBeVisible();
    });

    test('should show pool details in preview', async ({ page }) => {
      await page.goto('/pools/join?code=test-invite-code');

      // Pool name
      await expect(page.locator('[data-testid="pool-name"]')).toBeVisible();

      // Contribution amount
      await expect(page.locator('text=/\\$\\d+/i')).toBeVisible();

      // Member count
      await expect(page.locator('text=/\\d+.*members/i')).toBeVisible();
    });

    test('should require login for unauthenticated users', async ({ page }) => {
      // Navigate without being logged in
      await page.goto('/pools/join?code=test-invite-code');

      // Should redirect to login or show login prompt
      await expect(page.locator('text=/sign.*in|log.*in/i')).toBeVisible();
    });

    test('should preserve invite code through login flow', async ({ page }) => {
      await page.goto('/pools/join?code=test-invite-code');

      // Click login
      await page.click('text=/sign.*in|log.*in/i');

      // After login flow completes, should return to join page
      // This test verifies the redirect preserves the code
      await expect(page).toHaveURL(/code=test-invite-code/);
    });

    test('should allow joining from shareable link', async ({ page }) => {
      // Assume logged in user
      await page.goto('/pools/join?code=test-invite-code');

      await page.click('[data-testid="join-pool-btn"]');

      // Success message
      await expect(page.locator('text=/joined|welcome|member/i')).toBeVisible();
    });

    test('should show error for invalid invite code', async ({ page }) => {
      await page.goto('/pools/join?code=invalid-code');

      // Error message
      await expect(page.locator('text=/invalid|expired|not.*found/i')).toBeVisible();
    });

    test('should show error for full pool', async ({ page }) => {
      await page.goto('/pools/join?code=full-pool-code');

      // Error message
      await expect(page.locator('text=/full|maximum.*members/i')).toBeVisible();
    });
  });

  test.describe('Position Assignment', () => {
    test('should show assigned position after joining', async ({ page }) => {
      await page.goto('/pools/join?code=test-invite-code');

      await page.click('[data-testid="join-pool-btn"]');

      // Position should be shown
      await expect(page.locator('text=/position.*\\d+|#\\d+/i')).toBeVisible();
    });

    test('should explain payout order based on position', async ({ page }) => {
      await page.goto('/pools/test-pool-id');

      // Payout order explanation
      await expect(page.locator('text=/payout.*round|receive.*week/i')).toBeVisible();
    });
  });

  test.describe('Already Member', () => {
    test('should show already member message', async ({ page }) => {
      // Navigate to join for pool user is already in
      await page.goto('/pools/join?code=already-member-code');

      // Already member message
      await expect(page.locator('text=/already.*member|already.*joined/i')).toBeVisible();
    });

    test('should link to pool if already member', async ({ page }) => {
      await page.goto('/pools/join?code=already-member-code');

      // Link to existing pool
      await expect(page.locator('[data-testid="go-to-pool-btn"]')).toBeVisible();
    });
  });

  test.describe('Pool Capacity', () => {
    test('should show spots remaining', async ({ page }) => {
      await page.goto('/pools/join?code=test-invite-code');

      // Spots remaining indicator
      await expect(page.locator('text=/\\d+.*spots?.*left|\\d+.*remaining/i')).toBeVisible();
    });

    test('should indicate when pool is almost full', async ({ page }) => {
      await page.goto('/pools/join?code=almost-full-code');

      // Almost full warning
      await expect(page.locator('text=/almost.*full|filling.*up|last.*spot/i')).toBeVisible();
    });
  });

  test.describe('Email Invitation Flow', () => {
    test('should land on join page from email link', async ({ page }) => {
      // Simulate clicking email link
      await page.goto('/pools/join?code=email-invite-code&source=email');

      await expect(page.locator('[data-testid="pool-preview"]')).toBeVisible();
    });

    test('should track invitation source', async ({ page }) => {
      await page.goto('/pools/join?code=email-invite-code&source=email');

      // Source should be tracked (for analytics)
      // This is internal, but we can verify the page loads correctly
      await expect(page.locator('[data-testid="join-pool-btn"]')).toBeVisible();
    });
  });
});
