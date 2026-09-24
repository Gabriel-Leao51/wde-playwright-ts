import type { Locator, Page } from '@playwright/test';

/** Shopping cart at /cart. Items are looked up by product title. */
export class CartPage {
  readonly buyProductsButton: Locator;
  /** The "Total: $x.xx" line. */
  readonly total: Locator;
  /** Placeholder a removed item shows for ~2s before its row disappears. */
  readonly itemRemovedMessage: Locator;

  constructor(readonly page: Page) {
    const main = page.getByRole('main');
    this.buyProductsButton = main.getByRole('button', { name: 'Buy Products' });
    this.total = main.getByText(/^Total: \$/);
    this.itemRemovedMessage = main.getByText('Item removed', { exact: true });
  }

  async visit(): Promise<void> {
    await this.page.goto('/cart');
  }

  item(productTitle: string): Locator {
    return this.page
      .getByRole('main')
      .getByRole('article')
      .filter({
        has: this.page.getByRole('heading', { name: productTitle, level: 2, exact: true }),
      });
  }

  /**
   * The item's quantity, located by its exact text since the counter has no role or label;
   * `toBeVisible()` on it asserts the quantity.
   */
  quantity(productTitle: string, quantity: number): Locator {
    return this.item(productTitle).getByText(String(quantity), { exact: true });
  }

  decreaseButton(productTitle: string): Locator {
    return this.item(productTitle).getByRole('button', { name: 'Decrease quantity' });
  }

  increaseButton(productTitle: string): Locator {
    return this.item(productTitle).getByRole('button', { name: 'Increase quantity' });
  }

  removeButton(productTitle: string): Locator {
    return this.item(productTitle).getByRole('button', { name: 'Remove item' });
  }
}
