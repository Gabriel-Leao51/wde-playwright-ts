import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';
import { users } from '../test-data';

const PRODUCT_PAGE = '/products/000000000000000000000001';
const dataTheme = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.theme ?? null);
const cookieValue = async (page: Page, name: string) =>
  (await page.context().cookies()).find((cookie) => cookie.name === name)?.value;

test.describe('guest header', () => {
  test('shows the logo, search, empty cart and the login and signup links', async ({
    page,
    header,
  }) => {
    await page.goto(PRODUCT_PAGE);

    await expect(header.logo).toHaveAttribute('href', '/');
    await expect(header.search).toBeVisible();
    await expect(header.cartLink).toContainText('0');
    await expect(header.loginLink).toBeVisible();
    await expect(header.signupLink).toBeVisible();
    await expect(header.accountButton).toBeHidden();
  });

  test('the cart count follows an add to cart without a page reload', async ({
    page,
    header,
    productsPage,
  }) => {
    await page.goto(PRODUCT_PAGE);
    await productsPage.addToCartButton.click();

    await expect(header.cartLink).toContainText('1');
  });

  test('the search box suggests products on any page and opens the picked one', async ({
    page,
    header,
  }) => {
    await page.goto('/cart');
    await header.search.fill('chair');

    const suggestion = page.getByRole('option', { name: /Red and Black Gaming Chair/ });
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    await expect(page).toHaveURL(new RegExp(`${PRODUCT_PAGE}$`));
  });
});

test.describe('customer header', () => {
  test.use({ loggedInAs: 'customer' });

  test('keeps Orders and Logout in an account menu that closes on Escape', async ({
    page,
    header,
  }) => {
    await page.goto(PRODUCT_PAGE);

    await expect(header.ordersLink).toBeHidden();
    await expect(header.logoutButton).toBeHidden();
    await expect(header.loginLink).toBeHidden();

    await header.accountButton.click();
    await expect(header.accountButton).toHaveAttribute('aria-expanded', 'true');
    await expect(header.ordersLink).toBeVisible();
    await expect(header.logoutButton).toBeVisible();

    // A click doesn't focus a button on WebKit, and the menu's Escape handler listens on the
    // focused element - the same quirk as the language menu (see language-selector.spec.ts).
    await header.accountButton.focus();
    await page.keyboard.press('Escape');
    await expect(header.accountButton).toHaveAttribute('aria-expanded', 'false');
    await expect(header.ordersLink).toBeHidden();
  });
});

test.describe('customer logout', () => {
  // Logging out destroys the server session, which a saved login shares - so log in fresh.
  test('the account menu logs the customer out', async ({ header, loginPage }) => {
    await loginPage.login(users.customer.email, users.customer.password);
    await header.openAccountMenu();
    await header.logoutButton.click();

    await expect(header.loginLink).toBeVisible();
    await expect(header.accountButton).toBeHidden();
  });
});

test.describe('admin header', () => {
  test.use({ loggedInAs: 'admin' });

  test('has the Admin link and Logout but no search or cart', async ({ page, header }) => {
    await page.goto('/admin/products');

    await expect(header.root.getByRole('link', { name: 'Admin' })).toBeVisible();
    await expect(header.logoutButton).toBeVisible();
    await expect(header.search).toBeHidden();
    await expect(header.cartLink).toBeHidden();
  });
});

test.describe('theme menu', () => {
  // The choice is a plain cookie, not the shared server session, so a fresh guest context is safe.
  test.use({ colorScheme: 'light' });

  test('Dark applies at once, is remembered across pages, and System clears it', async ({
    page,
    header,
  }) => {
    await page.goto('/login');
    await header.themeButton.click();
    await expect(header.themeOption('System')).toHaveAttribute('aria-pressed', 'true');

    await header.themeOption('Dark').click();
    await expect.poll(() => dataTheme(page)).toBe('dark');
    expect(await cookieValue(page, 'theme')).toBe('dark');

    await page.goto('/signup');
    await expect.poll(() => dataTheme(page)).toBe('dark');
    await header.themeButton.click();
    await expect(header.themeOption('Dark')).toHaveAttribute('aria-pressed', 'true');

    await header.themeOption('System').click();
    await expect.poll(() => dataTheme(page)).toBeNull();
    expect(await cookieValue(page, 'theme')).toBeUndefined();
  });

  test('Light overrides a dark system preference', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/login');

    await page.getByRole('banner').getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Light', exact: true }).click();

    await expect.poll(() => dataTheme(page)).toBe('light');
    await context.close();
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the menu button opens and closes the nav panel', async ({ page, header }) => {
    await page.goto('/login');
    const shopLink = header.root.getByRole('link', { name: 'Shop', exact: true });

    await expect(header.search).toBeVisible();
    await expect(header.cartLink).toBeVisible();
    await expect(shopLink).toBeHidden();
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'false');

    await header.menuButton.click();
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(shopLink).toBeVisible();
    await expect(header.signupLink).toBeVisible();
    await expect(header.themeButton).toBeVisible();

    await header.menuButton.click();
    await expect(shopLink).toBeHidden();
  });
});
