import { expect, test } from '../fixtures';
import { users } from '../test-data';

// The admin list's own search sits inside Product Administration. These tests only read, so they
// share the saved admin login; the Portuguese one changes the language and logs in fresh.
test.describe('admin product search', () => {
  test.use({ loggedInAs: 'admin' });

  test('lives in the page, not in the store header', async ({ header, page, productsPage }) => {
    await productsPage.visitAdminList();

    await expect(productsPage.adminSearchInput).toBeVisible();
    await expect(page.getByRole('search', { name: 'Search products' })).toBeVisible();
    // The customer-facing header search is not shown to an admin, so the two can't be confused.
    await expect(header.search).toHaveCount(0);
    await expect(header.root.getByRole('searchbox')).toHaveCount(0);
  });

  test('lists every product until something is searched', async ({ productsPage }) => {
    await productsPage.visitAdminList();

    await expect(productsPage.adminCount).toHaveText(/^\s*24 products\s*$/);
    await expect(productsPage.adminClearSearchLink).toHaveCount(0);
  });

  test('finds a product by part of its name, ignoring case', async ({ page, productsPage }) => {
    await productsPage.visitAdminList();
    await productsPage.searchAdminList('MESH office');

    await expect(page).toHaveURL(/\/admin\/products\?q=MESH(\+|%20)office$/);
    await expect(productsPage.item('Ergonomic Mesh Office Chair')).toBeVisible();
    await expect(productsPage.adminCount).toHaveText(/^\s*1 of 24 products\s*$/);
    await expect(productsPage.adminSearchInput).toHaveValue('MESH office');
  });

  test('finds products by department', async ({ productsPage }) => {
    await productsPage.visitAdminList();
    await productsPage.searchAdminList('gaming');

    // Four seed products are in the Gaming department, whatever their names say.
    await expect(productsPage.adminTable.getByRole('row')).toHaveCount(5);
    await expect(productsPage.item('Gaming Headset')).toBeVisible();
    await expect(productsPage.item('Mechanical Keyboard')).toBeVisible();
    await expect(productsPage.item('Wireless Over-Ear Headphones')).toBeHidden();
  });

  test('keeps the row actions working on a filtered list', async ({ page, productsPage }) => {
    await productsPage.visitAdminList();
    await productsPage.searchAdminList('Mechanical Keyboard');

    await expect(productsPage.deleteButton('Mechanical Keyboard')).toBeVisible();
    await productsPage.openEditForm('Mechanical Keyboard');
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f]{24}$/);
  });

  test('shows an empty state with a way back, and clearing restores the list', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    await productsPage.searchAdminList('zzzz');

    await expect(page.getByRole('heading', { name: /No products match/ })).toContainText('zzzz');
    await expect(productsPage.adminTable).toBeHidden();
    await expect(productsPage.adminCount).toHaveText(/^\s*0 of 24 products\s*$/);

    await productsPage.adminClearSearchLink.click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(productsPage.adminCount).toHaveText(/^\s*24 products\s*$/);
    await expect(productsPage.adminSearchInput).toHaveValue('');
  });

  test('treats the search text as plain text, not markup or a pattern', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    await productsPage.searchAdminList('<img src=x onerror=alert(1)>.*');

    await expect(page.getByRole('heading', { name: /No products match/ })).toBeVisible();
    await expect(page.getByRole('main').getByRole('img', { name: 'x' })).toHaveCount(0);
  });
});

test.describe('admin product search in Portuguese', () => {
  test('is labelled and matches Portuguese names and department labels', async ({
    page,
    loginPage,
    productsPage,
    setLanguage,
  }) => {
    // The language lives in the server session, so log in fresh rather than share a saved one.
    await loginPage.login(users.admin.email, users.admin.password);
    await setLanguage('pt');
    await page.goto('/admin/products');

    await expect(page.getByRole('searchbox', { name: 'Buscar produtos' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Buscar produtos' }).fill('Escritório');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.waitForURL('**/admin/products?q=*');

    await expect(productsPage.adminTable.getByRole('row')).not.toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Limpar busca' })).toBeVisible();
  });
});
