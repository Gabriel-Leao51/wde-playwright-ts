import type { Locator, Page } from '@playwright/test';

export type OrderStatus = 'Pending' | 'Fulfilled' | 'Cancelled';

/** Admin order table at /admin/orders. Rows are looked up by order id. */
export class OrdersPage {
  readonly manageOrdersLink: Locator;

  constructor(readonly page: Page) {
    this.manageOrdersLink = page.getByRole('banner').getByRole('link', { name: 'Manage Orders' });
  }

  async visit(): Promise<void> {
    await this.page.goto('/admin/orders');
  }

  /** Waits for `load`, not just the URL: the Update buttons are wired up by a deferred script. */
  async openFromHeader(): Promise<void> {
    await this.manageOrdersLink.click();
    await this.page.waitForURL('**/admin/orders');
  }

  row(orderId: string): Locator {
    return this.page.getByRole('row').filter({
      // The order id only exists in the row's hidden form input; nothing visible identifies an order.
      has: this.page.locator(`input[name="orderid"][value="${orderId}"]`),
    });
  }

  /** The row's status badge showing `status`; `toBeVisible()` on it asserts the status. */
  statusCell(orderId: string, status: OrderStatus): Locator {
    return this.row(orderId).getByRole('cell', { name: status.toUpperCase(), exact: true });
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const row = this.row(orderId);
    await row.getByRole('combobox').selectOption({ label: status });
    const response = this.page.waitForResponse(`**/admin/orders/${orderId}`);
    await row.getByRole('button', { name: 'Update' }).click();
    await response;
  }
}
