import { expect, test } from '../fixtures';
import { users } from '../test-data';

const chair = 'Red and Black Gaming Chair';
const PRODUCT_PAGE = '/products/000000000000000000000001';

test.describe('where an admin lands', () => {
  test('a customer still lands on the store home page', async ({ page, loginPage }) => {
    await loginPage.login(users.customer.email, users.customer.password);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Everything for your');
  });

  test('the logo takes an admin back to the dashboard, not the store', async ({
    page,
    header,
    loginPage,
  }) => {
    await loginPage.login(users.admin.email, users.admin.password);
    await page.goto('/products');
    await header.logo.click();

    await expect(page).toHaveURL(/\/admin\/products$/);
  });
});

test.describe('the store as an admin preview', () => {
  test.use({ loggedInAs: 'admin' });

  test('the sidebar opens the store, whose cards have no admin actions', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    await productsPage.viewStoreLink.click();
    await expect(page).toHaveURL(/\/$/);

    // The featured cards on the home page are the customer's: View Details, never Delete.
    await expect(page.getByRole('link', { name: 'View Details' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View & Edit' })).toHaveCount(0);
  });

  test('the catalog shows every product as a customer card', async ({ page, productsPage }) => {
    await productsPage.visitCatalog();

    await expect(productsPage.items).toHaveCount(24);
    await expect(page.getByRole('link', { name: 'View Details' })).toHaveCount(24);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View & Edit' })).toHaveCount(0);
  });

  test('a product page has no Add to Cart, since an admin has no cart', async ({
    page,
    productsPage,
  }) => {
    await page.goto(PRODUCT_PAGE);

    await expect(page.getByRole('heading', { name: chair, level: 1 })).toBeVisible();
    await expect(productsPage.addToCartButton).toHaveCount(0);
  });

  test('the header on the store keeps only the admin controls', async ({ page, header }) => {
    await page.goto('/products');

    await expect(header.root.getByRole('link', { name: 'Admin' })).toBeVisible();
    await expect(header.search).toHaveCount(0);
    await expect(header.cartLink).toHaveCount(0);
  });
});
