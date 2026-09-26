import { productTitlesInDepartment } from '../lib/mongo';
import { expect, test } from '../fixtures';

type Order = 'ascending' | 'descending';

/** Sort `values` and, for a descending order, reverse the result - kept outside the test bodies
 * below since eslint-plugin-playwright forbids conditionals inside a `test()` callback. */
function sortForOrder<T>(values: T[], order: Order, compare: (a: T, b: T) => number): T[] {
  const sorted = [...values].sort(compare);
  return order === 'ascending' ? sorted : sorted.reverse();
}

test.describe('catalog filter and sort', () => {
  test('filters the catalog by department', async ({ productsPage }) => {
    const expectedTitles = await productTitlesInDepartment('Sports');

    await productsPage.visitCatalogFilteredByDepartment('Sports');

    expect((await productsPage.listedTitles()).sort()).toEqual(expectedTitles);
  });

  for (const { sort, order } of [
    { sort: 'name_asc', order: 'ascending' },
    { sort: 'name_desc', order: 'descending' },
  ] as const) {
    test(`sorts the catalog by name (${sort})`, async ({ productsPage }) => {
      await productsPage.visitCatalogSortedBy(sort);

      const titles = await productsPage.listedTitles();

      // Plain codepoint comparison, not `localeCompare`: the server sorts case-sensitively
      // (uppercase before lowercase), matching Mongo's default collation.
      expect(titles).toEqual(sortForOrder(titles, order, (a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    });
  }

  for (const { sort, order } of [
    { sort: 'price_asc', order: 'ascending' },
    { sort: 'price_desc', order: 'descending' },
  ] as const) {
    test(`sorts the catalog by price (${sort})`, async ({ productsPage }) => {
      await productsPage.visitCatalogSortedBy(sort);

      const prices = await productsPage.listedPrices();

      expect(prices).toEqual(sortForOrder(prices, order, (a, b) => a - b));
    });
  }

  test('ignores an unrecognized sort value instead of breaking the page', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitCatalogSortedBy('not_a_real_sort');

    await expect(page.getByRole('heading', { name: 'All Products', level: 1 })).toBeVisible();
    await expect(productsPage.items.first()).toBeVisible();
  });

  test('filters the catalog via the department dropdown', async ({ productsPage }) => {
    const expectedTitles = await productTitlesInDepartment('Sports');

    await productsPage.visitCatalog();
    await productsPage.filterByDepartment('Sports');

    expect((await productsPage.listedTitles()).sort()).toEqual(expectedTitles);
  });

  test('sorts the catalog via the sort dropdown', async ({ productsPage }) => {
    await productsPage.visitCatalog();
    await productsPage.sortByOption('Price: Low to High');

    const prices = await productsPage.listedPrices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('live search suggests matching products as I type', async ({ productsPage }) => {
    await productsPage.visitCatalog();

    await productsPage.searchInput.fill('chair');

    await expect(productsPage.searchSuggestion('GTRACING - Black Gaming Chair')).toBeVisible();
    await expect(productsPage.searchSuggestion('Ergonomic Office Chair')).toBeVisible();
  });

  test('selecting a search suggestion navigates to that product', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitCatalog();
    await productsPage.searchInput.fill('chair');

    await productsPage.searchSuggestion('Ergonomic Office Chair').click();

    await expect(
      page.getByRole('heading', { name: 'Ergonomic Office Chair', level: 1 }),
    ).toBeVisible();
  });

  test('the search API returns matching products as JSON', async ({ request }) => {
    const response = await request.get('/api/products/search?q=yoga');
    const body = (await response.json()) as { results: { title: string }[] };

    expect(body.results.map((product) => product.title)).toContain('Yoga Mat');
  });
});
