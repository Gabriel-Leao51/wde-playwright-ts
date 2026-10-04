import { expect, test } from '../fixtures';
import { users } from '../test-data';

const productTitle = 'Red and Black Gaming Chair';

test.describe('error pages', () => {
  const pages = [
    { path: '/401', code: '401', heading: 'Not authenticated!' },
    { path: '/403', code: '403', heading: 'Not authorized!' },
    { path: '/products/000000000000000000000099', code: '404', heading: 'Could not find resource' },
  ];

  for (const { path, code, heading } of pages) {
    test(`${code} shows a card with a heading and two ways out`, async ({ page }) => {
      await page.goto(path);

      const card = page.getByRole('main');
      await expect(card.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(card.getByText(code, { exact: true })).toBeVisible();
      await expect(card.getByRole('link', { name: 'Back to safety!' })).toHaveAttribute(
        'href',
        '/',
      );
      await expect(card.getByRole('link', { name: 'Browse products' })).toHaveAttribute(
        'href',
        '/products',
      );
    });
  }

  test('the exits actually leave the error page', async ({ page }) => {
    await page.goto('/products/000000000000000000000099');
    await page.getByRole('link', { name: 'Browse products' }).click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test('the card is translated in Portuguese and fits a phone', async ({ page, setLanguage }) => {
    await setLanguage('pt');
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/403');

    await expect(page.getByRole('link', { name: 'Ver produtos' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('toasts', () => {
  test('a toast has a dismiss button that removes it at once', async ({
    page,
    loginPage,
    productsPage,
  }) => {
    await loginPage.login(users.customer.email, users.customer.password);
    await productsPage.visitCatalog();
    await productsPage.openDetails(productTitle);
    await productsPage.addToCartButton.click();

    const toast = page.getByRole('status').filter({ hasText: 'Added to cart!' });
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'Dismiss' }).click();

    await expect(toast).toBeHidden({ timeout: 2000 });
  });

  test('an error toast is announced as an alert, a success toast as a status', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      const show = (window as unknown as { showToast: (m: string, t: string) => void }).showToast;
      show('It worked', 'success');
      show('It broke', 'error');
    });

    await expect(page.getByRole('status').filter({ hasText: 'It worked' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'It broke' })).toBeVisible();
  });

  test('the dismiss button is translated and the toast spans a phone', async ({
    page,
    setLanguage,
  }) => {
    await setLanguage('pt');
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/login');
    await page.evaluate(() => {
      (window as unknown as { showToast: (m: string) => void }).showToast('Olá');
    });

    const toast = page.getByRole('status').filter({ hasText: 'Olá' });
    await expect(toast.getByRole('button', { name: 'Fechar' })).toBeVisible();
    const box = await toast.boundingBox();
    expect(box?.width).toBeGreaterThan(300);
  });
});

test.describe('delete confirmation modal', () => {
  test.use({ loggedInAs: 'admin' });

  test('is a named modal with a destructive confirm button, closable with Escape', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    await productsPage.deleteButton(productTitle).click();

    const dialog = productsPage.deleteDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName('Delete product?');
    await expect(dialog).toContainText(productTitle);
    await expect(productsPage.confirmDeleteButton).toHaveCSS(
      'background-color',
      'rgb(217, 45, 32)',
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(productsPage.item(productTitle)).toBeVisible();
  });

  test('stays inside a phone viewport', async ({ page, productsPage }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await productsPage.visitAdminList();
    await productsPage.deleteButton(productTitle).click();

    const box = await productsPage.deleteDialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
  });
});
