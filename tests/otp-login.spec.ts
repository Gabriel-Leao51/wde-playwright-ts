import { retrieveOtpCode } from '../lib/mailpit';
import { expect, test } from '../fixtures';
import { users } from '../test-data';

/** Polls Mailpit until the newest login-code email for `email` shows up, then returns its code. */
async function waitForOtpCode(email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        code = await retrieveOtpCode(email);
        return code;
      },
      { message: `could not find a login code email for ${email} in Mailpit` },
    )
    .toMatch(/^\d{6}$/);
  if (code === undefined)
    throw new Error('unreachable: expect.poll already matched a 6-digit code');
  return code;
}

// Both scenarios request a code for the same customer email, and wde keeps only one pending code
// per email at a time (a new request deletes the last one) - run them one after another so they
// can't invalidate each other's code.
test.describe.configure({ mode: 'serial' });

test.describe('OTP login', () => {
  test('a customer logs in with a one-time code emailed to them', async ({
    page,
    otpLoginPage,
  }) => {
    await otpLoginPage.visit();
    await otpLoginPage.requestCode(users.customer.email);
    await expect(page).toHaveURL(/\/login\/otp\/verify/);

    const code = await waitForOtpCode(users.customer.email);
    await otpLoginPage.submitCode(code);

    await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
  });

  test('a login code becomes invalid after too many wrong attempts', async ({
    page,
    otpLoginPage,
  }) => {
    await otpLoginPage.visit();
    await otpLoginPage.requestCode(users.customer.email);
    await expect(page).toHaveURL(/\/login\/otp\/verify/);

    for (let attempt = 0; attempt < 5; attempt++) {
      await otpLoginPage.submitCode('000000');
    }
    await expect(page).toHaveURL(/\/login\/otp\/verify/);

    // wde caps verification attempts at 5 (models/otp.model.js's MAX_ATTEMPTS), so even the code
    // that was actually issued no longer works once that cap is hit.
    const code = await waitForOtpCode(users.customer.email);
    await otpLoginPage.submitCode(code);

    await expect(page).toHaveURL(/\/login\/otp\/verify/);
  });
});
