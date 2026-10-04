import type { Locator, Page } from '@playwright/test';

import { expect, test } from '../fixtures';

/*
 * Runs only on the phone projects (Pixel 7 and iPhone 15 in playwright.config.ts): a real
 * device viewport, touch input and a mobile user agent, rather than a resized desktop window.
 */

const PRODUCT_PAGE = '/products/000000000000000000000001';
const productTitle = 'Red and Black Gaming Chair';
/** Apple's HIG and WCAG 2.5.5 minimum for a touch target, in CSS pixels. */
const TOUCH_TARGET = 44;

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function expectTouchTargets(links: Locator): Promise<void> {
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box?.height, `link ${String(i)} height`).toBeGreaterThanOrEqual(TOUCH_TARGET);
  }
}

test.describe('every page fits the phone screen', () => {
  const guestPages = [
    '/',
    '/products',
    '/products?department=nope',
    PRODUCT_PAGE,
    '/cart',
    '/login',
    '/signup',
    '/login/otp',
    '/credits',
    '/products/000000000000000000000099',
  ];
  for (const path of guestPages) {
    test(`guest: ${path}`, async ({ page }) => {
      await page.goto(path);
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  test.describe('customer', () => {
    test.use({ loggedInAs: 'customer' });

    for (const path of ['/orders', '/cart']) {
      test(path, async ({ page }) => {
        await page.goto(path);
        expect(await horizontalOverflow(page)).toBe(0);
      });
    }
  });

  test.describe('admin', () => {
    test.use({ loggedInAs: 'admin' });

    // The wide tables scroll inside their own region instead of widening the page.
    for (const path of ['/admin/products', '/admin/products/new', '/admin/orders']) {
      test(path, async ({ page }) => {
        await page.goto(path);
        expect(await horizontalOverflow(page)).toBe(0);
      });
    }
  });
});

test.describe('touch targets', () => {
  test('footer links are tall enough to tap', async ({ page, footer }) => {
    await page.goto('/');
    await expectTouchTargets(footer.root.getByRole('link'));
  });

  test('breadcrumb links are tall enough to tap', async ({ page, productsPage }) => {
    await page.goto(PRODUCT_PAGE);
    await expectTouchTargets(productsPage.breadcrumbs.getByRole('link'));
  });

  test('the login card links and Clear filters are tall enough to tap', async ({
    page,
    productsPage,
  }) => {
    await page.goto('/login');
    await expectTouchTargets(
      page.getByRole('main').getByRole('link', { name: /Create a new user|email code/ }),
    );

    await productsPage.visitCatalogFilteredByDepartment('gaming');
    await expectTouchTargets(productsPage.clearFiltersLink);
  });

  test('text inputs are at least 16px so iOS does not zoom in on focus', async ({
    page,
    header,
    loginPage,
  }) => {
    await page.goto('/login');
    for (const input of [header.search, loginPage.emailInput, loginPage.passwordInput]) {
      const fontSize = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('phone menu', () => {
  test('a tap outside the panel closes it', async ({ page, header }) => {
    await page.goto('/');
    await header.menuButton.tap();
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(header.signupLink).toBeVisible();

    await page.getByRole('main').getByRole('heading', { name: 'Shop by department' }).tap();
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(header.signupLink).toBeHidden();
  });

  test('a tap outside closes an open language menu too', async ({ page, header }) => {
    await page.goto('/');
    await header.menuButton.tap();
    await header.languageButton.tap();
    await expect(header.languageButton).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('main').getByRole('heading', { name: 'Shop by department' }).tap();
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'false');

    // The closed panel hides the language button, so reopen it to read the menu's state.
    await header.menuButton.tap();
    await expect(header.languageButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes the panel and returns focus to the menu button', async ({ page, header }) => {
    await page.goto('/');
    await header.menuButton.tap();
    await expect(header.signupLink).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(header.menuButton).toBeFocused();
  });

  test('Escape in an open language menu closes only that menu', async ({ page, header }) => {
    await page.goto('/');
    await header.menuButton.tap();
    await header.languageButton.tap();
    await expect(header.languageButton).toHaveAttribute('aria-expanded', 'true');

    // A tap doesn't focus a button on WebKit, and the menu listens for Escape on its own element.
    await header.languageButton.focus();
    await page.keyboard.press('Escape');
    await expect(header.languageButton).toHaveAttribute('aria-expanded', 'false');
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'true');
  });
});

// The first screen of the home page, one baseline per phone and theme. Generated in the Linux
// Playwright image like every other baseline (see the visual-baselines skill), never on Windows.
test.describe('phone home screen', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(colorScheme, () => {
      test.use({ colorScheme });

      test(`home, ${colorScheme}`, async ({ page, homePage }) => {
        await homePage.visit();
        await expect(page).toHaveScreenshot(`phone-home-${colorScheme}.png`);
      });
    });
  }
});

test.describe('shopping by touch', () => {
  // A guest gets a fresh server session per test, so the cart starts empty and nothing is shared.
  test('tap a card, add it to the cart and raise the quantity', async ({
    page,
    header,
    productsPage,
    cartPage,
  }) => {
    await productsPage.visitCatalog();
    await productsPage.item(productTitle).tap();
    await expect(page).toHaveURL(new RegExp(`${PRODUCT_PAGE}$`));

    await productsPage.addToCartButton.tap();
    await expect(page.getByText('Added to cart!')).toBeVisible();
    await expect(header.cartLink).toContainText('1');

    await header.cartLink.tap();
    await expect(cartPage.item(productTitle)).toBeVisible();
    await cartPage.increaseButton(productTitle).tap();
    await expect(cartPage.quantity(productTitle, 2)).toBeVisible();
    await expect(cartPage.summary).toBeVisible();
  });
});
