import { productTitlesInDepartment } from '../lib/mongo';
import { expect, test } from '../fixtures';

test.describe('catalog filter sidebar, result count and empty state', () => {
  test('the filters live in a labelled sidebar next to the results on desktop', async ({
    page,
    productsPage,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await productsPage.visitCatalog();

    const sidebar = page.getByRole('complementary', { name: 'Filters' });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByLabel('Department')).toBeVisible();
    await expect(sidebar.getByLabel('Sort by')).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const cardBox = await productsPage.items.first().boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect((sidebarBox?.x ?? 0) + (sidebarBox?.width ?? 0)).toBeLessThanOrEqual(cardBox?.x ?? 0);
  });

  test('the sidebar stacks above the results on a phone viewport', async ({
    page,
    productsPage,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await productsPage.visitCatalog();

    const sidebarBox = await page.getByRole('complementary', { name: 'Filters' }).boundingBox();
    const cardBox = await productsPage.items.first().boundingBox();
    expect((sidebarBox?.y ?? 0) + (sidebarBox?.height ?? 0)).toBeLessThanOrEqual(cardBox?.y ?? 0);
  });

  test('the result count matches the number of listed products', async ({ productsPage }) => {
    await productsPage.visitCatalog();

    const listed = await productsPage.items.count();
    await expect(productsPage.resultCount).toHaveText(`${String(listed)} products`);
  });

  test('the result count follows the department filter', async ({ productsPage }) => {
    const expected = await productTitlesInDepartment('Sports');

    await productsPage.visitCatalogFilteredByDepartment('Sports');

    await expect(productsPage.resultCount).toHaveText(`${String(expected.length)} products`);
  });

  test('clear filters appears only while a filter is active and resets the catalog', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitCatalog();
    await expect(productsPage.clearFiltersLink).toBeHidden();
    const total = await productsPage.items.count();

    await productsPage.visitCatalogFilteredByDepartment('Sports');
    await productsPage.clearFiltersLink.click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(productsPage.items).toHaveCount(total);
  });

  test('an unknown department shows an empty state with a way back', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitCatalogFilteredByDepartment('Nonexistent');

    await expect(productsPage.resultCount).toHaveText('0 products');
    await expect(productsPage.items).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();

    await page.getByRole('link', { name: 'Browse all products' }).click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(productsPage.items.first()).toBeVisible();
  });

  test('the sidebar and result count are translated to Portuguese', async ({
    page,
    productsPage,
    setLanguage,
  }) => {
    await setLanguage('pt');
    await productsPage.visitCatalog();

    await expect(page.getByRole('complementary', { name: 'Filtros' })).toBeVisible();
    await expect(productsPage.resultCount).toContainText('produtos');
  });
});
