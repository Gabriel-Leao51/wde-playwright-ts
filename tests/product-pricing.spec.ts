import { expect, test } from '../fixtures';

const productTitleEn = 'Red and Black Gaming Chair';
// The catalog and detail pages localize the product title itself (see language-selector.spec.ts),
// so the pt-language test below has to look the item up by its Portuguese title.
const productTitlePt = 'Cadeira Gamer Vermelha e Preta';
const priceText = /^\$\d+\.\d{2}$/;

test.describe('product price formatting', () => {
  test('shows the price as a dollar sign with exactly two decimal places on the catalog and detail pages', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitCatalog();
    await expect(productsPage.item(productTitleEn).getByText(priceText)).toHaveText('$249.99');

    await productsPage.openDetails(productTitleEn);
    // The product's own price comes first; related products further down have prices too.
    await expect(page.getByRole('main').getByText(priceText).first()).toHaveText('$249.99');
  });

  test('formats the price the same way regardless of the storefront language', async ({
    setLanguage,
    productsPage,
  }) => {
    await setLanguage('pt');
    await productsPage.visitCatalog();

    await expect(productsPage.item(productTitlePt).getByText(priceText)).toHaveText('$249.99');
  });
});
