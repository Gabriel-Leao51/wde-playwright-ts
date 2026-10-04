import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
/** Specs written for phone viewports; only the mobile projects run them. */
const PHONE_SPECS = /responsive\.spec\.ts/;

/**
 * See https://playwright.dev/docs/test-configuration.
 * Target overrides: WDE_BASE_URL (app). The WDE stack itself is started from ../wde â€” see CLAUDE.md.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: process.env.WDE_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Logs each role in once and saves its storage state; tests opt in via `loggedInAs`.
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      testIgnore: PHONE_SPECS,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: PHONE_SPECS,
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testIgnore: PHONE_SPECS,
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    // Phones: real device viewports with touch and a mobile user agent. They run only the
    // responsive spec; the rest of the suite is written for (and stays on) desktop.
    {
      name: 'mobile-chrome',
      testMatch: PHONE_SPECS,
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      testMatch: PHONE_SPECS,
      use: { ...devices['iPhone 15'] },
      dependencies: ['setup'],
    },
  ],
});
