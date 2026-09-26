import { expect, test } from '../fixtures';
import { orders } from '../test-data';

test.describe('manage orders (admin)', () => {
  test.use({ loggedInAs: 'admin' });

  test('updates an order status and shows a success toast', async ({ page, ordersPage }) => {
    await page.goto('/');
    await ordersPage.openFromHeader();

    const orderId = orders.orderData.testOrderId;
    await ordersPage.updateStatus(orderId, 'Fulfilled');

    await expect(ordersPage.statusCell(orderId, 'Fulfilled')).toBeVisible();
    await expect(page.getByText('Order status updated!', { exact: true })).toBeVisible();
  });

  test('sorts the orders table by clicking the Status column header', async ({
    page,
    ordersPage,
  }) => {
    await page.goto('/');
    await ordersPage.openFromHeader();

    await ordersPage.columnHeader('Status').click();
    const ascending = await ordersPage.statusValues();
    expect(ascending).toEqual([...ascending].sort());

    await ordersPage.columnHeader('Status').click();
    const descending = await ordersPage.statusValues();
    expect(descending).toEqual([...descending].sort().reverse());
  });
});
