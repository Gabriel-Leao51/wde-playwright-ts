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

// Regression test for BUG-SEC-002 (fixed): app.js now installs helmet and disables
// `x-powered-by`. Before, every response leaked the Express fingerprint and shipped with none of
// the standard hardening headers.
test('the app responds with standard security headers', async ({ request }) => {

  const response = await request.get('/products');
  const headers = response.headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBeTruthy();
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers['x-powered-by']).toBeUndefined();
});

test.describe('csrf token exposure', () => {
  test.use({ loggedInAs: 'admin' });

  // Regression test for BUG-SEC-003 (fixed): the product form used to render
  // `action="<%= submitPath %>?_csrf=..."`, putting the CSRF token in the URL (and so in server
  // logs, browser history and the Referer header). It is now a hidden input in the body.
  test('the CSRF token is not exposed in the product form URL', async ({ page, productsPage }) => {

    await page.goto('/admin/products/new');

    const action = await productsPage.productForm.getAttribute('action');
    expect(action ?? '').not.toContain('_csrf');
  });
});

// Regression test for BUG-SEC-004 (fixed): `connect.sid` used to ship with neither `secure` nor an
// explicit `sameSite`. It is now HttpOnly, SameSite=Lax and Secure whenever the request arrived
// over HTTPS (`secure: 'auto'`), so the Secure half can only be asserted against an https URL.
test('the session cookie has the Secure and SameSite flags configured', async ({
  request,
  baseURL,
}) => {
  const response = await request.get('/login');

  // Read the Set-Cookie header rather than the browser's cookie jar: WebKit on Windows reports
  // every SameSite value as "None".
  const sessionCookie = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value)
    .find((value) => value.startsWith('connect.sid='));
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie).toMatch(/;\s*HttpOnly/i);
  expect(sessionCookie).toMatch(/;\s*SameSite=(Lax|Strict)/i);
  if (baseURL?.startsWith('https://')) {
    expect(sessionCookie).toMatch(/;\s*Secure/i);
  }
});

// Regression test for BUG-INFO-001 (fixed): a CSRF-rejected `POST /cart/items` used to crash
// rendering its own error page (the nav partial dereferenced an undefined `locals.cart`), and that
// second throw fell through to Express's verbose dev-mode handler, leaking filesystem paths and a
// stack trace. The partial is now null-safe and the app image runs with NODE_ENV=production.
test('internal errors do not expose server filesystem paths or source code', async ({
  request,
}) => {

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

// The literal that used to be hardcoded in wde/config/session.js (BUG-SEC-005). A real attacker
// would have learned it by reading the source; the test replays it to prove it no longer works.
const HARDCODED_SESSION_SECRET = 'super-secret';

// Regression test for BUG-SEC-005 (fixed): config/session.js used to hardcode the express-session
// `secret`, so anyone who read the source could sign their own session id and mint a cookie the
// server accepted as an already-authenticated admin session. The secret now comes from
// SESSION_SECRET (or a random per-process value), so a cookie signed with the old literal is
// rejected.
test('a session cookie forged with the hardcoded secret does not grant access', async ({
  playwright,
  baseURL,
}) => {

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
