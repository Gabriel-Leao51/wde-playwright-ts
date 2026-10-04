import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

/*
 * Every page keeps breathing room between the header and its first content, and between its last
 * content and the footer. Measured from the rendered boxes (the page's own extent inside <main>),
 * so a page that forgets the shared main padding, or doubles it, shows up here.
 */

/** The smallest gap that still reads as intentional, in CSS pixels; the shared padding is 32/48. */
const MIN_GAP = 24;
/** Doubled spacing (a page adding its own padding on top of main's) would be 64 or more. */
const MAX_GAP = 56;

interface Gaps {
  top: number;
  bottom: number;
}

async function pageGaps(page: Page): Promise<Gaps> {
  return page.evaluate(() => {
    const header = document.querySelector('body > header');
    const footer = document.querySelector('body > footer');
    const main = document.querySelector('main');
    if (!header || !footer || !main) throw new Error('page has no header, main or footer');

    let first = Infinity;
    let last = -Infinity;
    for (const element of main.querySelectorAll('*')) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      first = Math.min(first, box.top);
      last = Math.max(last, box.bottom);
    }
    return {
      top: first - header.getBoundingClientRect().bottom,
      bottom: footer.getBoundingClientRect().top - last,
    };
  });
}

function expectRoomy(gaps: Gaps, { flushTop = false }: { flushTop?: boolean } = {}): void {
  if (flushTop) {
    expect(gaps.top, 'full-bleed hero sits flush under the header').toBeLessThan(1);
  } else {
    expect(gaps.top, 'header to first content').toBeGreaterThanOrEqual(MIN_GAP);
    expect(gaps.top, 'header to first content').toBeLessThanOrEqual(MAX_GAP);
  }
  // Short pages stretch the footer to the bottom of the viewport, so only the minimum applies.
  expect(gaps.bottom, 'last content to footer').toBeGreaterThanOrEqual(MIN_GAP);
}

test.describe('guest pages', () => {
  const pages = [
    ['catalog', '/products'],
    ['catalog filtered', '/products?department=gaming'],
    ['product details', '/products/000000000000000000000001'],
    ['cart', '/cart'],
    ['login', '/login'],
    ['signup', '/signup'],
    ['OTP request', '/login/otp'],
    ['credits', '/credits'],
  ] as const;

  for (const [name, path] of pages) {
    test(name, async ({ page }) => {
      await page.goto(path);
      expectRoomy(await pageGaps(page));
    });
  }

  test('home page: the hero is flush under the header, the featured products clear the footer', async ({
    homePage,
    page,
  }) => {
    await homePage.visit();
    expectRoomy(await pageGaps(page), { flushTop: true });
  });
});

test.describe('customer pages', () => {
  test.use({ loggedInAs: 'customer' });

  for (const [name, path] of [
    ['orders', '/orders'],
    ['cart', '/cart'],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(path);
      expectRoomy(await pageGaps(page));
    });
  }
});

test.describe('admin pages', () => {
  test.use({ loggedInAs: 'admin' });

  for (const [name, path] of [
    ['products table', '/admin/products'],
    ['new product form', '/admin/products/new'],
    ['orders table', '/admin/orders'],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(path);
      expectRoomy(await pageGaps(page));
    });
  }
});
