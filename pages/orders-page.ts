import type { Locator, Page } from '@playwright/test';

export type OrderStatus = 'Pending' | 'Fulfilled' | 'Cancelled';

/** Admin order table at /admin/orders. Rows are looked up by order id. */
export class OrdersPage {
  readonly manageOrdersLink: Locator;
  readonly customerOrdersLink: Locator;
  /** The customer's own invoice link; `.first()` matches the Python suite's intent of "my order". */
  readonly downloadInvoiceLink: Locator;

  constructor(readonly page: Page) {
    this.manageOrdersLink = page.getByRole('banner').getByRole('link', { name: 'Manage Orders' });
    this.customerOrdersLink = page
      .getByRole('banner')
      .getByRole('link', { name: 'Orders', exact: true });
    this.downloadInvoiceLink = page.getByRole('link', { name: 'Download Invoice' }).first();
  }

  async visit(): Promise<void> {
    await this.page.goto('/admin/orders');
  }

  /** Waits for `load`, not just the URL: the Update buttons are wired up by a deferred script. */
  async openFromHeader(): Promise<void> {
    await this.manageOrdersLink.click();
    await this.page.waitForURL('**/admin/orders');
  }

  async openFromCustomerNav(): Promise<void> {
    await this.customerOrdersLink.click();
    await this.page.waitForURL('**/orders');
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

  columnHeader(label: string): Locator {
    return this.page.getByRole('columnheader', { name: label });
  }

  /** Every order row, identified by its "Update" button (the header row has none). */
  private orderRows(): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('button', { name: 'Update' }) });
  }

  /**
   * The status text of every order row, top to bottom, for asserting sort order after clicking
   * `columnHeader('Status')`. Read by position (5th cell) since the status badge itself has no
   * accessible name to filter by - unlike `statusCell`, this doesn't know the status in advance.
   */
  async statusValues(): Promise<string[]> {
    const rows = await this.orderRows().all();
    const values: string[] = [];
    for (const row of rows) {
      values.push((await row.getByRole('cell').nth(4).innerText()).trim());
    }
    return values;
  }
}
