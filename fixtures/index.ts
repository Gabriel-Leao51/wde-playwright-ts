import path from 'node:path';

import { test as base } from '@playwright/test';

import { LoginPage } from '../pages/login-page';
import type { Language, Role } from '../test-data';

/** Where the auth setup project saves each role's logged-in storage state. */
export function authFile(role: Role): string {
  return path.resolve(__dirname, '..', 'playwright', '.auth', `${role}.json`);
}

interface Options {
  /**
   * Start the test already logged in as this role, reusing the session saved by the setup
   * project instead of logging in again. Leave unset for a guest.
   *
   * The session is shared server-side by every test using the role, so tests that change it
   * (cart contents, language, logout) must log in fresh via `loginPage` instead.
   */
  loggedInAs: Role | undefined;
}

interface Fixtures {
  loginPage: LoginPage;
  /** Set the storefront language via GET /lang/:code, the same request the EN/PT switcher makes. */
  setLanguage: (language: Language) => Promise<void>;
}

export const test = base.extend<Fixtures & Options>({
  loggedInAs: [undefined, { option: true }],

  storageState: async ({ loggedInAs, storageState }, use) => {
    await use(loggedInAs ? authFile(loggedInAs) : storageState);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  setLanguage: async ({ page }, use) => {
    await use(async (language) => {
      await page.goto(`/lang/${language}`);
    });
  },
});

export { expect } from '@playwright/test';
