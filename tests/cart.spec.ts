import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import type { ProductsPage } from '../pages/products-page';
import { users } from '../test-data';

const productTitle = 'Red and Black Gaming Chair';
const productPrice = 249.99;

/** Adds the seed chair to the logged-in customer's cart and waits for it to land in the session. */
async function addChairToCart(page: Page, productsPage: ProductsPage): Promise<void> {
  await productsPage.visitCatalog();
  await productsPage.openDetails(productTitle);
  await productsPage.addToCartButton.click();
  // Adding to cart is an async fetch; wait for its confirmation toast before moving on, or the
  // cart page can load before the item actually lands in the session (seen flaking).
  await expect(page.getByText('Added to cart!', { exact: true })).toBeVisible();
}

test.describe('cart quantity and removal', () => {
  // Changing quantity or removing an item mutates the shared customer session (see ROADMAP.md's
  // session 2 decision) - log in fresh instead of `loggedInAs: 'customer'`.

  test.beforeEach(async ({ page, loginPage, productsPage }) => {
    await loginPage.login(users.customer.email, users.customer.password);
    await productsPage.visitCatalog();
    await productsPage.openDetails(productTitle);
    await productsPage.addToCartButton.click();
    // Adding to cart is an async fetch; wait for its confirmation toast before moving on, or the
    // cart page below can load before the item actually lands in the session (seen flaking).
    await expect(page.getByText('Added to cart!', { exact: true })).toBeVisible();
  });

  test('increasing the quantity updates the count and the total', async ({ cartPage }) => {
    await cartPage.visit();

    await cartPage.increaseButton(productTitle).click();

    await expect(cartPage.quantity(productTitle, 2)).toBeVisible();
    await expect(cartPage.total).toHaveText(`Total: $${(productPrice * 2).toFixed(2)}`);
  });

  test('the decrease button is disabled once the quantity reaches 1', async ({ cartPage }) => {
    await cartPage.visit();

    await expect(cartPage.decreaseButton(productTitle)).toBeDisabled();
  });

  test('removing an item shows a message before it disappears from the cart', async ({
    cartPage,
  }) => {
    await cartPage.visit();

    await cartPage.removeButton(productTitle).click();

    await expect(cartPage.itemRemovedMessage).toBeVisible();
    await expect(cartPage.item(productTitle)).toBeHidden();
    await expect(cartPage.itemRemovedMessage).toBeHidden({ timeout: 4000 });
  });
});

test.describe('cart layout', () => {
  test('an empty cart shows an empty state with a way back to the catalog', async ({
    cartPage,
    page,
  }) => {
    await cartPage.visit();

    await expect(cartPage.emptyHeading).toBeVisible();
    await expect(cartPage.summary).toBeHidden();
    await cartPage.continueShoppingLink.click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test.describe('with an item', () => {
    test.beforeEach(async ({ page, loginPage, productsPage }) => {
      await loginPage.login(users.customer.email, users.customer.password);
      await addChairToCart(page, productsPage);
    });

    test('shows a square thumbnail and a title that links to the product', async ({
      cartPage,
      page,
    }) => {
      await cartPage.visit();

      const box = await cartPage.thumbnail(productTitle).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width).toBeCloseTo(box?.height ?? 0, 0);

      await cartPage.titleLink(productTitle).click();
      await expect(page).toHaveURL(/\/products\/[0-9a-f]{24}$/);
    });

    test('the order summary tracks the item count and total, and holds the buy button', async ({
      cartPage,
    }) => {
      await cartPage.visit();

      await expect(cartPage.summary).toBeVisible();
      await expect(cartPage.summaryItems).toHaveText('Items: 1');
      await expect(cartPage.total).toHaveText(`Total: $${productPrice.toFixed(2)}`);
      await expect(cartPage.summary.getByRole('button', { name: 'Buy Products' })).toBeVisible();

      await cartPage.increaseButton(productTitle).click();

      await expect(cartPage.summaryItems).toHaveText('Items: 2');
      await expect(cartPage.total).toHaveText(`Total: $${(productPrice * 2).toFixed(2)}`);
    });

    test('removing the last item swaps the cart for the empty state', async ({ cartPage }) => {
      await cartPage.visit();

      await cartPage.removeButton(productTitle).click();

      await expect(cartPage.emptyHeading).toBeVisible();
      await expect(cartPage.summary).toBeHidden();
    });

    test('the summary sits beside the items on desktop and below them on a phone', async ({
      cartPage,
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await cartPage.visit();
      const item = await cartPage.item(productTitle).boundingBox();
      const summary = await cartPage.summary.boundingBox();
      expect(summary?.x).toBeGreaterThan((item?.x ?? 0) + (item?.width ?? 0));

      await page.setViewportSize({ width: 375, height: 800 });
      const phoneItem = await cartPage.item(productTitle).boundingBox();
      const phoneSummary = await cartPage.summary.boundingBox();
      expect(phoneSummary?.y).toBeGreaterThan((phoneItem?.y ?? 0) + (phoneItem?.height ?? 0));
    });

    test('shows Portuguese labels', async ({ cartPage, page, setLanguage }) => {
      await setLanguage('pt');
      await cartPage.visit();

      await expect(page.getByRole('complementary', { name: 'Resumo do pedido' })).toBeVisible();
      await expect(page.getByText('Itens: 1', { exact: true })).toBeVisible();
    });
  });
});
