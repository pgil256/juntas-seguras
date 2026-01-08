/**
 * Accessibility Tests
 * Uses Playwright with axe-core for automated accessibility testing
 *
 * Run with: npx playwright test e2e/accessibility/
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test configuration
const testConfig = {
  // Pages that don't require authentication
  publicPages: [
    { path: '/', name: 'Home Page' },
    { path: '/auth/signin', name: 'Sign In Page' },
    { path: '/auth/signup', name: 'Sign Up Page' },
    { path: '/auth/forgot-password', name: 'Forgot Password Page' },
    { path: '/help', name: 'Help Page' },
    { path: '/help/documentation', name: 'Documentation Page' },
  ],
  // Pages that require authentication
  authenticatedPages: [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/create-pool', name: 'Create Pool Page' },
    { path: '/payments', name: 'Payments Page' },
    { path: '/notifications', name: 'Notifications Page' },
    { path: '/profile', name: 'Profile Page' },
    { path: '/settings', name: 'Settings Page' },
  ],
};

// Helper function to analyze accessibility with axe
async function analyzeAccessibility(page: Page, options: { exclude?: string[] } = {}) {
  const builder = new AxeBuilder({ page });

  // Exclude certain elements if specified
  if (options.exclude?.length) {
    options.exclude.forEach((selector) => builder.exclude(selector));
  }

  // Run the analysis
  const results = await builder.analyze();

  return results;
}

test.describe('Public Pages Accessibility', () => {
  for (const pageInfo of testConfig.publicPages) {
    test(`${pageInfo.name} has no critical accessibility violations`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      const accessibilityResults = await analyzeAccessibility(page);

      // Filter for critical and serious violations
      const criticalViolations = accessibilityResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      // Log violations for debugging
      if (criticalViolations.length > 0) {
        console.log(`Accessibility violations on ${pageInfo.name}:`, JSON.stringify(criticalViolations, null, 2));
      }

      expect(criticalViolations).toHaveLength(0);
    });
  }
});

test.describe('Form Accessibility', () => {
  test('signin form has proper labels and ARIA attributes', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check for proper form labels
    const emailInput = page.locator('[name="email"], [id="email"]');
    const passwordInput = page.locator('[name="password"], [id="password"]');

    // Verify inputs have associated labels or aria-label
    if (await emailInput.count() > 0) {
      const emailLabel =
        (await emailInput.getAttribute('aria-label')) ||
        (await page.locator(`label[for="${await emailInput.getAttribute('id')}"]`).count()) > 0;
      expect(emailLabel).toBeTruthy();
    }

    if (await passwordInput.count() > 0) {
      const passwordLabel =
        (await passwordInput.getAttribute('aria-label')) ||
        (await page.locator(`label[for="${await passwordInput.getAttribute('id')}"]`).count()) > 0;
      expect(passwordLabel).toBeTruthy();
    }

    // Check submit button is accessible
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      const buttonText = await submitButton.textContent();
      expect(buttonText?.trim().length).toBeGreaterThan(0);
    }
  });

  test('signup form validates required fields accessibly', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Wait for potential error messages
      await page.waitForTimeout(500);

      // Check that error messages are accessible
      const errorMessages = page.locator('[role="alert"], .error, .text-destructive');
      if (await errorMessages.count() > 0) {
        // Error messages should be visible to screen readers
        const firstError = errorMessages.first();
        await expect(firstError).toBeVisible();
      }
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test('signin page can be navigated with keyboard only', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Start from the beginning
    await page.keyboard.press('Tab');

    // Track focused elements
    const focusedElements: string[] = [];
    for (let i = 0; i < 10; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : 'none';
      });
      focusedElements.push(focused);
      await page.keyboard.press('Tab');
    }

    // Verify we can tab through elements
    expect(focusedElements.length).toBeGreaterThan(0);

    // Should include interactive elements like inputs and buttons
    const hasInteractiveElements = focusedElements.some(
      (el) => el.includes('input') || el.includes('button') || el.includes('a')
    );
    expect(hasInteractiveElements).toBe(true);
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check if focus is visible (has outline or ring)
    const focusVisible = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const styles = window.getComputedStyle(el);
      return (
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none' ||
        el.classList.contains('focus-visible') ||
        el.classList.contains('ring')
      );
    });

    // Focus indicator should be present
    expect(focusVisible).toBe(true);
  });
});

test.describe('Modal Accessibility', () => {
  test('modals trap focus correctly', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Find and click a button that opens a modal/dialog
    const dialogTrigger = page.locator('[data-testid="open-dialog"], button:has-text("Contact")');

    if (await dialogTrigger.count() > 0) {
      await dialogTrigger.first().click();
      await page.waitForTimeout(300);

      // Check if dialog is visible
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        // Tab multiple times
        for (let i = 0; i < 15; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be within the dialog
        const focusInDialog = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const activeElement = document.activeElement;
          return dialog?.contains(activeElement) ?? false;
        });

        expect(focusInDialog).toBe(true);

        // Should be able to close with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test('modals can be closed with Escape key', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    const dialogTrigger = page.locator('[data-testid="open-dialog"], button:has-text("Contact")');

    if (await dialogTrigger.count() > 0) {
      await dialogTrigger.first().click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        await expect(dialog).toBeVisible();

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        await expect(dialog).not.toBeVisible();
      }
    }
  });
});

test.describe('Color Contrast', () => {
  test('text has sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await analyzeAccessibility(page);

    // Check specifically for color contrast violations
    const contrastViolations = results.violations.filter((v) =>
      v.id.includes('color-contrast')
    );

    // Log any contrast issues
    if (contrastViolations.length > 0) {
      console.log('Color contrast violations:', JSON.stringify(contrastViolations, null, 2));
    }

    // Allow minor violations but no critical ones
    const criticalContrastIssues = contrastViolations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalContrastIssues).toHaveLength(0);
  });
});

test.describe('Images and Media', () => {
  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find all images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should have alt text or be marked as decorative (role="presentation" or alt="")
      const isAccessible =
        alt !== null || role === 'presentation' || role === 'none';
      expect(isAccessible).toBe(true);
    }
  });
});

test.describe('Headings Structure', () => {
  test('page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map((h) => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().substring(0, 50),
      }));
    });

    // Should have at least one heading
    expect(headings.length).toBeGreaterThan(0);

    // Should start with h1
    if (headings.length > 0) {
      expect(headings[0].level).toBe(1);
    }

    // Check heading levels don't skip (e.g., h1 to h3)
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;
      // Can go to same level, one level deeper, or any level higher
      const validJump = currentLevel <= previousLevel + 1;
      expect(validJump).toBe(true);
    }
  });
});

test.describe('ARIA Attributes', () => {
  test('ARIA attributes are valid', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await analyzeAccessibility(page);

    // Check for ARIA-related violations
    const ariaViolations = results.violations.filter((v) =>
      v.id.startsWith('aria-')
    );

    expect(ariaViolations).toHaveLength(0);
  });

  test('interactive elements have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');

      // Button should have accessible name
      const hasAccessibleName =
        (text && text.trim().length > 0) ||
        ariaLabel ||
        ariaLabelledBy;
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});

test.describe('Responsive Accessibility', () => {
  test('mobile viewport maintains accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await analyzeAccessibility(page);

    // Filter for critical violations
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical'
    );

    expect(criticalViolations).toHaveLength(0);
  });
});
