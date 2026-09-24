import { authFile, expect, test as setup } from '../fixtures';
import { roles, users, type Role } from '../test-data';

/** A header link only this role sees once logged in. */
const roleLandmark: Record<Role, string> = {
  admin: 'Manage Products',
  customer: 'Orders',
};

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page, loginPage }) => {
    const { email, password } = users[role];
    await loginPage.login(email, password);

    await expect(
      page.getByRole('banner').getByRole('link', { name: roleLandmark[role] }),
    ).toBeVisible();
    await page.context().storageState({ path: authFile(role) });
  });
}
