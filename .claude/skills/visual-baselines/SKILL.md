---
name: visual-baselines
description: Generate or update native `toHaveScreenshot()` baselines in the Linux `mcr.microsoft.com/playwright` Docker image. Use whenever a visual-regression test is new or its baseline needs updating — never generate or update these baselines on Windows.
---

# Visual baselines (Docker)

Per `CLAUDE.md` and `ROADMAP.md`: Playwright's `toHaveScreenshot()` baselines are pixel comparisons, and font rendering differs enough between Windows and Linux (CI runs on `ubuntu-latest`) that a Windows-generated baseline never matches CI. Baselines are always generated inside the official Linux Playwright Docker image instead, matching CI's OS.

Playwright's default snapshot naming already bakes in the browser project and platform (e.g. `login-chromium-linux.png`), so this only touches the `-linux` files — it never conflicts with anything a Mac/Windows contributor might generate by mistake (theirs would be named `-darwin`/`-win32` and are not committed, per the CLAUDE.md rule above).

## Prerequisites

- The WDE stack running locally (see `CLAUDE.md`): `cd ../wde && docker compose up --build -d`.
- Docker Desktop reachable from this shell. If `docker pull`/`docker compose` fails with `error getting credentials - err: exec: "docker-credential-desktop": executable file not found`, that's a broken credential-helper lookup in this environment, not a repo issue (seen before in session 7) — work around it with a scoped, no-auth Docker config instead of touching the user's real Docker settings:

  ```bash
  mkdir -p "$HOME/.docker-noauth" && printf '{"auths":{}}' > "$HOME/.docker-noauth/config.json"
  ```

  Then prefix every `docker`/`docker compose` command below with `DOCKER_CONFIG="$HOME/.docker-noauth"`.

## Steps

1. **Match the image tag to the installed Playwright version:**

   ```bash
   node -e "console.log(require('./node_modules/@playwright/test/package.json').version)"
   ```

   Pull `mcr.microsoft.com/playwright:v<that version>-noble` (e.g. `v1.63.0-noble`). A mismatched image version can bundle different browser builds, which drifts pixels from what CI actually runs.

2. **Run the target spec with `--update-snapshots` inside the container**, mounted at the repo root, pointed at the host's WDE app via `host.docker.internal` (Git Bash on Windows mangles `-w /work` into a Windows path — disable that with `MSYS_NO_PATHCONV=1`):

   ```bash
   MSYS_NO_PATHCONV=1 docker run --rm \
     --add-host=host.docker.internal:host-gateway \
     -v "<absolute repo path>:/work" \
     -w /work \
     -e WDE_BASE_URL=http://host.docker.internal:3000 \
     -e CI=true \
     mcr.microsoft.com/playwright:v<version>-noble \
     bash -lc "npm ci && npx playwright test <spec path> --update-snapshots"
   ```

   `npm ci` runs fresh inside the container rather than reusing the host's `node_modules`, so nothing Windows-specific leaks in. `-e CI=true` matches the reporter/retry config CI actually uses (see `playwright.config.ts`).

3. **Verify the baselines are stable** by rerunning the same container command without `--update-snapshots` — it should pass outright, with no `writing actual` lines:

   ```bash
   MSYS_NO_PATHCONV=1 docker run --rm \
     --add-host=host.docker.internal:host-gateway \
     -v "<absolute repo path>:/work" \
     -w /work \
     -e WDE_BASE_URL=http://host.docker.internal:3000 \
     -e CI=true \
     mcr.microsoft.com/playwright:v<version>-noble \
     bash -lc "npx playwright test <spec path>"
   ```

4. **Commit the new/changed `*-snapshots/*-linux.png` files** alongside the test/page change that prompted them.

## Notes

- The container's `npm ci` runs inside the mounted repo, so it replaces the host's `node_modules` with Linux binaries. Run `npm ci` on the host afterwards, or `npx playwright` fails with "not recognized".
- To refresh one page's baselines only, add `--grep '<test title>'` to the `--update-snapshots` run; the other baselines stay untouched.
- A plain local `npx playwright test`/`npm test` on Windows will fail any visual-regression test with "snapshot doesn't exist" (it looks for a `-win32` file that's never generated or committed). That's expected, not a regression — verify visual tests via this Docker workflow or via CI (`ci-check` skill), not a bare Windows run.
- **Redesign loop (Phase C)**, per `ROADMAP.md`: change the page → run the suite → fix any broken locators → regenerate that page's baseline with this skill → commit → check CI.
