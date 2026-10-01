import { expect, test } from '../fixtures';

const productId = '000000000000000000000001';
const productTitle = 'Red and Black Gaming Chair';
// The other seed products in the Gaming department (product-crud only touches Office).
const relatedTitles = ['Mechanical Keyboard', 'Wireless Gaming Mouse', 'Gaming Headset'];

test.describe('product details page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/products/${productId}`);
  });

  test('shows the photo, title, price and summary', async ({ page }) => {
    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { name: productTitle, level: 1 })).toBeVisible();
    await expect(main.getByText('$249.99', { exact: true })).toBeVisible();
    await expect(main.getByText('Comfortable racing-style gaming chair')).toBeVisible();

    const image = main.getByRole('img', { name: productTitle, exact: true });
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeCloseTo(box?.height ?? 0, 0);
  });

  test('breadcrumbs lead back to the home page and the department', async ({
    page,
    productsPage,
  }) => {
    const { breadcrumbs } = productsPage;

    await expect(breadcrumbs.getByRole('link')).toHaveText(['Home', 'Gaming']);
    await expect(breadcrumbs.getByText(productTitle)).toHaveAttribute('aria-current', 'page');

    await breadcrumbs.getByRole('link', { name: 'Gaming' }).click();
    await expect(page).toHaveURL(/\/products\?department=Gaming$/);
    await expect(page.getByRole('main').getByRole('status')).toHaveText('4 products');
  });

  test('lists other products from the same department as related products', async ({
    productsPage,
  }) => {
    const { relatedProducts } = productsPage;

    await expect(relatedProducts.getByRole('heading', { level: 2 }).first()).toBeVisible();
    await expect(relatedProducts.getByRole('article')).toHaveCount(relatedTitles.length);
    for (const title of relatedTitles) {
      await expect(
        relatedProducts.getByRole('heading', { name: title, exact: true }),
      ).toBeVisible();
    }
    await expect(relatedProducts.getByRole('heading', { name: productTitle })).toBeHidden();
  });

  test('a related product opens its own details page', async ({ page, productsPage }) => {
    await productsPage.relatedProducts.getByRole('article').first().click();

    await expect(page).not.toHaveURL(new RegExp(`${productId}$`));
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).not.toHaveText(
      productTitle,
    );
  });

  test('breadcrumbs, related heading and department are translated to Portuguese', async ({
    page,
    setLanguage,
  }) => {
    await setLanguage('pt');
    await page.goto(`/products/${productId}`);

    await expect(
      page.getByRole('navigation', { name: 'Trilha de navegação' }).getByRole('link'),
    ).toHaveText(['Início', 'Games']);
    await expect(page.getByRole('button', { name: 'Adicionar ao Carrinho' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Produtos relacionados' })).toBeVisible();
  });

  test('is a single column on a phone viewport, photo above the buying panel', async ({
    page,
    productsPage,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/products/${productId}`);

    const image = await page
      .getByRole('main')
      .getByRole('img', { name: productTitle, exact: true })
      .boundingBox();
    const button = await productsPage.addToCartButton.boundingBox();
    expect(image).not.toBeNull();
    expect(button).not.toBeNull();
    expect(button?.y ?? 0).toBeGreaterThan((image?.y ?? 0) + (image?.height ?? 0));
  });
});
