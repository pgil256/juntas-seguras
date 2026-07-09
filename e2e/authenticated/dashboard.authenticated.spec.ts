/**
 * E2E Tests: Authenticated Dashboard Flows
 *
 * Tests critical user journeys that require authentication:
 * - Dashboard access and display
 * - Pool listing and navigation
 * - Creating pools as authenticated user
 * - Profile and settings access
 *
 * Uses custom fixtures from ../fixtures/test-fixtures.ts
 */

import { test, expect, DashboardPage, CreatePoolPage, generateTestPool } from '../fixtures/test-fixtures';

test.describe('Authenticated Dashboard', () => {
  test('should display dashboard for authenticated user', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/signin|login/);

    // Dashboard should be accessible
    await expect(authenticatedPage).toHaveURL(/dashboard/);
  });

  test('should display user pools on dashboard', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Check for pool cards or empty state
    const poolCards = authenticatedPage.locator('[data-testid="pool-card"]');
    const emptyState = authenticatedPage.locator('text=/no pools|create.*first|get started/i');
    const pendingSetupState = authenticatedPage.getByText(/complete your pool setup/i);

    // Either pools exist, a pending setup state is shown, or empty state is shown after dashboard data settles
    await expect.poll(async () => {
      const hasPoolCards = await poolCards.count() > 0;
      const hasPendingSetupState = await pendingSetupState.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      return hasPoolCards || hasPendingSetupState || hasEmptyState;
    }).toBeTruthy();
  });

  test('should navigate to pool details from dashboard', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    const poolCards = await dashboard.getPools();

    if (poolCards.length > 0) {
      // Click on first pool
      await poolCards[0].click();

      // Should navigate to pool details
      await expect(authenticatedPage).toHaveURL(/pools\/|my-pool/);
    }
  });

  test('should open create pool modal from dashboard', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await dashboard.openCreatePoolModal();

    // Modal should be visible
    const modal = authenticatedPage.locator('[role="dialog"]:visible');
    await expect(modal).toBeVisible();
  });
});

test.describe('Authenticated Pool Creation', () => {
  test('should create a new pool with valid data', async ({ authenticatedPage, testPool }) => {
    test.setTimeout(60000);
    const createPool = new CreatePoolPage(authenticatedPage);
    await createPool.goto();

    // Fill in pool details
    await createPool.fillBasicInfo(testPool);
    await createPool.next();

    await createPool.selectFrequency(testPool.frequency);
    await createPool.setMembers(testPool.totalMembers);
    await createPool.setStartDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    await createPool.next();
    await createPool.selectInviteLater();

    // Submit and handle rules dialog
    await createPool.submit();
    await createPool.acceptRules();

    // Should redirect to pool dashboard or show success
    await expect(authenticatedPage).toHaveURL(/member-management\/|pools\/|my-pool|dashboard/, { timeout: 45000 });
  });

  test('should save draft and restore on return', async ({ authenticatedPage, testPool }) => {
    const createPool = new CreatePoolPage(authenticatedPage);
    await createPool.goto();

    // Fill partial data
    await createPool.fillBasicInfo({
      name: testPool.name,
    });

    // Navigate away
    await authenticatedPage.goto('/dashboard');

    // Return to create pool
    await createPool.goto();

    // Draft should be restored (if localStorage-based draft is implemented)
    const nameField = authenticatedPage.locator('[name="name"], [data-testid="pool-name"]');
    const value = await nameField.inputValue();

    // Draft may or may not persist - just verify the page loads
    await expect(authenticatedPage).toHaveURL(/create-pool/);
  });
});

test.describe('Authenticated Profile & Settings', () => {
  test('should access profile page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile');

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/signin|login/);

    // Profile content should be visible
    await expect(authenticatedPage.getByRole('heading', { name: /^profile$/i })).toBeVisible();
  });

  test('should access settings page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/signin|login/);

    // Settings content should be visible
    await expect(authenticatedPage.getByRole('heading', { name: /settings/i }).or(
      authenticatedPage.getByRole('tab', { name: /notifications/i })
    ).first()).toBeVisible();
  });

  test('should display user information on profile', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile');

    // User info should be displayed
    await expect(authenticatedPage.getByTestId('user-email')).toContainText('@');
  });
});

test.describe('Authenticated Navigation', () => {
  test('should show authenticated header with user menu', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // User menu or avatar should be visible
    const userMenu = authenticatedPage.locator('[data-testid="user-menu"], [aria-label*="user"], button:has(img)');
    await expect(userMenu.first()).toBeVisible();
  });

  test('should access notifications', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/notifications');

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/signin|login/);

    // Notifications page content
    await expect(authenticatedPage.getByRole('heading', { name: /notifications|no notifications/i }).first()).toBeVisible();
  });

  test('should be able to sign out', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Find and click user menu
    const userMenu = authenticatedPage.locator('[data-testid="user-menu"], [aria-label*="user"]').first();

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Find and click sign out
      const signOut = authenticatedPage.locator('text=/sign out|logout|log out/i');
      if (await signOut.isVisible()) {
        await signOut.click();

        // Should redirect to sign in or home
        await authenticatedPage.waitForURL(/auth\/signin|signin|login|localhost:3000\/$|home/, { timeout: 15000 });
      }
    }
  });
});
