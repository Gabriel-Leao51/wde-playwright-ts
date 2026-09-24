import { expect, test } from '../fixtures';

// Sanity checks for the shared fixtures themselves; feature scenarios arrive from session 5.

test.describe('saved admin session', () => {
  test.use({ loggedInAs: 'admin' });

  test('opens the admin panel without logging in', async ({ page }) => {
    await page.goto('/admin/products');

    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Manage Products' }),
    ).toBeVisible();
  });
});

test.describe('saved customer session', () => {
  test.use({ loggedInAs: 'customer' });

  test('opens the order history without logging in', async ({ page }) => {
    await page.goto('/orders');

    await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
  });
});

test('guest can switch the storefront language', async ({ page, setLanguage }) => {
  await setLanguage('pt');

  await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toBeVisible();
});
