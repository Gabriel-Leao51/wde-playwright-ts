import { scan } from '../lib/axe';
import { expect, test } from '../fixtures';
import { users } from '../test-data';

/*
 * axe-core scans of every page type, in both themes, plus the interactive states that add
 * markup of their own (open menus, validation errors, the toast, the delete modal). The rules
 * are WCAG 2.x A and AA (see lib/axe.ts). Axe finds what a machine can find, roughly a third of
 * real accessibility problems, so these are a floor, not a certificate.
 */

const PRODUCT_PAGE = '/products/000000000000000000000001';
const productTitle = 'Red and Black Gaming Chair';

const themes = ['light', 'dark'] as const;

const guestPages = [
  ['home', '/'],
  ['catalog', '/products'],
  ['catalog filtered', '/products?department=gaming'],
  ['catalog empty state', '/products?department=nope'],
  ['product details', PRODUCT_PAGE],
  ['empty cart', '/cart'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['OTP request', '/login/otp'],
  ['credits', '/credits'],
  ['404', '/products/000000000000000000000099'],
  ['401', '/admin/products'],
] as const;

for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test.describe('guest pages', () => {
      for (const [name, path] of guestPages) {
        test(name, async ({ page }) => {
          await page.goto(path);
          expect(await scan(page)).toEqual([]);
        });
      }
    });

    test.describe('customer pages', () => {
      test.use({ loggedInAs: 'customer' });

      for (const [name, path] of [
        ['orders', '/orders'],
        ['cart', '/cart'],
        ['403', '/admin/products'],
      ] as const) {
        test(name, async ({ page }) => {
          await page.goto(path);
          expect(await scan(page)).toEqual([]);
        });
      }
    });

    test.describe('admin pages', () => {
      test.use({ loggedInAs: 'admin' });

      for (const [name, path] of [
        ['products table', '/admin/products'],
        ['new product form', '/admin/products/new'],
        ['orders table', '/admin/orders'],
      ] as const) {
        test(name, async ({ page }) => {
          await page.goto(path);
          expect(await scan(page)).toEqual([]);
        });
      }
    });
  });
}

test.describe('interactive states', () => {
  test('the open language and theme menus', async ({ page, header }) => {
    await page.goto('/');
    await header.languageButton.click();
    await expect(header.languageButton).toHaveAttribute('aria-expanded', 'true');
    expect(await scan(page)).toEqual([]);

    await header.themeButton.click();
    await expect(header.themeButton).toHaveAttribute('aria-expanded', 'true');
    expect(await scan(page)).toEqual([]);
  });

  test('the phone menu panel', async ({ page, header }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await header.menuButton.click();
    await expect(header.menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(await scan(page)).toEqual([]);
  });

  test('live search suggestions', async ({ page, header, productsPage }) => {
    await page.goto('/');
    await header.search.fill('chair');
    await expect(productsPage.searchSuggestion('Ergonomic Mesh Office Chair')).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('login form with validation errors', async ({ page, loginPage }) => {
    await page.goto('/login');
    await loginPage.loginButton.click();
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(await scan(page)).toEqual([]);
  });

  test.describe('rich text editor', () => {
    test('has a named text area and named toolbar buttons, in English and Portuguese', async ({
      page,
      loginPage,
      productsPage,
      setLanguage,
    }) => {
      // The language lives in the server session, so log in fresh rather than share a saved one.
      await loginPage.visit();
      await loginPage.login(users.admin.email, users.admin.password);
      await page.goto('/admin/products/new');
      await expect(productsPage.descriptionEditor).toBeVisible();
      await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear formatting' })).toBeVisible();

      await setLanguage('pt');
      await page.goto('/admin/products/new');
      await expect(page.getByRole('textbox', { name: 'Descrição' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
    });
  });

  test('the add-to-cart toast', async ({ page, productsPage }) => {
    await page.goto(PRODUCT_PAGE);
    await productsPage.addToCartButton.click();
    await expect(page.getByRole('status').filter({ hasText: 'Added to cart!' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test.describe('admin delete modal', () => {
    test.use({ loggedInAs: 'admin' });

    for (const colorScheme of themes) {
      test(`delete dialog, ${colorScheme}`, async ({ page, productsPage }) => {
        await page.emulateMedia({ colorScheme });
        await productsPage.visitAdminList();
        await productsPage.deleteButton(productTitle).click();
        await expect(productsPage.deleteDialog).toBeVisible();
        // The dialog fades in; axe would measure contrast against half-transparent colours.
        await expect
          .poll(() => productsPage.deleteDialog.evaluate((el) => el.getAnimations().length))
          .toBe(0);
        expect(await scan(page)).toEqual([]);
      });
    }
  });
});
