import type { Locator, Page } from '@playwright/test';

/**
 * Click a form's submit button and wait for the server's response to the POST.
 *
 * WDE saves the logged-in session before it answers, so this makes later requests safe. Without
 * it, a request made while the POST is still in flight (e.g. an immediate `page.goto`) can
 * write back the old, logged-out session and silently undo the login.
 */
export async function submitAndWait(page: Page, button: Locator, pathname: string): Promise<void> {
  const response = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === pathname,
  );
  await button.click();
  await response;
}

/** Password login form at /login. */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  /** Heading of the alert shown after a failed login. */
  readonly errorHeading: Locator;

  constructor(readonly page: Page) {
    this.emailInput = page.getByLabel('E-Mail');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.loginButton = page.getByRole('main').getByRole('button', { name: 'Login' });
    this.errorHeading = page
      .getByRole('main')
      .getByRole('heading', { name: 'Invalid Credentials' });
  }

  async visit(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.visit();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await submitAndWait(this.page, this.loginButton, '/login');
  }
}
