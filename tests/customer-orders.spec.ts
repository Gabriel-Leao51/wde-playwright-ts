import { expect, test } from '../fixtures';
import { orders, users } from '../test-data';

const { testOrderId } = orders.orderData;

test.describe('customer orders', () => {
  test.use({ loggedInAs: 'customer' });

  test.beforeEach(async ({ page, ordersPage }) => {
    await page.goto('/');
    await ordersPage.openFromCustomerNav();
  });

  test('an order card shows its reference, date, status, items and total', async ({
    ordersPage,
  }) => {
    const card = ordersPage.orderCard(testOrderId);

    await expect(card).toBeVisible();
    await expect(card.getByText(/^[A-Z][a-z]{2}, [A-Z][a-z]+ \d{1,2}, \d{4}$/)).toBeVisible();
    await expect(card.getByText(/^(PENDING|FULFILLED|CANCELLED)$/)).toBeVisible();
    await expect(card.getByRole('link', { name: 'Red and Black Gaming Chair' })).toBeVisible();
    await expect(card.getByText('$249.99 x 1')).toBeVisible();
    await expect(card.getByText('Total $249.99')).toBeVisible();
  });

  test('an order line shows the product photo and links to the product', async ({
    page,
    ordersPage,
  }) => {
    const card = ordersPage.orderCard(testOrderId);
    const photo = card.getByRole('img', { name: 'Red and Black Gaming Chair' });
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    await card.getByRole('link', { name: 'Red and Black Gaming Chair' }).click();
    await expect(page).toHaveURL(/\/products\/000000000000000000000001$/);
  });

  test('the status badge is colour-coded and the invoice link points at the order', async ({
    ordersPage,
  }) => {
    const card = ordersPage.orderCard(testOrderId);

    await expect(card.getByRole('link', { name: 'Download Invoice' })).toHaveAttribute(
      'href',
      `/orders/${testOrderId}/invoice.pdf`,
    );
    await expect(card.getByText(/^(PENDING|FULFILLED|CANCELLED)$/)).not.toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
  });

  test('on a phone the card fits the screen', async ({ page, ordersPage }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(ordersPage.orderCard(testOrderId)).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// Language lives in the shared server-side session, so this logs in fresh instead of loggedInAs.
test('the orders page is in Portuguese when the language is pt', async ({
  page,
  loginPage,
  ordersPage,
  setLanguage,
}) => {
  await loginPage.login(users.customer.email, users.customer.password);
  await setLanguage('pt');
  await page.goto('/orders');
  const card = ordersPage.orderCard(testOrderId);

  await expect(page.getByRole('heading', { name: 'Todos os Seus Pedidos' })).toBeVisible();
  await expect(card.getByText('Total $249.99')).toBeVisible();
  await expect(card.getByRole('link', { name: 'Baixar Fatura' })).toBeVisible();
});

// A brand-new account has no orders. It signs up with a unique email so reruns never collide.
test('a customer with no orders sees the empty state', async ({ page, loginPage }) => {
  const stamp = String(Date.now());
  const email = `no-orders-${stamp}@example.com`;
  const password = `Pw-${stamp}-test`;

  await page.goto('/signup');
  const main = page.getByRole('main');
  await main.getByLabel('E-Mail', { exact: true }).fill(email);
  await main.getByLabel('Confirm Email').fill(email);
  await main.getByLabel('Password').fill(password);
  await main.getByLabel('Full Name').fill('No Orders');
  await main.getByLabel('Street').fill('1 Test Street');
  await main.getByLabel('Postal Code').fill('12345');
  await main.getByLabel('City').fill('Testville');
  await main.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL('**/login');

  await loginPage.login(email, password);
  await page.goto('/orders');

  await expect(page.getByRole('heading', { name: 'No orders yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue shopping' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download Invoice' })).toHaveCount(0);
});
