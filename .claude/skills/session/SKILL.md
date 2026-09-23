---
name: session
description: Run the next roadmap session for the WDE Playwright/TypeScript port — read ROADMAP.md, pick the next unchecked item, keep it to about an hour, end green and committed, tick the box, verify CI. Use when the user says "/session", "start today's session", or "let's continue the roadmap".
---

# Session runner

This project moves in small, daily, roadmap-driven sessions (see [`CLAUDE.md`](../../CLAUDE.md) and [`ROADMAP.md`](../../ROADMAP.md)). Each invocation does exactly one session.

## Steps

1. **Read `ROADMAP.md`** in full, including the Decisions and Session rules sections — they change behavior (e.g. locator policy, model switch rules, visual-baseline handling).
2. **Pick the next unchecked `- [ ]` item**, in order, from Session 0 onward. Don't skip ahead even if a later item looks easier — the phases are sequential on purpose (migrate first, redesign second).
3. **Check the model.** Sessions 1 and 14, and any bug/flaky test unsolved after ~20 minutes, call for Opus per the roadmap. Tell the user if a switch is warranted; don't switch silently.
4. **Do the session's work**, scoped tightly to what that checklist line says — no scope creep into later sessions.
5. **Budget ~1 hour.** If it isn't green by minute 50:
   - Commit the work in progress to a branch (not `main`).
   - Add a line to `ROADMAP.md`'s Progress log saying where to resume and why it didn't land.
   - Stop there — don't force a finish.
6. **If it lands green:**
   - Run the full relevant test scope locally (or the smallest scope that proves the change — see the session's own line for what "green" means, e.g. "one smoke test green in CI" for session 4).
   - Commit.
   - Tick the checklist box in `ROADMAP.md`.
   - Add one line to the Progress log: date, session number, outcome.
   - Push and verify CI using the `ci-check` skill — never the Actions web page.

## Notes

- A fresh Claude session starts each day; state lives in `ROADMAP.md`, `CLAUDE.md`, and memory — not in conversation history. Don't assume context from "yesterday" beyond what's written down.
- Locator policy (role/label-based only) and the Linux-only visual baseline rule apply from Phase A onward — see `CLAUDE.md`.
- Later skills referenced in the roadmap (`port-feature`, `redesign-page`, `visual-baselines`) don't exist yet; if the current session is the trigger point for one of them (see ROADMAP's "Later skills" note), create it after finishing the session's own work, not instead of it.
