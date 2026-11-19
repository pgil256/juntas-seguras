import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests: Pool Creation Flow
 *
 * /create-pool is a three-step wizard (Basic Info → Schedule → Review) rendered
 * with shadcn/ui controls. That matters for locators: the amount, member-count
 * and duration inputs are Radix Selects, not <select> elements, so they are
 * driven by clicking the `button[role="combobox"]` trigger and then the option.
 * Radix also renders a hidden native <select> alongside each trigger, which is
 * why the helper below targets the button specifically rather than
 * getByRole('combobox') — the latter matches both and trips strict mode.
 *
 * The page is behind auth. The `.authenticated.spec.ts` suffix puts this file in
 * the `chromium-authenticated` project, which supplies storageState from the
 * `setup` project. Named anything else it runs unauthenticated, every
 * navigation redirects to /auth/signin, and the whole file fails for a reason
 * unrelated to pool creation.
 *
 * Not covered here, because /create-pool does not implement them: per-pool
 * payment-method toggles (Venmo/PayPal/Cash App/Zelle) and a rules
 * acknowledgment dialog. Payment methods are a profile-level concern and are
 * covered by e2e/payments/payment-methods.authenticated.spec.ts.
 */

/** Valid contribution amounts, per validateForm() in app/create-pool/page.tsx. */
const VALID_AMOUNTS = ['1', '3', '5', '10', '15', '20'];

/** Pick an option from the nth Radix Select on the current step. */
async function selectFromCombobox(page: Page, index: number, optionName: RegExp) {
  await page.locator('button[role="combobox"]').nth(index).click();
  await page.getByRole('option', { name: optionName }).click();
}

/** A start date that is always in the future, in the yyyy-mm-dd the input wants. */
function futureStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

async function fillBasicInfo(page: Page, name: string, amount = '5') {
  await page.getByLabel(/pool name/i).fill(name);
  // Step 1 has exactly one Select: contribution amount.
  await selectFromCombobox(page, 0, new RegExp(`^\\$${amount}$`));
}

async function fillSchedule(page: Page, startDate = futureStartDate()) {
  await page.locator('#startDate').fill(startDate);
}

/** Advance one step. Step 3 replaces "Next" with "Create Pool", so this is
 *  deliberately a single hop rather than a "go to step N" helper — the latter
 *  invites double-advancing past the end of the wizard. */
async function nextStep(page: Page) {
  await page.getByRole('button', { name: /^next$/i }).click();
}

