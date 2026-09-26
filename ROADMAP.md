# WDE Shop — Playwright + TypeScript Roadmap

This repo replaces [`wde-test-automation`](https://github.com/Gabriel-Leao51/wde-test-automation), the Python/pytest-bdd suite for the [WDE Shop](https://github.com/Gabriel-Leao51/wde) app. The work has two goals:

1. **Port the test suite to Playwright Test + TypeScript**, reaching parity with the Python suite's 45 scenarios across 13 feature files.
2. **Redesign WDE so it looks like a real online store**, using this suite as the regression net.

Plan approved 2026-09-22. Cadence: **one 1-hour session per day**, about 6–7 weeks at 5 sessions a week.

## Decisions

- **Only the test suite moves to TypeScript.** The WDE app (Express/EJS) stays JavaScript. Converting the app is an optional later phase, not in scope.
- **No Gherkin here.** Use Playwright Test directly: `test.describe`, `test.step`, tags, fixtures, `storageState`. The archived Python repo keeps showing the BDD work; the README says so. Only add a `playwright-bdd` slice if target job postings start asking for Cucumber with TypeScript.
- **The Python suite is frozen.** No new tests go there. The planned cart, language-dropdown and price tests are written here (session 11). The Python repo gets archived on GitHub after parity (session 13).
- **Migrate first, redesign second.** Locators must be role/label-based (`getByRole`, `getByLabel`) from day one so they survive the new markup.
- **The redesign keeps vanilla CSS** (the app has no bundler): rebuilt design tokens, light theme, real licensed product photos (Unsplash/Pexels) instead of generated placeholders.
- **Check current versions** of Playwright and Node when scaffolding; don't rely on remembered version numbers.
- **TypeScript pinned to 6.0.x** (session 1): TypeScript 7.0 is the latest, but typescript-eslint 8.x supports only `<6.1.0`. Bump once its peer range allows.
- **Lint enforces the locator/wait policy**: `playwright/no-raw-locators`, `no-wait-for-timeout` and related rules are errors on every `.ts` file, not just specs.
- **Saved logins are shared sessions** (session 2): WDE keeps cart, language and auth in the server-side session, so every test using `loggedInAs` for a role shares one session. Read-only tests use it. Tests that change session state (cart, `setLanguage`, logout) log in fresh. Revisit with per-worker auth if that turns out too limiting in sessions 10–11.
- **Page objects hold locators and actions, not assertions** (session 3): tests assert with web-first `expect`. Actions that navigate to a page with deferred JS wait for `load` (`waitForURL`), and login submits wait for the POST response (`submitAndWait`). Both fixed real races found while probing. The 3 raw-locator exceptions (Quill editor, Quill bold button, rendered description) and the hidden-input order-row lookup mark markup to fix in Phase C. Locator names are English only.

## Session rules

- Each session is one small unit that ends green and committed.
- If it isn't green by minute 50, push the work in progress to a branch and add a line to the progress log saying where to resume.
- Start a fresh Claude session each day; the state lives in this file, `CLAUDE.md` and memory, not in a long-running conversation.
- **Model:** Sonnet by default. Switch to Opus for session 1, session 14, and any bug or flaky test that's still unsolved after about 20 minutes.
- **Redesign loop (Phase C):** change the page → run the suite → fix any broken locators → regenerate that page's visual baseline in the Linux Playwright Docker image → commit → check CI.
- **CI checks** use the GitHub REST API (`/actions/runs` matched by `head_sha`, then `/runs/<id>/jobs`), never the Actions web page.

## Session 0 — Kickoff setup (Opus)

- [x] `CLAUDE.md` in this repo: how to run the WDE stack (docker compose; ports 3000 app, 27017 Mongo, 8025/1025 Mailpit; seed reset), where test credentials live (never paste the values), locator and wait policy, visual baselines only from the Linux Docker image, CI via the raw API, pointer to this file. Keep it short.
- [x] `CLAUDE.md` in `wde`: the app-side equivalent.
- [x] Project skill `/session`: read this file, pick the next unchecked session, keep it to 1 hour, end green, commit, tick the box, verify CI.
- [x] Project skill `ci-check`: the raw-API CI procedure.

Later skills, written from real experience rather than upfront:

- `port-feature` (Python → TypeScript mapping: steps → inline test-body code, `xdist_group` → serial mode, `scenario_context` → a local variable, `@xfail` → `test.fail()`) — added after session 5; delete it after parity.
- `redesign-page` after session 16, once the design tokens exist.
- `visual-baselines` (Docker commands) when first needed.
- Consider installing the official `frontend-design` plugin before Phase C.

## Phase A — Foundation

- [x] **1.** Scaffold with `npm init playwright@latest`: strict TypeScript, ESLint + Prettier, `playwright.config.ts` with `baseURL` from env, chromium/firefox/webkit projects, trace on first retry. `git init`, create the GitHub repo, commit this file.
- [x] **2.** Typed test data, custom fixtures via `test.extend` (page objects, `setLanguage`), and an auth setup project using `storageState` so each role logs in once instead of in every test.
- [x] **3.** Port the 6 page objects, typed, with role/label-based locators.
- [x] **4.** GitHub Actions: WDE stack via docker compose, browser matrix, HTML report artifact. One smoke test green in CI.

## Phase B — Parity with the Python suite

- [x] **5.** Admin login, authentication, authorization (7 scenarios)
- [ ] **6.** Product CRUD (7). `test.describe.configure({ mode: 'serial' })` replaces the `xdist_group` hack.
- [ ] **7.** Catalog filter/sort (9), as data-driven tests
- [ ] **8.** Security hardening (7), using the `request` fixture for API-level checks
- [ ] **9.** Typed Mailpit client, OTP login (2), invoice download (2) via the `download` event
- [ ] **10.** Manage orders (2), Stripe purchase flow (1), toast notifications (1)
- [ ] **11.** Language selector (2), plus new tests for cart quantity/remove, the language dropdown, and product price formatting
- [ ] **12.** Visual regression with native `toHaveScreenshot`; baselines generated in the `mcr.microsoft.com/playwright` Linux image
- [ ] **13.** Parity check scenario by scenario, repeated runs on all 3 browsers to catch flakes, CI green. Archive the Python repo with a README pointer here.

## Phase C — Redesign WDE

- [ ] **14.** Design direction (Opus): 2–3 real stores as references; tokens for palette, type scale, spacing, radii, shadows; a self-hosted font. Optional mockups in a design canvas.
- [ ] **15.** Real product photos (licensed, square, WebP) and realistic seed names and prices
- [ ] **16.** Rewrite `base.css`: tokens, typography, buttons, inputs, badges
- [ ] **17.** Header: logo, search bar, account menu, cart icon with count, mobile nav
- [ ] **18.** Footer, plus a new home page (hero, department tiles, featured products) with new tests
- [ ] **19.** Product listing, part 1: product cards, grid
- [ ] **20.** Product listing, part 2: filter sidebar, result count, empty state
- [ ] **21.** Product details: breadcrumbs, image, price, add to cart, related products
- [ ] **22.** Cart: thumbnails, order summary panel, empty-cart state
- [ ] **23.** Login, signup and OTP pages: centred card forms, inline validation
- [ ] **24.** Customer orders: order history with status badges and invoice link
- [ ] **25.** Admin layout, part 1: sidebar shell, products table
- [ ] **26.** Admin layout, part 2: orders table
- [ ] **27.** Error pages, toast and modal polish
- [ ] **28.** Responsive pass, plus mobile device projects in Playwright (Pixel, iPhone)
- [ ] **29.** Accessibility scans with `@axe-core/playwright`
- [ ] **30.** Wrap-up: READMEs with screenshots, CI badges, a short "what I built and why" write-up

## Progress log

<!-- One line per session: date, session number, outcome, where to resume if unfinished. -->

- 2026-09-23, Session 0: done. Added `CLAUDE.md` to this repo and to `wde`, plus `/session` and `ci-check` project skills. This repo has no git history yet — Session 1 starts with `git init` and the GitHub repo creation per Phase A item 1.
- 2026-09-23, Session 1: done. Scaffolded Playwright 1.63 with strict TS 6.0 (pinned; see Decisions), ESLint 10 + typescript-eslint strict-type-checked + eslint-plugin-playwright policy rules, Prettier, `baseURL` from `WDE_BASE_URL`, 3 browser projects, trace on first retry. Repo: github.com/Gabriel-Leao51/wde-playwright-ts. There are no tests or CI workflow yet; both arrive in sessions 2–4.
- 2026-09-24, Session 2: done. `test-data/` (JSON copied from the Python suite, typed via `satisfies`), `fixtures/` (`test.extend` with `loginPage`, `setLanguage`, and a `loggedInAs` option that swaps `storageState`), and a `setup` project that logs admin and customer in once. 11/11 green locally on all 3 browsers. Only `LoginPage`'s login flow is ported so far; session 3 ports the full 6 page objects and adds them as fixtures. There's no CI yet (session 4).
- 2026-09-24, Session 3: done. Ported cart, login, OTP login, orders, products and Stripe checkout page objects as fixtures, with role/label locators (checked against the live stack and Stripe on all 3 browsers by a throwaway probe, not committed). Found and fixed two races (see Decisions). Open for session 10: Stripe's fields sometimes stay non-editable on Firefox when several checkouts run in parallel; serially 4/4 pass.
- 2026-09-24, Session 4: done. `.github/workflows/ci.yml`: checks out this repo plus `Gabriel-Leao51/wde` into a `wde-app` subdirectory (`actions/checkout` rejects a `path` outside the runner's workspace, so the local-dev `../wde` sibling convention from `CLAUDE.md` doesn't translate directly to CI), writes a placeholder `STRIPE_KEY` into `.env` (no real key needed until session 10's Stripe suite), brings up the stack with `docker compose up --build`, polls `curl` until the app answers, then runs `tests/fixtures.spec.ts` (the setup project plus all 3 smoke tests) as a chromium/firefox/webkit matrix and uploads the HTML report per leg. Verified the full flow locally first (build, boot, curl wait, `npx playwright test --project=chromium`, 5/5 green), pushed, hit the checkout path error, fixed it, and confirmed CI green via the raw API on all 3 matrix legs (run 36070345525).
- 2026-09-25, Session 5: done. Ported all 7 admin login/authentication/authorization scenarios: `tests/admin-login.spec.ts` (successful login, invalid credentials) and `tests/admin-panel-protection.spec.ts` (401 for a guest hitting `/admin/products` or `/admin/orders`; 403 for a logged-in customer). While porting the Python suite's `@xfail` authorization scenarios, verified live (not just by reading source) that BUG-AUTH-001/002 are still present: `middlewares/protect-routes.js` in `wde` checks `req.path.startsWith('/admin')`, but Express strips the mount prefix for middleware registered via `app.use('/admin', middleware, router)`, so the check never trips and a logged-in customer can reach every admin page/form. Ported those 3 scenarios as `test.fail()` assertions of the secure behavior (mirrors pytest's strict `xfail`) rather than skipping them. 12/12 green on chromium, 23/23 across all 3 browsers, no regressions in the existing suite. Wrote the `port-feature` skill (real mapping learned: steps → inline test-body code, not step functions; `scenario_context` → a local variable; `xdist_group` → serial mode; `@xfail` → `test.fail()`).
