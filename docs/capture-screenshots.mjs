// Captures the README screenshots from the running WDE stack (http://localhost:3000).
// Usage: node docs/capture-screenshots.mjs <outDir>
// Not a test: these are documentation images, not visual baselines, so they can be taken on any OS.
import { chromium, devices } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? 'docs/screenshots';
const base = process.env.WDE_BASE_URL ?? 'http://localhost:3000';
const users = JSON.parse(readFileSync('test-data/users.json', 'utf8'));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

async function login(page, role) {
  const { email, password } = users[role];
  await page.goto(`${base}/login`);
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/login') && r.request().method() === 'POST'),
    page.getByRole('main').getByRole('button', { name: 'Login' }).click(),
  ]);
  await page.waitForLoadState('load');
}

async function context(theme = 'light', options = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: theme,
    ...options,
  });
  return ctx;
}

async function shot(page, name, { fullPage = false } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage });
  console.log('saved', name);
}

// Guest pages
{
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  await shot(page, 'home', { fullPage: true });
  await page.goto(`${base}/products`);
  await shot(page, 'catalog');
  await page.goto(`${base}/products?department=Gaming`);
  const first = page.getByRole('link', { name: 'View Details' }).first();
  await first.click();
  await page.waitForLoadState('load');
  await shot(page, 'product-details');
  await ctx.close();
}

// Dark theme
{
  const ctx = await context('dark');
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  await shot(page, 'home-dark');
  await ctx.close();
}

// Customer: cart and orders
{
  const ctx = await context();
  const page = await ctx.newPage();
  await login(page, 'customer');
  await page.goto(`${base}/products`);
  await page.getByRole('link', { name: 'View Details' }).first().click();
  await page.waitForLoadState('load');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByText('Added to cart!').waitFor();
  await page.goto(`${base}/cart`);
  await shot(page, 'cart');
  await page.goto(`${base}/orders`);
  await shot(page, 'orders');
  await ctx.close();
}

// Admin
{
  const ctx = await context();
  const page = await ctx.newPage();
  await login(page, 'admin');
  await page.goto(`${base}/admin/products`);
  await shot(page, 'admin-products');
  await page.goto(`${base}/admin/orders`);
  await shot(page, 'admin-orders');
  await ctx.close();
}

// Phone
{
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  await shot(page, 'mobile-home');
  await page.getByRole('button', { name: 'Menu' }).click();
  await shot(page, 'mobile-menu');
  await ctx.close();
}

await browser.close();
