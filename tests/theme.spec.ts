import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

// --color-bg in each theme, from wde/public/styles/tokens.css.
const LIGHT_BG = 'rgb(255, 255, 255)';
const DARK_BG = 'rgb(20, 19, 17)';

// Every page renders through head.ejs; the login page is the lightest guest one.
const PAGE = '/login';

const dataTheme = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.theme ?? null);
const pageBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('system preference, no cookie', () => {
  test.describe('light', () => {
    test.use({ colorScheme: 'light' });

    test('renders the light theme', async ({ page }) => {
      await page.goto(PAGE);

      expect(await dataTheme(page)).toBeNull();
      expect(await pageBackground(page)).toBe(LIGHT_BG);
    });
  });

  test.describe('dark', () => {
    test.use({ colorScheme: 'dark' });

    test('renders the dark theme', async ({ page }) => {
      await page.goto(PAGE);

      expect(await dataTheme(page)).toBeNull();
      expect(await pageBackground(page)).toBe(DARK_BG);
    });
  });
});

test.describe('theme cookie', () => {
  test('a light cookie overrides a dark system preference', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    await context.addCookies([{ name: 'theme', value: 'light', url: baseURL ?? '' }]);
    const page = await context.newPage();
    await page.goto(PAGE);

    expect(await dataTheme(page)).toBe('light');
    expect(await pageBackground(page)).toBe(LIGHT_BG);
    await context.close();
  });

  test('a dark cookie overrides a light system preference', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    await context.addCookies([{ name: 'theme', value: 'dark', url: baseURL ?? '' }]);
    const page = await context.newPage();
    await page.goto(PAGE);

    expect(await dataTheme(page)).toBe('dark');
    expect(await pageBackground(page)).toBe(DARK_BG);
    await context.close();
  });

  test('an unrecognised cookie value is ignored', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    await context.addCookies([{ name: 'theme', value: 'purple', url: baseURL ?? '' }]);
    const page = await context.newPage();
    await page.goto(PAGE);

    expect(await dataTheme(page)).toBeNull();
    expect(await pageBackground(page)).toBe(DARK_BG);
    await context.close();
  });
});
