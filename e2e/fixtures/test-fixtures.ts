/**
 * Custom Playwright Test Fixtures
 *
 * Provides reusable fixtures for:
 * - Authenticated page contexts
 * - Test data generation
 * - Common page operations
 */

import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

// Auth state file paths
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const USER_AUTH_FILE = path.join(AUTH_DIR, 'user.json');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  testPool: TestPool;
}>({
  // Authenticated regular user page
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: USER_AUTH_FILE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Authenticated admin user page
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ADMIN_AUTH_FILE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Test pool fixture
  testPool: async ({}, use) => {
    const pool = generateTestPool();
    await use(pool);
  },
});

// Re-export expect for convenience
export { expect };

// Test data types
export interface TestPool {
  name: string;
  contributionAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  totalMembers: number;
  description: string;
  allowedPaymentMethods: string[];
}

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

// Test data generators
export function generateTestPool(overrides?: Partial<TestPool>): TestPool {
  const timestamp = Date.now();
  return {
    name: `Test Pool ${timestamp}`,
    contributionAmount: 10,
    frequency: 'weekly',
    totalMembers: 4,
    description: 'A test pool for E2E testing',
    allowedPaymentMethods: ['venmo', 'paypal'],
    ...overrides,
  };
}

export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: `Test User ${timestamp}`,
    ...overrides,
  };
}

// Page object helpers
export class PoolPage {
  constructor(private page: Page) {}

  async goto(poolId: string) {
    await this.page.goto(`/pools/${poolId}`);
  }

  async getPoolName() {
    return await this.page.locator('[data-testid="pool-name"], h1').first().textContent();
  }

  async getCurrentRound() {
    const text = await this.page.locator('[data-testid="current-round"]').textContent();
    return parseInt(text || '1', 10);
  }

  async getMembers() {
    return await this.page.locator('[data-testid="member-row"], [data-testid="member-card"]').all();
  }

  async confirmPayment(method: string = 'venmo') {
    await this.page.click('[data-testid="confirm-payment-btn"]');
    await this.page.click(`[data-testid="method-${method}"], label:has-text("${method}")`);
    await this.page.click('[data-testid="submit-confirmation"]');
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async getPools() {
    return await this.page.locator('[data-testid="pool-card"]').all();
  }

  async openCreatePoolModal() {
    await this.page.click('[data-testid="create-pool-btn"], button:has-text("Create Pool")');
    await expect(this.page.locator('[role="dialog"]')).toBeVisible();
  }
}

export class CreatePoolPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/create-pool');
  }

  async fillBasicInfo(pool: Partial<TestPool>) {
    if (pool.name) {
      await this.page.fill('[name="name"], [data-testid="pool-name"]', pool.name);
    }
    if (pool.description) {
      await this.page.fill('[name="description"], [data-testid="description"]', pool.description);
    }
    if (pool.contributionAmount) {
      await this.page.click(`[data-value="${pool.contributionAmount}"], option[value="${pool.contributionAmount}"]`);
    }
  }

  async selectFrequency(frequency: string) {
    await this.page.click(`[data-testid="frequency-${frequency}"], label:has-text("${frequency}")`);
  }

  async setMembers(count: number) {
    await this.page.fill('[name="totalMembers"], [data-testid="total-members"]', count.toString());
  }

  async selectPaymentMethods(methods: string[]) {
    for (const method of methods) {
      await this.page.click(`[data-testid="payment-${method}"], label:has-text("${method}")`);
    }
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async acceptRules() {
    const dialog = this.page.locator('[data-testid="rules-dialog"], [role="dialog"]');
    if (await dialog.isVisible()) {
      await this.page.click('[data-testid="accept-rules"], button:has-text("Accept")');
    }
  }
}

// Utility functions for tests
export async function waitForToast(page: Page, text: RegExp | string) {
  const toast = page.locator('[role="status"], [data-testid="toast"]');
  await expect(toast).toBeVisible();
  if (typeof text === 'string') {
    await expect(toast).toContainText(text);
  } else {
    await expect(toast).toHaveText(text);
  }
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

export async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}