test.describe('Pool Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/create-pool');
  });

  test('should navigate to create pool page', async ({ page }) => {
    await expect(page).toHaveURL(/.*create-pool/);
    await expect(page.getByRole('heading', { name: /create a new savings pool/i })).toBeVisible();
  });

  test('should display pool creation form', async ({ page }) => {
    await expect(page.getByLabel(/pool name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.locator('button[role="combobox"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^next$/i })).toBeVisible();
  });

  test('should show all three wizard steps', async ({ page }) => {
    for (const label of [/basic info/i, /schedule/i, /review/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test.describe('Form Validation', () => {
    test('should require pool name', async ({ page }) => {
      // Leave the name empty, complete everything else, then submit on step 3.
      await selectFromCombobox(page, 0, /^\$5$/);
      await nextStep(page);
      await fillSchedule(page);
      await nextStep(page);
      await page.getByRole('button', { name: /create pool/i }).click();

      await expect(page.getByText(/pool name is required/i)).toBeVisible();
    });

    test('should require a contribution amount', async ({ page }) => {
      await page.getByLabel(/pool name/i).fill('No Amount Pool');
      await nextStep(page);
      await fillSchedule(page);
      await nextStep(page);
      await page.getByRole('button', { name: /create pool/i }).click();

      await expect(page.getByText(/valid contribution amount/i)).toBeVisible();
    });

    test('should require a start date', async ({ page }) => {
      await fillBasicInfo(page, 'No Start Date Pool');
      await nextStep(page);
      await nextStep(page);
      await page.getByRole('button', { name: /create pool/i }).click();

      await expect(page.getByText(/start date is required/i)).toBeVisible();
    });

    test('should only offer whole-dollar amounts between $1 and $20', async ({ page }) => {
      // The amount is a fixed Select rather than a free-text field, so invalid
      // and fractional values are unreachable by construction. Assert the
      // offered set instead of trying to type a bad value.
      await page.locator('button[role="combobox"]').first().click();

      const options = await page.getByRole('option').allInnerTexts();
      expect(options.map((text) => text.trim())).toEqual(VALID_AMOUNTS.map((a) => `$${a}`));
    });
  });

  test.describe('Pool Configuration', () => {
    test.beforeEach(async ({ page }) => {
      await fillBasicInfo(page, 'Config Pool');
      await nextStep(page);
    });

    for (const [label, id] of [
      ['weekly', 'weekly'],
      ['bi-weekly', 'biweekly'],
      ['monthly', 'monthly'],
    ] as const) {
      test(`should allow selecting ${label} frequency`, async ({ page }) => {
        await page.getByRole('radio', { name: new RegExp(`^${label}$`, 'i') }).click();
        await expect(page.locator(`#${id}`)).toBeChecked();
      });
    }

    test('should allow setting the number of members', async ({ page }) => {
      // Step 2 Selects, in order: members, duration.
      await selectFromCombobox(page, 0, /^6 members$/);
      await expect(page.locator('button[role="combobox"]').first()).toContainText('6 members');
    });

    test('should allow setting the pool duration', async ({ page }) => {
      await selectFromCombobox(page, 1, /^6 months$/);
      await expect(page.locator('button[role="combobox"]').nth(1)).toContainText('6 months');
    });

    test('should require a start date field on the schedule step', async ({ page }) => {
      await expect(page.locator('#startDate')).toBeVisible();
    });
  });

  test.describe('Review Step', () => {
    test('should summarise the pool before creation', async ({ page }) => {
      await fillBasicInfo(page, 'Summary Pool', '10');
      await nextStep(page);
      await fillSchedule(page);
      await nextStep(page);

      await expect(page.getByText(/pool summary/i)).toBeVisible();
      await expect(page.getByText('Summary Pool')).toBeVisible();
      // Default members (4) x duration (3) x $10.
      await expect(page.getByText(/total pool value/i)).toBeVisible();
      await expect(page.getByText('$120')).toBeVisible();
    });

    test('should allow going back to an earlier step', async ({ page }) => {
      await fillBasicInfo(page, 'Back Nav Pool');
      await nextStep(page);
      await page.getByRole('button', { name: /^back$/i }).click();

      await expect(page.getByLabel(/pool name/i)).toHaveValue('Back Nav Pool');
    });
  });

  test.describe('Successful Creation', () => {
    test('should create pool and redirect to member management', async ({ page }) => {
      const poolName = `E2E Pool ${Date.now()}`;

      await fillBasicInfo(page, poolName);
      await nextStep(page);
      await fillSchedule(page);
      await nextStep(page);
      await page.getByRole('button', { name: /create pool/i }).click();

      // onSuccess pushes /member-management/<poolId>.
      await page.waitForURL(/\/member-management\/.+/, { timeout: 15000 });
      expect(page.url()).toMatch(/\/member-management\/.+/);
    });
  });

  test.describe('Member Invitations During Creation', () => {
    test.beforeEach(async ({ page }) => {
      await fillBasicInfo(page, 'Invite Pool');
      await nextStep(page);
      await fillSchedule(page);
      await nextStep(page);
    });

    test('should offer the three invite methods', async ({ page }) => {
      for (const name of [/send email invitations/i, /create a sharing link/i, /invite members later/i]) {
        await expect(page.getByRole('radio', { name })).toBeVisible();
      }
    });

    test('should allow adding invitee emails', async ({ page }) => {
      // Email is the default invite method, so the field is already rendered.
      const emails = page.locator('#emails');
      await expect(emails).toBeVisible();

      await emails.fill('friend@example.com, family@example.com');
      await expect(emails).toHaveValue('friend@example.com, family@example.com');
    });

    test('should hide the email field for the sharing-link method', async ({ page }) => {
      await page.getByRole('radio', { name: /create a sharing link/i }).click();

      await expect(page.locator('#emails')).toBeHidden();
    });
  });
});
