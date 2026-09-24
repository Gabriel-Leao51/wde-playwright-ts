import type { Locator, Page } from '@playwright/test';

import { submitAndWait } from './login-page';

/** Passwordless login: request a code at /login/otp, then enter it at /login/otp/verify. */
export class OtpLoginPage {
  readonly emailInput: Locator;
  readonly sendCodeButton: Locator;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;
  /** Heading of the alert shown for an invalid email or code. */
  readonly errorHeading: Locator;

  constructor(readonly page: Page) {
    const main = page.getByRole('main');
    this.emailInput = main.getByLabel('E-Mail');
    this.sendCodeButton = main.getByRole('button', { name: 'Send Code' });
    this.codeInput = main.getByLabel('Login Code');
    this.verifyButton = main.getByRole('button', { name: 'Verify' });
    this.errorHeading = main.getByRole('heading', { name: 'Invalid Input' });
  }

  async visit(): Promise<void> {
    await this.page.goto('/login/otp');
  }

  async requestCode(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.sendCodeButton.click();
  }

  async submitCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await submitAndWait(this.page, this.verifyButton, '/login/otp/verify');
  }
}
