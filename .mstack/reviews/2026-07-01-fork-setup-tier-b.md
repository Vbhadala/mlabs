# Review: Tier B — fork-setup bundle (deeplinks + secrets doc)

**Date:** 2026-07-01
**Slug:** fork-setup-tier-b
**Plan reviewed:** [2026-07-01-fork-setup-tier-b.md](../plans/2026-07-01-fork-setup-tier-b.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (via /mstack-review)

---

## Summary

Ready to implement — tooling + docs only, no product code, no data-model change,
no new deps. All three plan open-questions resolved from the code (no user
blockers). Review found one real gap the plan undercounted: `app.config.ts`
contains the deep-link host in **two** places, not one. `UI-Significant: no`
(no page/layout/component touched) → straight to `/mstack-code`.

## Findings

### Blockers (must fix before /mstack-code)
- None.

### Concerns (raised, decided, recorded)
- **Concern (serving path — the key open question):** does
  `apps/web/src/app/.well-known/[file]/route.ts` generate the manifests
  dynamically?
  **Decision:** No. The route just `readFile`s `public/.well-known/<file>` and
  fixes the `Content-Type` (extensionless Apple file). **The static
  `public/.well-known/*` files are the source of truth** — rewriting them is
  correct; no retarget needed.
- **Concern (app.config.ts substitution surface undercounted):** the plan named
  `associatedDomains`, but the host `mlabs.example.com` appears **twice**:
  `ios.associatedDomains` (`applinks:mlabs.example.com`, line 33) **and**
  `android.intentFilters[].data[].host` (line 48). And `com.example.mlabs`
  appears twice (`ios.bundleIdentifier` line 32, `android.package` line 36).
  **Decision:** substitute all four: bundle/package field-targeted (they may
  differ); host by replacing every `mlabs.example.com` (one value, both spots).
  Do **not** touch `scheme: "mlabs"`, `name`/`slug`/`photosPermission` — those
  are brand strings owned by `pnpm rename`, out of scope.
- **Concern (test import of a root script):**
  **Decision:** mirror `apps/web/tests/verify-deeplinks.test.ts`, which imports
  `../../../scripts/verify-deeplinks`. So `setup-deeplinks.ts` exports its pure
  helpers and `apps/web/tests/setup-deeplinks.test.ts` imports them the same way.
- **Concern (FORK_CHECKLIST — replace vs fallback):**
  **Decision:** replace the manual `.well-known`/`app.config.ts` bullets with a
  `pnpm setup-deeplinks` step; keep a one-line manual fallback pointing at
  `docs/fork-setup.md`.

### Suggestions (taken or deferred)
- Taken: prompt copy for the SHA-256 explicitly says **app-signing key, not
  upload key** (the documented #1 footgun).
- Taken: non-TTY → error with the exact values needed + doc link (no guessing).

## Decisions locked

- Script name `setup-deeplinks` (`pnpm setup-deeplinks`); interactive readline +
  validation; rewrites all 3 files; `docs/fork-setup.md` canonical doc. (from plan)
- Static `public/.well-known/*` are the substitution source (route reads them).
- `app.config.ts`: 4 substitution points (2 bundle/package field-targeted, 2 host).
- Pure helpers exported from `scripts/setup-deeplinks.ts`; test imports via
  `../../../scripts/setup-deeplinks`.

## Implementation plan

### Task 1: `pnpm setup-deeplinks` script + unit tests

- **Files:** `scripts/setup-deeplinks.ts` (new) ·
  `apps/web/tests/setup-deeplinks.test.ts` (new) · `package.json` (edit — add
  `"setup-deeplinks": "tsx scripts/setup-deeplinks.ts"`)
- **What:** Zero-dep readline wizard (async `main()`, ANSI helpers,
  `isDirectRun` guard, TTY-aware — non-TTY errors with the required values +
  doc link; reuse the `scripts/setup.ts` pattern). Prompt + validate 5 values:
  Team ID `^[A-Z0-9]{10}$`; iOS bundle (reverse-domain); Android package
  (default = iOS bundle); app-signing SHA-256
  `^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$` (reuse the shape from
  `verify-deeplinks.ts`; prompt says "app-signing key, NOT upload key"); host
  (hostname). **Export pure helpers** — the validators plus
  `substituteAasa`, `substituteAssetlinks`, `substituteAppConfig`, and an
  `isAlreadyConfigured` check. `main()` reads the 3 source files, applies
  substitutions, writes them, and prints a summary + a reminder to run
  `pnpm verify:deeplinks -- https://<host>` after deploy (does not auto-run —
  needs a live URL). Idempotent: if no `{{…}}` placeholders and no
  `com.example.mlabs` / `mlabs.example.com` remain, report "already configured"
  and write nothing. **Only touch the real source files**
  (`apps/web/public/.well-known/apple-app-site-association`,
  `apps/web/public/.well-known/assetlinks.json`,
  `apps/mobile/app.config.ts`) — never `apps/web/tests/fixtures/**` or
  `apps/web/.next/**`.
- **Acceptance:** valid inputs rewrite all 3 files; afterward grep finds none of
  `{{APPLE_TEAM_ID}}`/`{{IOS_BUNDLE_ID}}`/`{{ANDROID_PACKAGE}}`/
  `{{ANDROID_CERT_SHA256}}` and no `com.example.mlabs` / `mlabs.example.com` in
  the 3 source files. Invalid Team ID / SHA / host → rejected + re-prompt.
  Re-run when already configured → no writes + message. Pure helpers unit-tested
  (valid substitution, idempotent no-op, no-match warning). `pnpm verify:deeplinks`
  structural validation still passes on the rewritten files. `pnpm typecheck` +
  `pnpm lint` pass; no new deps.
- **Pause if:** `apps/mobile/app.config.ts` does not contain the expected
  `com.example.mlabs` / `mlabs.example.com` literals (fork already customized it)
  — surface it, don't silently skip.

### Task 2: `docs/fork-setup.md` — canonical services + secrets map

- **Files:** `docs/fork-setup.md` (new)
- **What:** One table mapping every service → purpose → **where the value goes**
  (`.env.local` / Replit Secrets / GitHub repo secrets / EAS secrets) →
  basic-vs-advanced → where to obtain it. Cover Neon (`DATABASE_URL`), Better
  Auth (`BETTER_AUTH_SECRET`/`URL`), Postmark, Replit Object Storage, Stripe,
  Replit deploy secrets, GitHub CI secrets, EAS/Apple/Google (mobile store).
  Reference the `pnpm setup` / `pnpm doctor` / `pnpm setup-deeplinks` tooling.
  Link to `.env.example` for per-var detail rather than duplicating it.
- **Acceptance:** a single table covers all listed services with the destination
  + basic/advanced columns; renders as valid markdown; links to `.env.example`
  and the tooling. No secrets/real values committed.

### Task 3: Cross-link README + FORK_CHECKLIST

- **Files:** `README.md` (edit) · `FORK_CHECKLIST.md.template` (edit)
- **What:** README — add a link to `docs/fork-setup.md` and mention
  `pnpm setup-deeplinks`. FORK_CHECKLIST — replace the manual `.well-known` /
  `app.config.ts` substitution bullets with a single `pnpm setup-deeplinks`
  step, keep a one-line manual fallback → `docs/fork-setup.md`, and link the doc.
- **Acceptance:** FORK_CHECKLIST uses `pnpm setup-deeplinks` as the primary path;
  README links `docs/fork-setup.md`; no stale `/mlabs-` references introduced;
  markdown renders.

## Open questions

None — all resolved above. (The one runtime uncertainty, a fork having already
customized `app.config.ts`, is captured as the Task 1 **Pause if**.)
