---
name: port-feature
description: Map a Python/pytest-bdd feature file and its step definitions (in the frozen wde-test-automation suite) onto Playwright Test + TypeScript. Use when porting a Phase B session's scenarios from wde_automacao into this repo.
---

# Porting a Python/pytest-bdd feature to Playwright Test

Source: `C:\Users\gabri\Documents\wde_automacao` (`features/**/*.feature` + `steps/test_*_steps.py`). Delete this skill once Phase B parity is done (session 13) — the Python suite gets archived and there's nothing left to port.

## Structural mapping

| pytest-bdd                                                                                                                        | Playwright Test                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Feature:`                                                                                                                        | `test.describe(...)`                                                                                                                          |
| `Scenario:`                                                                                                                       | one `test(...)`                                                                                                                               |
| `Background:` shared `Given`                                                                                                      | `test.use({ loggedInAs: ... })` at the describe level, or a page-object action called at the top of each test if the given can't be a fixture |
| `Given`/`When`/`Then` step functions                                                                                              | inline code in the test body, in order — there is no separate step-definition layer to recreate                                               |
| `scenario_context` fixture (a dict passed between step functions to share state within one scenario)                              | a plain local variable in the test body. One test function already _is_ the whole scenario, so there's nothing to smuggle state through       |
| `@pytest.mark.xdist_group(name=...)` (scenarios that must share a worker because they mutate the same app state across scenarios) | `test.describe.configure({ mode: 'serial' })` on that describe block                                                                          |
| `@xfail` tag on a known-bug scenario                                                                                              | `test.fail(true, 'BUG-ID: one-line root cause')` at the top of the test body — see "Known-bug scenarios" below                                |
| Scenario Outline / Examples table                                                                                                 | a `for` loop over the data, generating one `test()` per row, outside `test.describe`; Playwright has no native outline syntax                 |
| Session/module-scoped pytest fixtures (`users`, `*_page`)                                                                         | already ported once, in `fixtures/index.ts` and `test-data/index.ts` — don't re-port per feature, just consume them                           |

## Step-by-step

1. Read the `.feature` file and its `steps/test_*_steps.py` for the scenarios in this session's roadmap line.
2. For each scenario, write one `test()`. Don't create a function per step — that indirection existed only because pytest-bdd needs to match Gherkin text to code; Playwright Test has no such requirement (see `ROADMAP.md` Decisions: "No Gherkin here").
3. If several scenarios repeat the same multi-step action (e.g. "click View & Edit for product X, then fill the form"), factor it into a page-object **action** method, not a step function — this repo's page objects hold locators and actions, tests hold assertions (session 3 decision).
4. **Don't trust the Python step's selector text or assertion as still accurate.** Re-derive it from the current `wde` source: check the relevant `views/**/*.ejs` and `locales/en.json` for the actual heading/label text, and use role/label locators per `CLAUDE.md`'s locator policy — the Python suite may predate a copy change, and raw CSS selectors don't port to `getByRole`/`getByLabel` mechanically.
5. Run the new spec on all 3 browser projects against the live stack (`docker compose up --build` in `../wde`) before committing — don't rely on reading the app's source to predict behavior; confirm it in the browser. Session 5 found a real, still-present bug (BUG-AUTH-001/002 in `middlewares/protect-routes.js`) that a code read alone made look already fixed.

## Known-bug scenarios (`@xfail` → `test.fail()`)

When the Python suite tags a scenario `@xfail` for a known app bug:

1. Re-verify the bug still reproduces against the current `wde` app (don't assume the old annotation is still accurate — it may have been fixed, or the symptom may have changed).
2. If it still reproduces, write the test asserting the **secure/correct** behavior (what should happen), then mark it with `test.fail(true, 'BUG-ID: short root cause')` at the top of the test body. This mirrors pytest's strict `xfail`: the test is expected to fail, and Playwright flags an _unexpected pass_ as a run failure — which is exactly the signal you want when the app eventually fixes the bug.
3. Put the actual root cause in the reason string and a fuller comment above the `describe`/`test`, e.g. session 5's finding: `protectRoutes` in `wde/middlewares/protect-routes.js` checks `req.path.startsWith('/admin')`, but Express strips the mount prefix for middleware registered via `app.use('/admin', middleware, router)`, so `req.path` is already relative (`/products`, not `/admin/products`) and the check never trips.

## Example (session 5)

`features/admin/login.feature` + `authentication.feature` + `authorization.feature` → `tests/admin-login.spec.ts` (2 scenarios, both real assertions) + `tests/admin-panel-protection.spec.ts` (2 authentication scenarios + 3 authorization scenarios, the latter all `test.fail()` for BUG-AUTH-001/002).
