import { expect, test } from '../fixtures';

const DEPARTMENTS = ['Electronics', 'Gaming', 'Furniture', 'Office', 'Home', 'Sports'] as const;
const FEATURED = [
  'Wireless Over-Ear Headphones',
  'Red and Black Gaming Chair',
  'Standing Desk',
  'Robot Vacuum Cleaner',
];

test.describe('home page', () => {
  test('shows the hero with a call to action that opens the catalog', async ({
    page,
    homePage,
  }) => {
    await homePage.visit();

    await expect(homePage.heading).toHaveText('Everything for your home, desk and game night');
    await homePage.heroCta.click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('heading', { name: 'All Products', level: 1 })).toBeVisible();
  });

  test('shows one tile per department', async ({ homePage }) => {
    await homePage.visit();

    for (const department of DEPARTMENTS) {
      await expect(homePage.departmentTile(department)).toBeVisible();
    }
    await expect(homePage.departmentsSection.getByRole('link')).toHaveCount(DEPARTMENTS.length);
  });

  test('a department tile opens the catalog filtered to that department', async ({
    page,
    homePage,
    productsPage,
  }) => {
    await homePage.visit();
    await homePage.departmentTile('Sports').click();

    await expect(page).toHaveURL(/\/products\?department=Sports$/);
    await expect(productsPage.departmentSelect).toHaveValue('Sports');
    await expect(productsPage.item('Yoga Mat and Cork Blocks')).toBeVisible();
    await expect(productsPage.item('Standing Desk')).toHaveCount(0);
  });

  test('lists the featured products with their prices', async ({ homePage, productsPage }) => {
    await homePage.visit();

    await expect(homePage.featuredItems).toHaveCount(FEATURED.length);
    for (const title of FEATURED) {
      await expect(productsPage.item(title)).toBeVisible();
    }
    await expect(productsPage.item('Red and Black Gaming Chair')).toContainText('$249.99');
  });

  test('a featured product opens its details page', async ({ page, productsPage, homePage }) => {
    await homePage.visit();
    await productsPage.viewDetailsLink('Red and Black Gaming Chair').click();

    await expect(page).toHaveURL(/\/products\/000000000000000000000001$/);
    await expect(
      page.getByRole('heading', { name: 'Red and Black Gaming Chair', level: 1 }),
    ).toBeVisible();
  });

  test('"View all products" opens the catalog', async ({ page, homePage }) => {
    await homePage.visit();
    await homePage.viewAllLink.click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test('the header logo and the Shop link go to different places', async ({ page, header }) => {
    await page.goto('/products');

    await header.logo.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Everything for your');
  });

  test('is translated when the language is Portuguese', async ({
    page,
    setLanguage,
    homePage,
    footer,
  }) => {
    await setLanguage('pt');
    await homePage.visit();

    await expect(homePage.heading).toHaveText('Tudo para sua casa, sua mesa e sua noite de jogos');
    await expect(page.getByRole('main').getByRole('link', { name: 'Eletrônicos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver todos os produtos' })).toBeVisible();
    await expect(footer.root.getByRole('link', { name: 'Créditos das fotos' })).toBeVisible();
  });
});

test.describe('footer', () => {
  for (const path of ['/', '/products', '/login', '/cart']) {
    test(`appears on ${path} with the tagline and department links`, async ({ page, footer }) => {
      await page.goto(path);

      await expect(footer.root).toBeVisible();
      await expect(footer.tagline).toBeVisible();
      for (const department of DEPARTMENTS) {
        await expect(footer.departmentLink(department)).toBeVisible();
      }
    });
  }

  test('a department link filters the catalog', async ({ page, footer, productsPage }) => {
    await page.goto('/login');
    await footer.departmentLink('Gaming').click();

    await expect(page).toHaveURL(/\/products\?department=Gaming$/);
    await expect(productsPage.item('Mechanical Keyboard')).toBeVisible();
  });

  test('the "All products" link opens the catalog', async ({ page, footer }) => {
    await page.goto('/login');
    await footer.departmentNav.getByRole('link', { name: 'All products' }).click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test('the photo credits page names a photographer for every product photo', async ({
    page,
    footer,
  }) => {
    await page.goto('/');
    await footer.photoCreditsLink.click();

    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByRole('heading', { name: 'Photo credits', level: 1 })).toBeVisible();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(24);
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Wireless Over Ear Headphones' }),
    ).toHaveAttribute('href', /unsplash\.com/);
  });

  test.describe('as admin', () => {
    test.use({ loggedInAs: 'admin' });

    test('has no shop navigation, only the legal row', async ({ page, footer }) => {
      await page.goto('/admin/products');

      await expect(footer.root).toBeVisible();
      await expect(footer.departmentNav).toBeHidden();
      await expect(footer.photoCreditsLink).toBeVisible();
    });
  });
});
