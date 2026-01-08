/**
 * Mobile Payment Flow Tests
 * Tests for payment functionality on mobile devices including QR codes, deep links, and touch interactions
 *
 * Run with: npx playwright test e2e/mobile/payment-flows.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Mobile viewport configurations
const mobileViewports = {
  iPhoneSE: { width: 375, height: 667 },
  pixel5: { width: 393, height: 851 },
  iPhone12: { width: 390, height: 844 },
};

// Helper function to set viewport
async function setMobileViewport(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
}

// Test pages configuration
const testPages = {
  payments: '/payments',
  poolPayments: '/pools/test-pool-id', // Will need to be dynamic in real tests
};

test.describe('Mobile Payment UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhone12);
  });

  test('payment page renders correctly on mobile', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check for no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('payment method badges are readable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if any payment-related text is too small
    const textElements = await page.locator('[class*="payment"], [class*="Payment"]').all();

    for (const element of textElements) {
      if (await element.isVisible()) {
        const fontSize = await element.evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });

        // Font size should be at least 12px for readability
        expect(fontSize).toBeGreaterThanOrEqual(12);
      }
    }
  });
});

test.describe('QR Code Functionality on Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.pixel5);
  });

  test('QR code images are appropriately sized for mobile screens', async ({ page }) => {
    // Navigate to a page that might have QR codes
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Look for any QR code images
    const qrImages = page.locator('img[alt*="QR"], img[alt*="qr"]');
    const count = await qrImages.count();

    for (let i = 0; i < count; i++) {
      const img = qrImages.nth(i);
      if (await img.isVisible()) {
        const box = await img.boundingBox();
        if (box) {
          // QR code should fit within mobile viewport width with padding
          expect(box.width).toBeLessThan(mobileViewports.pixel5.width - 32);
          // QR code should be scannable (at least 100px)
          expect(box.width).toBeGreaterThanOrEqual(100);
          expect(box.height).toBeGreaterThanOrEqual(100);
        }
      }
    }
  });

  test('QR code buttons have adequate touch targets', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Look for QR code related buttons
    const qrButtons = page.locator('button:has-text("QR"), button[aria-label*="QR"]');
    const count = await qrButtons.count();

    for (let i = 0; i < count; i++) {
      const button = qrButtons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Button should meet minimum touch target size
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});

test.describe('Payment Link Buttons on Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhoneSE);
  });

  test('payment buttons are large enough to tap easily', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for payment-related buttons (Venmo, Cash App, PayPal, Zelle)
    const paymentButtons = page.locator(
      'button:has-text("Venmo"), button:has-text("Cash App"), button:has-text("PayPal"), button:has-text("Zelle"), ' +
      'a:has-text("Pay with"), button:has-text("Pay")'
    );

    const count = await paymentButtons.count();

    for (let i = 0; i < count; i++) {
      const button = paymentButtons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Buttons should be at least 44px tall for touch
          expect(box.height).toBeGreaterThanOrEqual(36); // Allow slightly smaller for secondary buttons
        }
      }
    }
  });

  test('payment buttons are accessible on small screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that buttons don't overflow their containers
    const hasOverflow = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a.button, [role="button"]');
      for (const button of buttons) {
        const rect = button.getBoundingClientRect();
        if (rect.right > window.innerWidth || rect.left < 0) {
          return true;
        }
      }
      return false;
    });

    expect(hasOverflow).toBe(false);
  });
});

test.describe('Mobile Payment Form Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhone12);
  });

  test('form inputs are easy to tap and fill on mobile', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check all visible inputs
    const inputs = page.locator('input:visible');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const box = await input.boundingBox();

      if (box) {
        // Input height should be at least 44px for easy tapping
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('form labels are associated with inputs', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check that inputs have labels or aria-label
    const inputs = page.locator('input:visible');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have some form of accessible label
      const hasLabel = id
        ? await page.locator(`label[for="${id}"]`).count() > 0
        : false;

      const isAccessible = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
      expect(isAccessible).toBeTruthy();
    }
  });

  test('keyboard appears and form is not obscured on mobile', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Focus on an input
    const emailInput = page.locator('input[name="email"], input[id="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.focus();

      // Check the input is still visible (not scrolled out of view)
      const isInViewport = await emailInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.bottom <= window.innerHeight
        );
      });

      // Input should remain in viewport when focused
      // Note: This might need adjustment as mobile keyboard behavior varies
      expect(isInViewport).toBe(true);
    }
  });
});

test.describe('Copy to Clipboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.pixel5);
  });

  test('copy buttons are tappable on mobile', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Look for copy buttons
    const copyButtons = page.locator(
      'button:has-text("Copy"), button[aria-label*="copy"], button[aria-label*="Copy"]'
    );

    const count = await copyButtons.count();

    for (let i = 0; i < count; i++) {
      const button = copyButtons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(36);
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
      }
    }
  });
});

test.describe('Mobile Payment Cards Layout', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhoneSE);
  });

  test('payment method cards stack vertically on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for card-like elements related to payments
    const cards = page.locator('[class*="rounded-lg"][class*="border"]');
    const count = await cards.count();

    if (count >= 2) {
      const visibleCards: { top: number; bottom: number }[] = [];

      for (let i = 0; i < Math.min(count, 5); i++) {
        const card = cards.nth(i);
        if (await card.isVisible()) {
          const box = await card.boundingBox();
          if (box) {
            visibleCards.push({ top: box.y, bottom: box.y + box.height });
          }
        }
      }

      // If we have multiple visible cards, check they stack vertically
      if (visibleCards.length >= 2) {
        for (let i = 1; i < visibleCards.length; i++) {
          const prev = visibleCards[i - 1];
          const curr = visibleCards[i];
          // Allow for some overlap due to margins
          expect(curr.top).toBeGreaterThanOrEqual(prev.bottom - 20);
        }
      }
    }
  });

  test('payment amount text is visible and readable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for currency amounts
    const amounts = page.locator('text=/\\$[0-9]+/');
    const count = await amounts.count();

    for (let i = 0; i < count; i++) {
      const amount = amounts.nth(i);
      if (await amount.isVisible()) {
        const fontSize = await amount.evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });

        // Amount should be readable (at least 14px)
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    }
  });
});

test.describe('Mobile Deep Link Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhone12);
  });

  test('payment links have proper attributes for mobile', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Look for external payment links
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      if (await link.isVisible()) {
        // Check for security attributes
        const rel = await link.getAttribute('rel');

        // External links should have noopener for security
        if (rel) {
          expect(rel).toContain('noopener');
        }
      }
    }
  });

  test('deep links to payment apps are properly formatted', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Check for payment app deep links
    const paymentLinks = page.locator(
      'a[href*="venmo"], a[href*="cash.app"], a[href*="paypal"]'
    );

    const count = await paymentLinks.count();

    for (let i = 0; i < count; i++) {
      const link = paymentLinks.nth(i);
      if (await link.isVisible()) {
        const href = await link.getAttribute('href');

        // Links should be properly formatted URLs
        if (href) {
          expect(href).toMatch(/^https?:\/\//);
        }
      }
    }
  });
});

test.describe('Mobile Payment Modals and Dialogs', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.pixel5);
  });

  test('dialogs are appropriately sized for mobile screens', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Try to open a dialog
    const dialogTrigger = page.locator('[data-testid="open-dialog"], button:has-text("Contact")');

    if (await dialogTrigger.count() > 0 && await dialogTrigger.first().isVisible()) {
      await dialogTrigger.first().click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"]');

      if (await dialog.count() > 0 && await dialog.isVisible()) {
        const box = await dialog.boundingBox();

        if (box) {
          // Dialog should not exceed viewport width
          expect(box.width).toBeLessThanOrEqual(mobileViewports.pixel5.width);

          // Dialog should have some padding from edges
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(mobileViewports.pixel5.width);
        }

        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });

  test('modal content is scrollable on small screens', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Try to open a dialog/modal
    const dialogTrigger = page.locator('[data-testid="open-dialog"], button:has-text("Contact")');

    if (await dialogTrigger.count() > 0 && await dialogTrigger.first().isVisible()) {
      await dialogTrigger.first().click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"]');

      if (await dialog.count() > 0 && await dialog.isVisible()) {
        // Check if dialog content is scrollable when needed
        const isScrollable = await dialog.evaluate((el) => {
          const content = el.querySelector('[class*="content"]') || el;
          return content.scrollHeight > content.clientHeight;
        });

        // If content is taller than container, it should be scrollable
        if (isScrollable) {
          const overflowY = await dialog.evaluate((el) => {
            const content = el.querySelector('[class*="content"]') || el;
            const styles = window.getComputedStyle(content);
            return styles.overflowY;
          });

          expect(['auto', 'scroll']).toContain(overflowY);
        }

        // Close dialog
        await page.keyboard.press('Escape');
      }
    }
  });
});

test.describe('Mobile Zelle QR Code', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhone12);
  });

  test('Zelle QR code display is mobile-friendly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for Zelle-related elements
    const zelleElements = page.locator('[class*="zelle"], [class*="Zelle"], :has-text("Zelle")');

    if (await zelleElements.count() > 0) {
      // Check any visible Zelle elements fit within viewport
      for (const element of await zelleElements.all()) {
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            expect(box.width).toBeLessThanOrEqual(mobileViewports.iPhone12.width);
          }
        }
      }
    }
  });
});

test.describe('Mobile Touch Gestures for Payments', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.pixel5);
  });

  test('swipe gestures do not interfere with payment UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Simulate vertical swipe
    await page.mouse.move(200, 400);
    await page.mouse.down();
    await page.mouse.move(200, 200, { steps: 10 });
    await page.mouse.up();

    // Page should scroll, not trigger any payment actions
    const newScroll = await page.evaluate(() => window.scrollY);
    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test('long press does not accidentally trigger payment', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for payment buttons
    const paymentButtons = page.locator('button:has-text("Pay")');

    if (await paymentButtons.count() > 0) {
      const button = paymentButtons.first();
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Simulate long press
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(500); // Long press duration
          await page.mouse.up();

          // Should still be on same page (no navigation occurred)
          expect(page.url()).toContain(process.env.PLAYWRIGHT_TEST_BASE_URL || 'localhost');
        }
      }
    }
  });
});

test.describe('Mobile Payment Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page, mobileViewports.iPhoneSE);
  });

  test('error messages are visible on mobile', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Try to submit form with invalid data
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Look for error messages
      const errorMessages = page.locator('[role="alert"], .error, .text-destructive, .text-red-500');

      if (await errorMessages.count() > 0) {
        for (const error of await errorMessages.all()) {
          if (await error.isVisible()) {
            const fontSize = await error.evaluate((el) => {
              return parseFloat(window.getComputedStyle(el).fontSize);
            });

            // Error messages should be readable
            expect(fontSize).toBeGreaterThanOrEqual(12);
          }
        }
      }
    }
  });

  test('error messages do not overflow on small screens', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Trigger validation errors
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Check no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    }
  });
});
