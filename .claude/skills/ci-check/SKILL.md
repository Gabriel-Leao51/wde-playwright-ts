---
name: ci-check
description: Check GitHub Actions CI status for this repo via the raw REST API, never the Actions web page. Use whenever a session needs to verify CI is green after a push, or to debug a failing run.
---

# CI check (raw API)

This project's rule (see `ROADMAP.md`): CI status is always checked through the GitHub REST API, not the Actions web UI. Use `gh api`, which handles auth automatically.

## Steps

1. **Get the commit SHA to check:**

   ```bash
   git rev-parse HEAD
   ```

2. **Find the run for that SHA:**

   ```bash
   gh api "repos/{owner}/{repo}/actions/runs?head_sha=<sha>" --jq '.workflow_runs[] | {id, name, status, conclusion}'
   ```

   Replace `{owner}/{repo}` with this repo's slug. If nothing shows up yet, the run may not have registered — wait a few seconds and retry rather than switching to the web UI.

3. **Poll status until it's not `queued`/`in_progress`:**

   ```bash
   gh api "repos/{owner}/{repo}/actions/runs/<run_id>" --jq '{status, conclusion}'
   ```

4. **On failure, get per-job detail:**

   ```bash
   gh api "repos/{owner}/{repo}/actions/runs/<run_id>/jobs" --jq '.jobs[] | {name, status, conclusion}'
   ```

   For the failing job's logs:

   ```bash
   gh api "repos/{owner}/{repo}/actions/jobs/<job_id>/logs"
   ```

   (This endpoint redirects to a log download; `gh api` follows redirects and prints the log text.)

5. **Report** which browser/matrix leg failed (this repo runs a chromium/firefox/webkit matrix per the roadmap) and the relevant log excerpt — don't just say "CI failed."

## Notes

- Multi-browser matrix runs are separate jobs under the same run id — check all of them, not just the first.
- A session isn't done until this comes back green for the relevant workflow run (see the `session` skill).
