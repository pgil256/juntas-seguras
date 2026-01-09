import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 */

// Auth state storage paths
const AUTH_DIR = path.join(__dirname, 'e2e', '.auth');
const USER_AUTH_FILE = path.join(AUTH_DIR, 'user.json');

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on retry */
    video: 'on-first-retry',
  },

  /* Global setup runs once before all tests to set up auth state */
  globalSetup: require.resolve('./e2e/global.setup.ts'),

  /* Configure projects for major browsers */
  projects: [
    /* Setup project runs first to authenticate test users */
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },

    /* Unauthenticated tests (auth flows, public pages) */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*authenticated.*\.spec\.ts/,
    },

    /* Authenticated tests run after setup */
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_AUTH_FILE,
      },
      dependencies: ['setup'],
      testMatch: /.*authenticated.*\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /.*authenticated.*\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /.*authenticated.*\.spec\.ts/,
    },

    /* Test against mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: /.*authenticated.*\.spec\.ts/,
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: /.*authenticated.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global timeout for each test */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 5 * 1000,
  },
});
