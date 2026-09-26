import crypto from 'node:crypto';

import type { APIRequestContext } from '@playwright/test';

import { deleteForgedSession, insertForgedAdminSession, userId } from '../lib/mongo';
import { expect, test } from '../fixtures';
import { users } from '../test-data';

/** GETs `path` and pulls the CSRF token out of its login/signup form. */
async function csrfToken(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  const html = await response.text();
  const match = /name="_csrf" value="([^"]*)"/.exec(html);
  const token = match?.[1];
  if (token === undefined) throw new Error(`No CSRF token found on ${path}`);
  return token;
}

test.describe('NoSQL injection hardening', () => {
  test('a NoSQL injection payload on login does not bypass authentication or crash the app', async ({
    request,
  }) => {
    const csrf = await csrfToken(request, '/login');

    const response = await request.post(`/login?_csrf=${csrf}`, {
      data: { email: { $ne: null }, password: { $ne: null } },
    });

    expect(await response.text()).toContain('Invalid credentials');
    expect((await request.get('/products')).status()).toBe(200);
  });

  test('a NoSQL injection payload on signup does not crash the app', async ({ request }) => {
    const csrf = await csrfToken(request, '/signup');

    await request.post(`/signup?_csrf=${csrf}`, {
      data: {
        email: { $ne: null },
        password: { $ne: null },
        'confirm-email': { $ne: null },
        fullname: 'x',
        street: 'x',
        postal: 'x',
        city: 'x',
      },
    });

    expect((await request.get('/products')).status()).toBe(200);
  });
});

// KNOWN BUG (BUG-SEC-002), ported from the frozen Python suite's @xfail scenario and re-verified
// live: app.js never installs helmet (or any manual res.setHeader) and never calls
// app.disable('x-powered-by'), so every response leaks the Express fingerprint and ships with
// none of the standard hardening headers.
test('the app responds with standard security headers', async ({ request }) => {
  test.fail(true, 'BUG-SEC-002');

  const response = await request.get('/products');
  const headers = response.headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBeTruthy();
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers['x-powered-by']).toBeUndefined();
});

test.describe('csrf token exposure', () => {
  test.use({ loggedInAs: 'admin' });

  // KNOWN BUG (BUG-SEC-003), re-verified live: views/admin/products/includes/product-form.ejs
  // renders `action="<%= submitPath %>?_csrf=<%= locals.csrfToken %>"`, putting the CSRF token in
  // the form's URL (and so in server logs, browser history and the Referer header) instead of a
  // hidden input field in the body, unlike e.g. the logout form.
  test('the CSRF token is not exposed in the product form URL', async ({ page, productsPage }) => {
    test.fail(true, 'BUG-SEC-003');

    await page.goto('/admin/products/new');

    const action = await productsPage.productForm.getAttribute('action');
    expect(action ?? '').not.toContain('_csrf');
  });
});

// KNOWN BUG (BUG-SEC-004), re-verified live: config/session.js's cookie config only sets
// `maxAge`, so `connect.sid` ships with neither `secure` nor an explicit `sameSite`.
test('the session cookie has the Secure and SameSite flags configured', async ({ page }) => {
  test.fail(true, 'BUG-SEC-004');

  await page.goto('/login');

  const sessionCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'connect.sid',
  );
  expect(sessionCookie?.secure).toBe(true);
  expect(['Strict', 'Lax']).toContain(sessionCookie?.sameSite);
});

// KNOWN BUG (BUG-INFO-001), re-verified live: POST /cart/items has no per-route CSRF exemption,
// so a request without a "_csrf" token is rejected by the global csurf() middleware (app.js) before
// cartMiddleware ever runs. The app's own error-handler template renders cleanly on its own, but
// it includes the shared nav partial, which dereferences `locals.cart.totalQuantity` - undefined
// here - so rendering the error page itself throws. That second, unhandled throw falls through to
// Express's own verbose dev-mode handler (NODE_ENV is never set to "production" in this stack),
// which leaks the server's filesystem paths and stack trace straight into the response body.
test('internal errors do not expose server filesystem paths or source code', async ({
  request,
}) => {
  test.fail(true, 'BUG-INFO-001');

  const response = await request.post('/cart/items', {
    data: { productId: '000000000000000000000001' },
  });
  const body = await response.text();

  expect(body).not.toContain('/usr/src/app');
  expect(body).not.toContain('node_modules');
});

/**
 * Replicates the `cookie-signature` npm package's `sign()` algorithm (see wde's
 * node_modules/cookie-signature/index.js): `<sid>.<base64-hmac-sha256>`, prefixed with
 * express-session's "s:" marker.
 */
function signSessionId(sessionId: string, secret: string): string {
  const mac = crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('base64')
    .replace(/=+$/, '');
  return `s:${sessionId}.${mac}`;
}

// Matches the literal value hardcoded in wde/config/session.js (BUG-SEC-005). A real attacker
// would learn this by reading the source, not by any request this suite makes - it's a
// source-level finding, exploited here to prove impact.
const HARDCODED_SESSION_SECRET = 'super-secret';

// KNOWN BUG (BUG-SEC-005), re-verified live: config/session.js hardcodes the express-session
// `secret` instead of reading it from the environment, so anyone who reads the source can sign
// their own session id and mint a cookie the server accepts as a real, already-authenticated
// admin session - without ever logging in.
test('a session cookie forged with the hardcoded secret does not grant access', async ({
  playwright,
  baseURL,
}) => {
  test.fail(true, 'BUG-SEC-005');

  const adminId = await userId(users.admin.email);
  const forgedSessionId = `forged-${crypto.randomUUID()}`;
  await insertForgedAdminSession(forgedSessionId, adminId);

  try {
    const cookie = encodeURIComponent(signSessionId(forgedSessionId, HARDCODED_SESSION_SECRET));
    // A brand-new, isolated request context - no ambient cookies from any other test - so the
    // only thing that could grant access here is the forged cookie itself.
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `connect.sid=${cookie}` },
    });
    try {
      const response = await context.get('/admin/products');
      expect(await response.text()).not.toContain('Manage Products');
    } finally {
      await context.dispose();
    }
  } finally {
    await deleteForgedSession(forgedSessionId);
  }
});
