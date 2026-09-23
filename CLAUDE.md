# WDE Shop test suite (Playwright + TypeScript)

Full plan, decisions, and session checklist: [ROADMAP.md](ROADMAP.md). Always check it for the next unchecked session before starting work.

## Running the WDE stack

The app under test lives in the sibling repo `../wde`. Bring it up from there:

```bash
cd ../wde
docker compose up --build
```

- App: `http://localhost:3000`
- MongoDB: `127.0.0.1:27017` (published for the security suite's direct-DB scenarios)
- Mailpit (SMTP capture + REST API): UI/API at `127.0.0.1:8025`, SMTP at `127.0.0.1:1025`

To reset seed data (fresh products/users/orders): `docker compose down -v && docker compose up --build` — the `seed` service repopulates Mongo on every `up` after the volume is dropped.

Override the target with env vars: `WDE_BASE_URL`, `MAILPIT_BASE_URL`, `MONGODB_URI` (see the Python suite's README §7.6–7.8 for exact usage until this repo has its own equivalent).

## Commands

- `npm run check` — typecheck + lint + format check. Must pass before every commit.
- `npm test` — all three browser projects; `npx playwright test --project=chromium` for one.
- `npm run format` — apply Prettier.

TypeScript is pinned to `~6.0` because typescript-eslint doesn't support 7.x yet; don't bump it until typescript-eslint's peer range allows.

## Test credentials

Never paste credential values into code, commits, or chat — reference the fixture file instead. In the Python suite they live in `test_data/users.json`; the TypeScript port will land in an equivalent typed fixture (update this pointer once it exists).

## Locator and wait policy

- **Role/label-based locators only**: `getByRole`, `getByLabel`, `getByText`. No CSS/XPath, no `data-testid` unless nothing accessible exists. This is a hard requirement — Phase C rewrites the app's markup, and these locators are the ones that survive it.
- **No arbitrary waits** (`waitForTimeout`, sleeps). Rely on Playwright's auto-waiting and web-first assertions (`expect(locator).toBeVisible()`, etc.).
- Both are enforced by `eslint-plugin-playwright` rules in `eslint.config.mjs` (`no-raw-locators`, `no-wait-for-timeout`, …) for every `.ts` file. A justified exception needs an inline `eslint-disable-next-line` with the reason.

## Visual baselines

Generate/update `toHaveScreenshot()` baselines **only** inside the Linux `mcr.microsoft.com/playwright` Docker image, never on Windows — font rendering differs enough to make local baselines useless in CI (`ubuntu-latest`). See the `visual-baselines` skill once it exists (planned after session 12).

## CI

Check CI status via the raw GitHub REST API (`/actions/runs` filtered by `head_sha`, then `/runs/<id>/jobs`) — never the Actions web page. See the `ci-check` skill.

## Skills

- `/session` — read `ROADMAP.md`, pick the next unchecked session, keep it to ~1 hour, end green and committed, tick the box, verify CI.
- `ci-check` — the raw-API CI procedure.
