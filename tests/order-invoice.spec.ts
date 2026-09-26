import { statSync } from 'node:fs';

import { expect, test } from '../fixtures';

test.describe('order invoice download', () => {
  test.use({ loggedInAs: 'customer' });

  test("downloads a PDF invoice for the customer's order", async ({ page, ordersPage }) => {
    await page.goto('/');
    await ordersPage.openFromCustomerNav();
    await expect(ordersPage.downloadInvoiceLink).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await ordersPage.downloadInvoiceLink.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(statSync(path).size).toBeGreaterThan(0);
  });

  test('requesting a non-existent order id returns 404 instead of a server error', async ({
    request,
  }) => {
    const response = await request.get('/orders/000000000000000000000099/invoice.pdf');

    expect(response.status()).toBe(404);
  });
});
