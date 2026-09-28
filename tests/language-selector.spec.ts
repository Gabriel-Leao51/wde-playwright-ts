import { expect, test } from '../fixtures';

test.describe('language selector', () => {
  for (const { languageCode, shopLabel, catalogHeading } of [
    { languageCode: 'en', shopLabel: 'Shop', catalogHeading: 'All Products' },
    { languageCode: 'pt', shopLabel: 'Loja', catalogHeading: 'Todos os Produtos' },
  ] as const) {
    test(`switching the language to ${languageCode} updates visible text`, async ({
      page,
      productsPage,
    }) => {
      await productsPage.visitCatalog();

      const nav = page.getByRole('banner');
      await nav.getByRole('button', { name: 'Language' }).click();
      // A real link navigation (GET /lang/:code redirects back to the referring page), not an
      // SPA update - the web-first assertions below poll through that reload on their own.
      await nav.getByRole('link', { name: languageCode.toUpperCase(), exact: true }).click();

      await expect(nav.getByRole('link', { name: shopLabel, exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: catalogHeading, level: 1 })).toBeVisible();
    });
  }

  test('localizes product catalog content, not just navigation chrome', async ({
    page,
    setLanguage,
  }) => {
    await setLanguage('pt');

    await page.goto('/products/000000000000000000000001');

    await expect(
      page.getByRole('heading', { name: 'Cadeira Gamer Vermelha e Preta', level: 1 }),
    ).toBeVisible();
  });

  test('the language menu opens on trigger click and closes on trigger click or Escape', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitCatalog();

    const nav = page.getByRole('banner');
    const trigger = nav.getByRole('button', { name: 'Language' });
    const menu = nav.getByRole('link', { name: 'PT', exact: true });

    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await trigger.click();
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(menu).toBeVisible();
    // The Escape handler relies on focus being inside the switcher to catch the bubbled keydown;
    // WebKit, unlike Chromium/Firefox, doesn't focus a button on click, so focus it explicitly.
    await trigger.focus();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
