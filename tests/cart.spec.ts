import { expect, test } from '../fixtures';
import { users } from '../test-data';

const productTitle = 'Red and Black Gaming Chair';
const productPrice = 249.99;

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
