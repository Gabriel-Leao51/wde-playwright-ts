import { expect, test } from '../fixtures';
import { users } from '../test-data';

test.describe('admin login', () => {
  test('successful admin login', async ({ page, loginPage }) => {
    await loginPage.login(users.admin.email, users.admin.password);

    // An admin goes straight to the dashboard instead of the store's home page.
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole('heading', { name: 'Product Administration' })).toBeVisible();
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Admin' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('fails with invalid credentials', async ({ page, loginPage }) => {
    await loginPage.login(users.invalidAdmin.email, users.invalidAdmin.password);

    await expect(loginPage.errorHeading).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
