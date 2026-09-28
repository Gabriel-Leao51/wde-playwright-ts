import { authFile, expect, test as setup } from '../fixtures';
import { roles, users, type Role } from '../test-data';

/** A header control only this role sees once logged in. */
const roleLandmark: Record<Role, { role: 'link' | 'button'; name: string }> = {
  admin: { role: 'link', name: 'Manage Products' },
  customer: { role: 'button', name: 'Account' },
};

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page, loginPage }) => {
    const { email, password } = users[role];
    await loginPage.login(email, password);

    const { role: landmarkRole, name } = roleLandmark[role];
    await expect(page.getByRole('banner').getByRole(landmarkRole, { name })).toBeVisible();
    await page.context().storageState({ path: authFile(role) });
  });
}
