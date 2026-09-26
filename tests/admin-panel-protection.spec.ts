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

// KNOWN BUGS BUG-AUTH-001/002, ported from the frozen Python suite's @xfail scenarios and
// re-verified live: middlewares/protect-routes.js in wde checks `req.path.startsWith('/admin')`,
// but Express strips the mount prefix for middleware registered via `app.use('/admin', ...)`, so
// `req.path` is already relative (e.g. "/products") and the check never trips. A logged-in
// customer can reach every admin page and action. These tests assert the secure behaviour that
// should exist, and are expected to fail until wde fixes the bug.
test.describe('admin panel authorization (customer)', () => {
  test.use({ loggedInAs: 'customer' });

  test('cannot access the Admin Products page', async ({ page, productsPage }) => {
    test.fail(true, 'BUG-AUTH-001');

    await productsPage.visitAdminList();

    await expect(page).toHaveURL(/\/403$/);
  });

  test('cannot access the Admin Orders page', async ({ page, ordersPage }) => {
    test.fail(true, 'BUG-AUTH-002');

    await ordersPage.visit();

    await expect(page.getByText('Not authorized!')).toBeVisible();
  });

  test('cannot access the Edit Product form', async ({ page }) => {
    test.fail(true, 'BUG-AUTH-001');

    await page.goto('/admin/products/000000000000000000000001');

    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});
