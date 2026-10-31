import { expect, test } from '../fixtures';

test.describe('admin panel authentication (guest)', () => {
  test('redirects Admin Products to the 401 page', async ({ page, productsPage }) => {
    await productsPage.visitAdminList();

    await expect(page).toHaveURL(/\/401$/);
    await expect(page.getByRole('heading', { name: 'Not authenticated!' })).toBeVisible();
    await expect(page.getByText('You are not authenticated!')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to safety!' })).toBeVisible();
  });

  test('redirects Admin Orders to the 401 page', async ({ page, ordersPage }) => {
    await ordersPage.visit();

    await expect(page).toHaveURL(/\/401$/);
    await expect(page.getByRole('heading', { name: 'Not authenticated!' })).toBeVisible();
  });
});

// Regression tests for BUG-AUTH-001/002 (fixed): protect-routes.js in wde used to check
// `req.path.startsWith('/admin')`, but Express strips the mount prefix from `req.path` for
// middleware registered via `app.use('/admin', ...)`, so the check never tripped and a
// logged-in customer could reach every admin page and action. It now checks `req.baseUrl`.
test.describe('admin panel authorization (customer)', () => {
  test.use({ loggedInAs: 'customer' });

  test('cannot access the Admin Products page', async ({ page, productsPage }) => {

    await productsPage.visitAdminList();

    await expect(page).toHaveURL(/\/403$/);
  });

  test('cannot access the Admin Orders page', async ({ page, ordersPage }) => {

    await ordersPage.visit();

    await expect(page).toHaveURL(/\/403$/);
    await expect(page.getByRole('heading', { name: 'Not authorized!' })).toBeVisible();
  });

  test('cannot access the Edit Product form', async ({ page }) => {

    await page.goto('/admin/products/000000000000000000000001');

    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});
