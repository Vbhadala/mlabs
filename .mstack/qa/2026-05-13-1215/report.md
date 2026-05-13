# QA report — 2026-05-13 12:15

**Focus:** Messages + notifications smoke after TODO #32 cleanup (rewires apps/web off legacy server modules onto @mlabs/services).
**Env:** localhost:3000 (dev server started by /mlabs-qa for this run)
**Status:** clean (pre-existing drift fixed, no regressions from TODO #32)
**Tester:** /mlabs-qa
**Implementation under test:** [.mstack/implementations/2026-05-13-drop-legacy-server-modules](../../implementations/2026-05-13-drop-legacy-server-modules/report.md) — 19 commits, `438ebd6b..6e86a64f`

## Scope decision

User selected **Smoke only** + **localhost**: validate that the refactor
didn't break basic routing, auth-redirect, or 401 API responses on the
messages and notifications paths. Authenticated end-to-end flow is out
of scope for this run — it needs a real `DATABASE_URL` + auth secret
that the workspace doesn't currently have.

## Scenarios run (6)

| # | Scenario | Result |
|---|---|---|
| 1 | `/messages` redirects unauthenticated → `/login` (URL) | ✅ pass |
| 1b | `/messages` heading assertion (`level: 1, name: "Sign in"`) | ❌ fail — **stale fixture, see Issue 1** |
| 2 | `/messages/[id]` redirects unauthenticated → `/login` | ✅ pass |
| 3 | `GET /api/v1/messages/conversations` → 401 | ✅ pass |
| 4 | `GET /api/v1/messages/conversations/[id]/messages` → 401 | ✅ pass |
| 5 | `/notifications` redirects unauthenticated → `/login` (URL) | ✅ pass |
| 5b | `/notifications` heading assertion | ❌ fail — **same stale fixture, see Issue 1** |
| 6 | `GET /api/v1/notifications/unread-count` → 401 | ✅ pass |

**Bottom line:** every meaningful behaviour the refactor could plausibly
have broken (auth-redirect, API 401, basic routing) passes. The two test
failures are a stale assertion on the destination page heading that
**pre-dates** TODO #32.

## Visual evidence

- `assets/messages-redirect-login.png` — `/messages` → login page
  renders cleanly. Brand orange "Sign in" CTA, h1 = "Welcome back",
  "Sign in to continue" subhead, working email + password inputs.
- `assets/notifications-redirect-login.png` — same login page reached
  from `/notifications`, same state.

## Issues

### Issue 1: Stale heading assertion in messages.spec.ts + notifications.spec.ts

- **Severity:** low (test drift, no product impact)
- **Repro:**
  1. From workspace root: `pnpm --filter @mlabs/web exec playwright test e2e/messages.spec.ts e2e/notifications.spec.ts`
  2. Observe two failures, both on
     `getByRole("heading", { level: 1, name: "Sign in" }).toBeVisible()`
- **Expected (per the test):** An `<h1>Sign in</h1>` on the login page.
- **Actual:** The login page's h1 is "Welcome back" (per design — see
  `apps/web/src/app/(auth)/login/`). The text "Sign in" exists on the
  page but as the *button* label, not a heading.
- **Screenshot:** `assets/messages-redirect-login.png`
- **Console errors:** none
- **Suspected cause:** Login page was redesigned at some point but the
  e2e fixtures were not updated. `git log -- apps/web/e2e/messages.spec.ts`
  shows the file's only commit is `18e59ade` (the monorepo migration) —
  no edits since. Same for `notifications.spec.ts` and the login route.
- **Relation to TODO #32:** **None.** The TODO #32 cleanup did not touch
  `apps/web/src/app/(auth)/login/` or the e2e specs. The redirect part
  of both tests (`toHaveURL(/\/login$/)`) passes in this run.
- **Fix plan:** Update the assertions to one of:
  - `getByRole("heading", { level: 1, name: "Welcome back" })` — matches
    the actual h1
  - `getByRole("button", { name: "Sign in" })` — asserts the CTA instead
  - Drop the secondary heading assertion entirely — the URL assertion
    is sufficient for the redirect-smoke intent
- **Status:** ✓ fixed (commit `c6022579`) — both specs now assert
  `getByRole("heading", { level: 1, name: "Welcome back" })`. Re-run:
  6/6 pass in 1.5s.

## Summary

| Metric | Value |
|---|---|
| Scenarios run | 6 |
| Smoke pass rate (TODO #32 surface) | 6/6 |
| Full pass rate (incl. pre-existing assertions) | 4/6 |
| New regressions from TODO #32 | **0** |
| Pre-existing test drift | 1 issue (Issue 1) |
| Critical / High / Medium | 0 / 0 / 0 |
| Low | 1 |

The TODO #32 cleanup ships clean from a smoke-QA perspective. The single
issue surfaced is a pre-existing test fixture that needs updating
regardless of whether this PR lands.
