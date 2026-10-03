import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

const REQUIRED = 'This field is required.';

// The card's own heading is the anchor: the card is the heading's parent section.
const card = (page: Page) => page.getByRole('main').getByRole('region').first();

test.describe('login card', () => {
  test('is centred on the page', async ({ page, loginPage }) => {
    await loginPage.visit();

    const box = await card(page).boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - (viewport?.width ?? 0) / 2)).toBeLessThan(2);
    expect(box?.width).toBeLessThanOrEqual(26 * 16);
  });

  test('empty submit shows a message under each field and stays on the page', async ({
    page,
    loginPage,
  }) => {
    await loginPage.visit();
    await loginPage.loginButton.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('main').getByText(REQUIRED)).toHaveCount(2);
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(loginPage.emailInput).toHaveAccessibleDescription(REQUIRED);
    await expect(loginPage.passwordInput).toHaveAccessibleDescription(REQUIRED);
  });

  test('a message clears once the field is valid', async ({ loginPage }) => {
    await loginPage.visit();
    await loginPage.loginButton.click();
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');

    await loginPage.emailInput.fill('someone@example.com');

    await expect(loginPage.emailInput).not.toHaveAttribute('aria-invalid');
    await expect(loginPage.emailInput).toHaveAccessibleDescription('');
  });

  test('a badly formatted email is flagged when leaving the field', async ({ loginPage }) => {
    await loginPage.visit();
    await loginPage.emailInput.fill('not-an-email');
    await loginPage.passwordInput.focus();

    await expect(loginPage.emailInput).toHaveAccessibleDescription('Enter a valid email address.');
  });
});

test.describe('signup card', () => {
  test('flags a mismatched confirmation email, and clears it when they match', async ({ page }) => {
    await page.goto('/signup');
    const main = page.getByRole('main');
    const email = main.getByLabel('E-Mail', { exact: true });
    const confirm = main.getByLabel('Confirm Email');

    await email.fill('one@example.com');
    await confirm.fill('two@example.com');
    await main.getByLabel('Password').focus();
    await expect(confirm).toHaveAccessibleDescription('The email addresses do not match.');

    await confirm.fill('one@example.com');
    await expect(confirm).not.toHaveAttribute('aria-invalid');
  });

  test('flags a short password and a short postal code', async ({ page }) => {
    await page.goto('/signup');
    const main = page.getByRole('main');
    const password = main.getByLabel('Password');
    const postal = main.getByLabel('Postal Code');

    await password.fill('abc');
    await postal.fill('123');
    await main.getByLabel('City').focus();

    await expect(password).toHaveAccessibleDescription(
      'Password must be at least 6 characters long.',
    );
    await expect(postal).toHaveAccessibleDescription('Postal code must be 5 characters long.');
  });

  test('an empty submit marks every required field', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('main').getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('main').getByText(REQUIRED)).toHaveCount(7);
  });

  test('messages follow the selected language', async ({ page, setLanguage }) => {
    await setLanguage('pt');
    await page.goto('/signup');
    await page.getByRole('main').getByRole('button', { name: 'Criar Conta' }).click();

    await expect(
      page.getByRole('main').getByText('Este campo é obrigatório.').first(),
    ).toBeVisible();
  });
});

test.describe('OTP forms', () => {
  test('the request form asks for an email before sending', async ({ page, otpLoginPage }) => {
    await otpLoginPage.visit();
    await otpLoginPage.sendCodeButton.click();

    await expect(page).toHaveURL(/\/login\/otp$/);
    await expect(otpLoginPage.emailInput).toHaveAccessibleDescription(REQUIRED);
  });

  test('the verify form only accepts a 6-digit code', async ({ page, otpLoginPage }) => {
    await page.goto('/login/otp/verify?email=nobody@example.com');
    await otpLoginPage.codeInput.fill('12ab');
    await otpLoginPage.verifyButton.click();

    await expect(page).toHaveURL(/\/login\/otp\/verify/);
    await expect(otpLoginPage.codeInput).toHaveAccessibleDescription('Enter the 6-digit code.');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the card fits the screen without sideways scrolling', async ({ page }) => {
    await page.goto('/signup');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await card(page).boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });
});
