import { expect, test } from '../fixtures';
import { orders, users } from '../test-data';

const productTitle = 'Red and Black Gaming Chair';

test.describe('admin sidebar and products table', () => {
  test.use({ loggedInAs: 'admin' });

  test('the sidebar links Products and Orders and marks the current page', async ({
    page,
    productsPage,
    ordersPage,
  }) => {
    await productsPage.visitAdminList();
    const { adminSidebar } = productsPage;

    await expect(adminSidebar.getByRole('link', { name: 'Manage Products' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(adminSidebar.getByRole('link', { name: 'Manage Orders' })).not.toHaveAttribute(
      'aria-current',
    );

    await ordersPage.openFromSidebar();
    await expect(page).toHaveURL(/\/admin\/orders$/);
    await expect(adminSidebar.getByRole('link', { name: 'Manage Orders' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await productsPage.manageProductsLink.click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('the sidebar also frames the add product form', async ({ productsPage }) => {
    await productsPage.visitAdminList();
    await productsPage.openAddForm();

    await expect(productsPage.adminSidebar).toBeVisible();
    await expect(productsPage.titleInput).toBeVisible();
  });

  test('the table has a column header per field and a product count', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    const headers = productsPage.adminTable.getByRole('columnheader');

    await expect(headers.getByText('Product', { exact: true })).toBeVisible();
    await expect(headers.getByText('Department', { exact: true })).toBeVisible();
    await expect(headers.getByText('Price', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText(/^\d+ products$/)).toBeVisible();
  });

  test('a row shows the photo, title, department, price and both actions', async ({
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    const row = productsPage.item(productTitle);

    await expect(productsPage.itemImage(productTitle)).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Gaming', exact: true })).toBeVisible();
    await expect(row.getByRole('cell', { name: '$249.99', exact: true })).toBeVisible();
    await expect(productsPage.editLink(productTitle)).toBeVisible();
    await expect(productsPage.deleteButton(productTitle)).toBeVisible();
  });

  test('on a phone the page does not scroll sideways and the sidebar sits above the table', async ({
    page,
    productsPage,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await productsPage.visitAdminList();
    await expect(productsPage.adminTable).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const sidebar = await productsPage.adminSidebar.boundingBox();
    const table = await productsPage.adminTable.boundingBox();
    expect(sidebar?.y).toBeLessThan(table?.y ?? 0);
  });

  test('on a desktop the sidebar sits beside the table', async ({ page, productsPage }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await productsPage.visitAdminList();

    const sidebar = await productsPage.adminSidebar.boundingBox();
    const table = await productsPage.adminTable.boundingBox();
    expect(sidebar?.x).toBeLessThan(table?.x ?? 0);
    expect((sidebar?.x ?? 0) + (sidebar?.width ?? 0)).toBeLessThanOrEqual(table?.x ?? 0);
  });
});

test.describe('admin orders table', () => {
  test.use({ loggedInAs: 'admin' });

  test('the table has a column header per field and an order count', async ({
    page,
    ordersPage,
  }) => {
    await ordersPage.visit();
    const headers = ordersPage.adminTable.getByRole('columnheader');

    for (const name of ['Order', 'Date', 'Customer', 'Items', 'Total', 'Status', 'Actions']) {
      await expect(headers.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('main').getByText(/^\d+ orders?$/)).toBeVisible();
  });

  test('a row shows the reference, customer, items, total, status badge and update controls', async ({
    ordersPage,
  }) => {
    await ordersPage.visit();
    const row = ordersPage.row(orders.orderData.testOrderId);

    await expect(row.getByRole('rowheader', { name: /^#[0-9A-F]{6}$/ })).toBeVisible();
    await expect(row.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/);
    await expect(row.getByRole('list').getByRole('listitem').first()).toContainText(/\(x\d+\)$/);
    await expect(row.getByRole('cell', { name: /^\$\d+\.\d{2}$/ })).toBeVisible();
    await expect(row.getByRole('combobox', { name: 'Status' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Update' })).toBeVisible();
    // The status badge is colour-coded, so it has a background of its own.
    await expect(row.getByText(/^(PENDING|FULFILLED|CANCELLED)$/)).not.toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
  });

  test('sorting a column marks it with aria-sort and clears the others', async ({ ordersPage }) => {
    await ordersPage.visit();
    const total = ordersPage.columnHeader('Total');
    const status = ordersPage.columnHeader('Status');

    await total.click();
    await expect(total).toHaveAttribute('aria-sort', 'ascending');
    await total.click();
    await expect(total).toHaveAttribute('aria-sort', 'descending');
    await status.click();
    await expect(status).toHaveAttribute('aria-sort', 'ascending');
    await expect(total).toHaveAttribute('aria-sort', 'none');
  });

  test('on a phone the page does not scroll sideways and the table scrolls inside its frame', async ({
    page,
    ordersPage,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await ordersPage.visit();
    await expect(ordersPage.adminTable).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
// Changing the language mutates the shared server session, so this one logs in fresh.
test('the admin shell is translated to Portuguese', async ({ page, loginPage, setLanguage }) => {
  await loginPage.login(users.admin.email, users.admin.password);
  await setLanguage('pt');
  await page.goto('/admin/products');

  const sidebar = page.getByRole('navigation', { name: 'Administração', exact: true });
  await expect(sidebar.getByRole('link', { name: 'Gerenciar Produtos' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Gerenciar Pedidos' })).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Produtos do catálogo' }).getByRole('columnheader', {
      name: 'Departamento',
    }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByText(/^\d+ produtos$/)).toBeVisible();
});

test('the admin orders table is translated to Portuguese', async ({
  page,
  loginPage,
  setLanguage,
  ordersPage,
}) => {
  await loginPage.login(users.admin.email, users.admin.password);
  await setLanguage('pt');
  await ordersPage.visit();

  const headers = page.getByRole('table', { name: 'Pedidos da loja' }).getByRole('columnheader');
  await expect(headers.getByText('Cliente', { exact: true })).toBeVisible();
  await expect(headers.getByText('Itens', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText(/^\d+ pedidos?$/)).toBeVisible();
});
