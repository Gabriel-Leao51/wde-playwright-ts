import { hasOrderConfirmationEmail } from '../lib/mailpit';
import { expect, test } from '../fixtures';
import { users } from '../test-data';

const productTitle = 'GTRACING - Black Gaming Chair';

/** The `orderId` query param off the success page URL, e.g. `.../orders/success?orderId=...`. */
function orderIdFromSuccessUrl(url: string): string {
  const orderId = new URL(url).searchParams.get('orderId');
  if (!orderId) throw new Error(`success page URL had no orderId: ${url}`);
  return orderId;
}

test.describe('customer purchase flow', () => {
  // Both scenarios add the product to the cart, which mutates the shared customer session
  // (see ROADMAP.md's session 2 decision) - log in fresh instead of `loggedInAs: 'customer'`.

  test('adding a product to the cart shows a toast that disappears on its own', async ({
    page,
    loginPage,
    productsPage,
  }) => {
    await loginPage.login(users.customer.email, users.customer.password);
    await productsPage.visitCatalog();
    await productsPage.openDetails(productTitle);
    await productsPage.addToCartButton.click();

    const toast = page.getByText('Added to cart!', { exact: true });
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 6000 });
  });

  test('completes a purchase via Stripe test checkout and gets an order confirmation email', async ({
    page,
    loginPage,
    productsPage,
    cartPage,
    stripeCheckoutPage,
    browserName,
  }) => {
    // GitHub Actions' runner IPs get Stripe/Cloudflare's bot mitigation to serve checkout.stripe.com's
    // own "Something went wrong" error page to Playwright's bundled WebKit before any form renders -
    // confirmed reproducible on 2 separate CI runs, while the identical flow passes locally on WebKit
    // against the same stack. Chromium and Firefox are unaffected in CI, so this only skips there.
    test.skip(
      browserName === 'webkit' && !!process.env.CI,
      'Stripe/Cloudflare blocks Playwright WebKit from GitHub Actions runners; passes locally',
    );

    await loginPage.login(users.customer.email, users.customer.password);
    await productsPage.visitCatalog();
    await productsPage.openDetails(productTitle);
    await productsPage.addToCartButton.click();

    const cartLink = page.getByRole('banner').getByRole('link', { name: 'Cart' });
    await expect(cartLink).toContainText('1');
    await cartLink.click();
    await page.waitForURL('**/cart');

    await expect(cartPage.item(productTitle)).toBeVisible();
    await cartPage.buyProductsButton.click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20000 });

    await stripeCheckoutPage.payWithTestCard('test-customer@example.com', 'Test Customer');
    await page.waitForURL(/\/orders\/success\?orderId=/, { timeout: 20000 });

    const orderId = orderIdFromSuccessUrl(page.url());
    expect(orderId).toMatch(/^[0-9a-fA-F]{24}$/);

    await expect
      .poll(() => hasOrderConfirmationEmail(orderId, users.customer.email), {
        message: `no confirmation email found in Mailpit for order ${orderId}`,
      })
      .toBe(true);
  });
});
