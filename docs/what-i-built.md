# What I built and why

## The goal

I wanted a portfolio project that shows the work a QA automation engineer does on a real product, not a login page. Two things were missing from the usual demo: a suite that stays useful while the app changes underneath it, and an app that looks like something people would actually shop on. So the project had two halves, done in order.

## Half one: move the suite to Playwright and TypeScript

I had a Python suite (pytest-bdd, 45 scenarios) for the WDE Shop, an Express and MongoDB store I also maintain. Most job postings I care about ask for Playwright and TypeScript, so I rebuilt it there, 13 sessions of about an hour each.

Decisions that mattered:

- **Playwright Test directly, no Gherkin.** The Python repo already shows the BDD work. Here the fixtures, `test.step`, tags and `storageState` do the job without a translation layer.
- **Locators had to be role and label based from day one**, and a lint rule enforces it. I knew I would redesign the app next, and CSS selectors would not survive that.
- **Log in once per role** with a setup project. Because WDE keeps the cart and language in the server session, tests that change them log in fresh.
- **Known bugs became `test.fail()` scenarios** that assert the secure behaviour. I re-verified each one live against the app instead of trusting the old tags. That surfaced real issues: an admin check that never runs because Express strips the mount prefix, a session secret that lets anyone forge an admin cookie, and an error page that crashes while rendering itself.
- **Visual baselines are generated only in the Linux Playwright image**, because font rendering on Windows differs enough to make them useless in CI.

I ended with a scenario-by-scenario parity check: 43 ports one to one, and 2 visual scenarios replaced with better-scoped ones (the pages they covered are changed by other tests running in parallel, which would have made them flaky).

## Half two: redesign the app with the suite as the safety net

The WDE UI was functional but looked like a prototype. Over 16 sessions I redesigned it, running the suite after every change:

1. **Design direction first:** IKEA, Best Buy and Muji as references, then design tokens (palette with measured contrast, type scale, spacing, shadows), self-hosted Inter, and orange reserved for buying actions.
2. **Real product photos** under the free Unsplash licence, curated into a manifest that doubles as the credits list, fetched and cropped by a script and committed so tests never depend on a CDN.
3. **Page by page:** header with search and cart, a home page, product cards, a filter sidebar, product details with breadcrumbs, the cart, centred auth forms with inline validation, order cards, an admin shell with tables, and polished error pages, toasts and modals.
4. **Dark mode built in, not retrofitted:** tokens use `light-dark()`, and the choice lives in a cookie rather than the session so parallel tests do not fight over it.
5. **Phones and accessibility last:** a Pixel 7 and iPhone 15 project, touch-target and overflow checks, and axe scans of every page in both themes. The first scan found three real problems (unlabelled editor buttons, nested interactive elements in the search list, links told apart from text by colour alone), and I fixed them in the app.

## What the suite caught

- Real races in my own page objects (navigations that needed to wait for `load`, WebKit not focusing buttons on click).
- A regression from my own CSS: a "remove the last child's bottom margin" rule also removed the auto margin that centres a `<dialog>`, pinning the delete dialog to the bottom of the screen. Visual baselines had already been regenerated with the bug in them, which is the lesson I took away: **updating a baseline is not a review**. Now there is a geometry test that checks the dialog is centred, which no screenshot can promise.
- iOS Safari not firing `click` for a tap on a non-interactive element, so "tap outside to close" never worked on an iPhone until the listener moved to `pointerdown`.
- CI-only failures: Stripe's checkout asked for a ZIP code from GitHub's US IPs and for a phone number via Link, and blocks WebKit from shared runner IPs altogether.

## What I would do next

- Fix the WebKit font-loading flake that keeps two cart baselines skipped there.
- Fix the known bugs the suite documents, then flip their `test.fail()` markers.
- Per-worker authentication, to lift the "shared session" restriction.
- If a posting asks for Cucumber on TypeScript, add a `playwright-bdd` slice.

Numbers: about 255 tests per desktop browser, 28 per phone, 98 visual baselines, 5 CI jobs per push.
