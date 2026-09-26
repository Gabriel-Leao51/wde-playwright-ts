import { expect, test } from '../fixtures';
import { users } from '../test-data';

test.describe('admin login', () => {
  test('successful admin login', async ({ page, loginPage }) => {
    await loginPage.login(users.admin.email, users.admin.password);

    await expect(page).toHaveURL(/\/products$/);
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Manage Products' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Manage Orders' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('fails with invalid credentials', async ({ page, loginPage }) => {
    await loginPage.login(users.invalidAdmin.email, users.invalidAdmin.password);

    await expect(loginPage.errorHeading).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
