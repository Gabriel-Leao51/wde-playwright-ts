import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { users } from '../test-data';

/** Logs in fresh (a cart mutates the shared session) and puts the seed chair in the cart. */
async function openCartWithChair(
  page: Page,
  loginPage: { login(email: string, password: string): Promise<void> },
): Promise<void> {
  await loginPage.login(users.customer.email, users.customer.password);
  await page.goto('/products/000000000000000000000001');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByText('Added to cart!', { exact: true })).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByRole('img', { name: 'Red and Black Gaming Chair' })).toBeVisible();
}

/**
 * Full-page screenshots of static, unauthenticated pages via native `toHaveScreenshot`.
 * Scoped to pages no other spec mutates while these run in parallel: guest-only routes and one
 * fixed seed product (`000000000000000000000001`, also read-only in session 11's tests). The
 * catalog list and admin pages are left out for now since concurrent product/order specs change
 * their content. Baselines are generated in the Linux `mcr.microsoft.com/playwright` Docker image
 * per CLAUDE.md, never on Windows.
 */
test.describe('Visual regression', () => {
  test('home page', async ({ page, homePage }) => {
    await homePage.visit();
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });

  test('login page', async ({ page, loginPage }) => {
    await loginPage.visit();
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveScreenshot('signup.png', { fullPage: true });
  });

  test('OTP request page', async ({ page, otpLoginPage }) => {
    await otpLoginPage.visit();
    await expect(page).toHaveScreenshot('otp-request.png', { fullPage: true });
  });

  test('401 Unauthorized page', async ({ page }) => {
    await page.goto('/401');
    await expect(page).toHaveScreenshot('401.png', { fullPage: true });
  });

  test('403 Forbidden page', async ({ page }) => {
    await page.goto('/403');
    await expect(page).toHaveScreenshot('403.png', { fullPage: true });
  });

  test('empty cart, guest', async ({ page, cartPage }) => {
    await cartPage.visit();
    await expect(page).toHaveScreenshot('cart-empty.png', { fullPage: true });
  });

  test('cart with an item', async ({ page, loginPage, browserName }) => {
    // eslint-disable-next-line playwright/no-skipped-test -- WebKit intermittently leaves the self-hosted Inter unloaded on this second in-context navigation, so its text renders differently run to run; see ROADMAP.md session 22.
    test.skip(browserName === 'webkit', 'flaky font loading in WebKit');
    await openCartWithChair(page, loginPage);
    await expect(page).toHaveScreenshot('cart-item.png', { fullPage: true });
  });

  test('product card', async ({ productsPage }) => {
    await productsPage.visitCatalog();
    await expect(productsPage.item('Red and Black Gaming Chair')).toHaveScreenshot(
      'product-card.png',
    );
  });

  // Element shots of the static sidebar, and the empty results page (no products, so concurrent
  // catalog edits can't change it).
  test('catalog filter sidebar', async ({ page, productsPage }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await productsPage.visitCatalog();
    await expect(page.getByRole('complementary', { name: 'Filters' })).toHaveScreenshot(
      'catalog-sidebar.png',
    );
  });

  test('catalog empty state', async ({ page, productsPage }) => {
    await productsPage.visitCatalogFilteredByDepartment('Nonexistent');
    await expect(page).toHaveScreenshot('catalog-empty.png', { fullPage: true });
  });

  test('product details page', async ({ page }) => {
    await page.goto('/products/000000000000000000000001');
    await expect(page).toHaveScreenshot('product-details.png', { fullPage: true });
  });
});

// Dark baselines cover one page per template (see ROADMAP.md, Dark mode); the header is shared.
test.describe('Visual regression, dark theme', () => {
  test.use({ colorScheme: 'dark' });

  test('home page, dark', async ({ page, homePage }) => {
    await homePage.visit();
    await expect(page).toHaveScreenshot('home-dark.png', { fullPage: true });
  });

  test('product card, dark', async ({ productsPage }) => {
    await productsPage.visitCatalog();
    await expect(productsPage.item('Red and Black Gaming Chair')).toHaveScreenshot(
      'product-card-dark.png',
    );
  });

  test('catalog filter sidebar, dark', async ({ page, productsPage }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await productsPage.visitCatalog();
    await expect(page.getByRole('complementary', { name: 'Filters' })).toHaveScreenshot(
      'catalog-sidebar-dark.png',
    );
  });

  test('product details page, dark', async ({ page }) => {
    await page.goto('/products/000000000000000000000001');
    await expect(page).toHaveScreenshot('product-details-dark.png', { fullPage: true });
  });

  test('cart with an item, dark', async ({ page, loginPage, browserName }) => {
    // eslint-disable-next-line playwright/no-skipped-test -- same WebKit font-loading flake as the light cart baseline.
    test.skip(browserName === 'webkit', 'flaky font loading in WebKit');
    await openCartWithChair(page, loginPage);
    await expect(page).toHaveScreenshot('cart-item-dark.png', { fullPage: true });
  });

  test('login page, dark', async ({ page, loginPage }) => {
    await loginPage.visit();
    await expect(page).toHaveScreenshot('login-dark.png', { fullPage: true });
  });
});
