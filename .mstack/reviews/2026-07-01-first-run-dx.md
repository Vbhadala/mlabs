# Review: Tier A — first-run DX bundle

**Date:** 2026-07-01
**Slug:** first-run-dx
**Plan reviewed:** [2026-07-01-first-run-dx.md](../plans/2026-07-01-first-run-dx.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (via /mstack-review)

---

## Summary

The plan is ready to implement. It's tooling/docs/config only (no product code,
no data-model change, no new third-party deps), so it clears every AGENTS pause
trigger. Review refined three things: the shared checker is exposed via a
**subpath** (`@mlabs/config/env-doctor`) rather than the universal package root
so it never enters the mobile/design bundle; the live DB logic moves into a
`getMigrationStatus()` helper in **`@mlabs/db`** (which owns the neon-serverless
driver + the journal) instead of being duplicated in a root script; and the
doctor is informational (exit 0) with an opt-in `--strict` for CI. UI-Significant
is **no** — the only `apps/web` file touched is `instrumentation.ts` (not a
page/layout/component), so skip `/mstack-mockup` and go straight to `/mstack-code`.

## Findings

### Blockers (must fix before /mstack-code)
- None.

### Concerns (raised, decided, recorded)
- **Concern:** The plan put the checker in `packages/config/src/index.ts`. But
  `@mlabs/config` is universal (mobile + email import it); a config/tooling
  checker doesn't belong in the mobile bundle graph.
  **Decision:** Ship it as a **subpath** `@mlabs/config/env-doctor` and do **not**
  re-export from root `index.ts`. Mirrors the existing `@mlabs/config/design`
  subpath used by `check-contrast`.
- **Concern:** Root `scripts/` has no neon driver deps; doing the live DB check
  inline would pull `@neondatabase/serverless` + `ws` into the root.
  **Decision:** Add `getMigrationStatus(databaseUrl)` to `@mlabs/db` (reuses its
  `Pool` + `drizzle/migrations/meta/_journal.json`); add `@mlabs/db` to root
  devDeps (like `@mlabs/config` already is) so `scripts/doctor.ts` imports it.
- **Concern:** `instrumentation.ts` reads `NEXT_RUNTIME` / `NEXT_PHASE` (raw
  `process.env`), which brushes the "no raw process.env outside env.ts" rule.
  **Decision:** Acceptable — these are framework-runtime flags and the file
  already documents reading them; the actual *config values* come from the
  validated `env`. Not a violation.
- **Concern:** Duplicated consequence copy between `env-doctor.ts` and the
  `.env.example` comments.
  **Decision:** `env-doctor.ts` is the machine-readable source of truth; accept
  the minor prose overlap with `.env.example`. No automated sync-check for now.

### Suggestions (taken or deferred)
- Taken: `engines.node` as a **warning**, not a hard gate — do **not** enable
  `engine-strict` (a hard failure on Node 21/23 is worse DX than a warning).
- Deferred (Tier B): local Postgres via docker-compose, `.well-known` substitution
  script, centralized secrets doc.

## Decisions locked

Net new decisions made during review (beyond the plan):

- **Doctor exit code:** always `0` (informational); add `--strict` → exits
  non-zero when a **critical** var is missing (for CI / pre-deploy gating).
- **Critical vars:** `DATABASE_URL`, `BETTER_AUTH_SECRET` (loud in the banner,
  gated by `--strict`). **Recommended:** `BETTER_AUTH_URL` (has a default),
  `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`.
- **Checker home:** `@mlabs/config/env-doctor` subpath (pure; takes values;
  no `process.env`).
- **DB check home:** `getMigrationStatus()` in `@mlabs/db`; `@mlabs/db` added to
  root devDeps.
- **Node target:** 22 LTS. **Wizard:** zero-dep Node `readline`. **Banner:**
  dev-only, non-blocking. (from plan)

## Implementation plan

Ordered tasks for `/mstack-code` to execute top-to-bottom. Each is atomic
(one commit) and leaves the repo in a working state.

### Task 1: Pin Node version

- **Files:** `package.json` (edit) · `.nvmrc` (new)
- **What:** Add `"engines": { "node": ">=22 <23" }` to root `package.json`.
  Create `.nvmrc` containing `22`. Do **not** add `engine-strict` / `.npmrc`
  engine enforcement.
- **Acceptance:** `.nvmrc` reads `22`; `package.json` has `engines.node`;
  `pnpm install` still succeeds with no new warnings; `pnpm typecheck` passes.

### Task 2: Pure config checker in @mlabs/config (subpath)

- **Files:** `packages/config/src/env-doctor.ts` (new) ·
  `packages/config/src/env-doctor.test.ts` (new) ·
  `packages/config/package.json` (edit — add the `./env-doctor` export if the
  package uses an explicit `exports` map)
- **What:** Export `CONFIG_CHECKS` (per-var metadata: `key`, `group`,
  `severity: 'critical' | 'recommended' | 'optional'`, `consequence`, `howToGet`)
  covering `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` (and optional: object storage,
  Stripe, Expo scheme). Export a **pure** `evaluateConfig(values: Record<string,
  string | undefined>) => CheckResult[]` — no `process.env`, no imports of server
  code. Severity per the locked critical/recommended split. Do **not** re-export
  from `packages/config/src/index.ts`.
