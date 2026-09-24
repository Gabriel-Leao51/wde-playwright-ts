import type { Locator, Page } from '@playwright/test';

/**
 * Password login form at /login. Only the login flow for now (the auth setup needs it);
 * session 3 ports the rest of the Python page objects.
 */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(readonly page: Page) {
    this.emailInput = page.getByLabel('E-Mail');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.loginButton = page.getByRole('main').getByRole('button', { name: 'Login' });
  }

  async visit(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.visit();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
