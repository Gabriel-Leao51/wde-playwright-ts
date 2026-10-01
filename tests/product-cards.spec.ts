import { expect, test } from '../fixtures';

const productTitle = 'Red and Black Gaming Chair';

test.describe('product cards and grid', () => {
  test('each card shows a square photo, the title, the price and a details link', async ({
    productsPage,
  }) => {
    await productsPage.visitCatalog();
    const card = productsPage.item(productTitle);

    await expect(productsPage.itemImage(productTitle)).toBeVisible();
    await expect(card.getByText('$249.99')).toBeVisible();
    await expect(productsPage.viewDetailsLink(productTitle)).toBeVisible();

    const box = await productsPage.itemImage(productTitle).boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeCloseTo(box?.height ?? 0, 0);
  });

  test('clicking anywhere on a card opens the product', async ({ page, productsPage }) => {
    await productsPage.visitCatalog();
    await productsPage.item(productTitle).click();

    await expect(page).toHaveURL(/\/products\/000000000000000000000001$/);
  });

  test('the grid has several columns on a desktop viewport', async ({ page, productsPage }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await productsPage.visitCatalog();
    await expect(productsPage.items.first()).toBeVisible();

    const lefts = await productsPage.items.evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBeGreaterThanOrEqual(3);
  });

  test('the grid collapses to a single column on a phone viewport', async ({
    page,
    productsPage,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await productsPage.visitCatalog();
    await expect(productsPage.items.first()).toBeVisible();

    const lefts = await productsPage.items.evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBe(1);
  });

  test('cards in one row have the same height', async ({ page, productsPage }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await productsPage.visitCatalog();
    await expect(productsPage.items.first()).toBeVisible();

    const rows = await productsPage.items.evaluateAll((cards) =>
      cards.map((card) => {
        const { top, height } = card.getBoundingClientRect();
        return { top: Math.round(top), height: Math.round(height) };
      }),
    );
    const firstRow = rows.filter((row) => row.top === rows[0]?.top);
    expect(firstRow.length).toBeGreaterThan(1);
    expect(new Set(firstRow.map((row) => row.height)).size).toBe(1);
  });
});