- **Acceptance:** Unit tests cover: all-missing → critical entries flagged;
  all-present → all ok; partial. `pnpm --filter @mlabs/config test` (or root
  `pnpm test`) green. Importable as `@mlabs/config/env-doctor`. Not present in the
  root `index.ts` export surface.

### Task 3: getMigrationStatus() helper in @mlabs/db

- **Files:** `packages/db/src/**` (new small module, e.g. `status.ts`, exported
  from the package) · `packages/db/package.json` (edit — export if needed) ·
  root `package.json` (edit — add `"@mlabs/db": "workspace:*"` to devDependencies)
- **What:** Add `getMigrationStatus(databaseUrl: string)` reusing the
  neon-serverless `Pool` + `ws` pattern from `packages/db/scripts/migrate.ts` and
  the journal at `packages/db/drizzle/migrations/meta/_journal.json`. Returns
  `{ reachable: boolean; error?: string; applied: number; total: number;
  pending: number }`. Wrap connect/query in a short timeout; never throw — on
  failure return `reachable:false` + `error`. Treat a missing
  `__drizzle_migrations` table as `applied: 0` (never migrated). Always
  `pool.end()` in `finally`.
- **Acceptance:** Function typechecks and is importable as `@mlabs/db`
  (or its subpath). With a bad/unreachable URL it resolves `reachable:false`
  without throwing or hanging. `pnpm typecheck` passes.
- **Pause if:** Drizzle's migrations table is **not** at the expected location
  (default is `drizzle.__drizzle_migrations`) — confirm the actual schema/table
  before hardcoding the pending-count query.

### Task 4: `pnpm doctor` command

- **Files:** `scripts/doctor.ts` (new) · `package.json` (edit — add
  `"doctor": "tsx scripts/doctor.ts"`)
- **What:** Read `process.env` (tooling — allowed), build the values map, call
  `evaluateConfig`, and print a readable status table (var · status · what breaks).
  Then call `getMigrationStatus(DATABASE_URL)` and print a DB section: reachable?
  and "X of N migrations applied (Y pending → run pnpm db:migrate)". Handle unset
  `DATABASE_URL` distinctly from unreachable. Exit `0` by default; support
  `--strict` → exit non-zero if any **critical** var is missing.
- **Acceptance:** `pnpm doctor` on a fresh clone prints the table + a DB section,
  exits 0. `pnpm doctor --strict` with no `.env.local` exits non-zero. With a
  valid migrated DB it reports "N of N applied, 0 pending". Never throws/hangs on
  a bad `DATABASE_URL`.

### Task 5: `pnpm setup` wizard

- **Files:** `scripts/setup.ts` (new) · `package.json` (edit — add
  `"setup": "tsx scripts/setup.ts"`)
- **What:** Zero-dep Node `readline` wizard. If `.env.local` is absent, copy from
  `.env.example`; if present, ask before modifying (never clobber). Generate
  `BETTER_AUTH_SECRET` via `crypto.randomBytes(32).toString('base64')` only if it's
  empty. Default `BETTER_AUTH_URL=http://localhost:3000`. Prompt for `DATABASE_URL`
  (skippable). If a URL was provided, offer to run `pnpm db:migrate`. Print a
  closing "run pnpm doctor / pnpm dev" hint.
- **Acceptance:** On a fresh clone `pnpm setup` produces a `.env.local` with a
  valid 32+ char `BETTER_AUTH_SECRET` and the auth URL, optionally captures
  `DATABASE_URL`, optionally migrates — zero new dependencies. Re-running with an
  existing `.env.local` does not overwrite it without a confirm, and does not
  regenerate a non-empty secret.

### Task 6: Dev-boot warning banner

- **Files:** `apps/web/src/instrumentation.ts` (edit)
- **What:** In `register()`, after the existing guards, add: return early unless
  `NEXT_RUNTIME === 'nodejs'`, not `phase-production-build`, **and**
  `env.NODE_ENV === 'development'`. Then call `evaluateConfig` (values from the
  validated `env`) and, if any critical/recommended var is missing, `console.warn`
  a concise banner naming what's missing, what breaks, and "run pnpm doctor".
  Non-blocking — always let the server continue. Keep the existing no-op comment
  block / forks guidance intact.
- **Acceptance:** `pnpm dev` with missing critical vars prints the banner; server
  still starts. `pnpm build` / `pnpm start` / `pnpm test` / CI print **nothing**.
  `pnpm typecheck` + `pnpm lint` pass.

### Task 7: Docs — quickstart, .env.example pointer, fork checklist

- **Files:** `README.md` (edit) · `.env.example` (edit) ·
  `FORK_CHECKLIST.md.template` (edit)
- **What:** Rewrite the README quickstart to lead with `pnpm setup`, state the
  **minimum** required env set (`DATABASE_URL`, `BETTER_AUTH_SECRET`), include the
  currently-missing `pnpm db:migrate` step, and mention `pnpm doctor`. Add a
  one-line pointer to `pnpm setup` at the top of `.env.example`. Reference
  `pnpm setup` / `pnpm doctor` in `FORK_CHECKLIST.md.template`.
- **Acceptance:** README quickstart names the minimum env set and includes
  `pnpm db:migrate`. No `/mlabs-`/stale references introduced. Markdown renders.

## Open questions

Anything still unresolved that `/mstack-code` should escalate, not guess.

- None. (The one uncertainty — the drizzle migrations table location — is captured
  as the Task 3 **Pause if**.)
