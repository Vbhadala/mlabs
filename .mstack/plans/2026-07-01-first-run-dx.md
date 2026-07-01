# Plan: Tier A — first-run DX bundle

**Date:** 2026-07-01
**Slug:** first-run-dx
**Status:** implemented
**Author:** Claude (via /mstack-plan)

---

## Problem

A forker's inner loop is painful and **silent**. Every env var in
`apps/web/src/config/env.ts` is `.optional()`, so `pnpm install && pnpm dev`
yields a running server at :3000 where signup, DB, and email all fail with **no
signal**. The README quickstart omits `pnpm db:migrate`, so a forker who sets
`DATABASE_URL` still hits `relation "..." does not exist` on first signup. Node
isn't version-pinned (only pnpm is). Net: ~10 min of undirected flailing before
a working signup.

**Who benefits:** anyone forking the template (and us, dogfooding). **Success:**
the inner loop collapses to one command (`pnpm setup`) plus a always-there
status readout (`pnpm doctor` + a dev-boot banner) that turns every silent
failure into an explicit checklist.

Layout: monorepo, pnpm, mobile present, web at `apps/web` (resolved). Touches
tooling/docs/config only — **no product code**.

## Scope

**In:**
- **Shared config checker** in `@mlabs/config` — a pure module: single source of
  truth for each var's group/severity/consequence/how-to-get, plus
  `evaluateConfig(values) → results[]`. No `process.env` reads (values passed
  in), so it's rule-compliant and reusable by both callers below.
- **`pnpm doctor`** (`scripts/doctor.ts`) — reads `process.env` (tooling, allowed),
  prints the full status table via `evaluateConfig`, **and** does a live check:
  connect to `DATABASE_URL` (neon-serverless) and report reachable + a
  **migrations-pending** count (journal entries vs `__drizzle_migrations` rows).
- **Dev-boot banner** — extend existing `apps/web/src/instrumentation.ts`
  `register()`: dev-only, non-blocking warnings only (never prod/test/CI/build),
  static env presence only (no DB round-trip on every boot). Points to
  `pnpm doctor` for the deep check.
- **`pnpm setup`** (`scripts/setup.ts`) — zero-dep Node `readline` wizard: copy
  `.env.example → .env.local` (only if absent; else confirm), generate
  `BETTER_AUTH_SECRET` (`crypto.randomBytes`), default `BETTER_AUTH_URL`, prompt
  for `DATABASE_URL` (skippable), then offer to run `pnpm db:migrate` if a URL
  was given. Non-destructive + re-runnable.
- **Node pin** — `engines.node` (`>=22 <23`) in root `package.json` + `.nvmrc`
  (`22`). pnpm already pinned via `packageManager`.
- **README quickstart** — lead with `pnpm setup`; state the minimum required env
  set; add the missing `pnpm db:migrate` step; mention `pnpm doctor`.
- **`package.json`** — add `doctor` + `setup` scripts.

**Out (deferred):**
- Local Postgres via docker-compose (Tier B; needs a local-dev driver path —
  app uses neon-serverless WebSocket driver).
- `.well-known`/bundle-ID substitution script (Tier B).
- Centralized secrets/services doc (Tier B).
- Auto-running migrations on app boot (explicitly not doing — keep migrate an
  explicit step; the doctor/banner surface pending state instead).
- Blocking dev boot on missing vars (chose non-blocking).

## Approach

**Chosen — shared pure checker in `@mlabs/config`, thin callers.** A new
`packages/config/src/env-doctor.ts` exports `CONFIG_CHECKS` (the var metadata,
mirroring the "Without it: …" copy already in `.env.example`) and a pure
`evaluateConfig(values)`. Three thin consumers call it: `scripts/doctor.ts`
(full + live DB), `instrumentation.ts` (dev banner, static), and it's unit-
testable in isolation. `packages/config` is the right home — CLAUDE.md already
scopes it as the config/"env factory" package, and both root scripts and the
web app import `@mlabs/config` today. The live DB/migrations logic stays in
`scripts/doctor.ts` (reusing `packages/db`'s neon-serverless client +
`drizzle/migrations/meta/_journal.json`), not in the pure module.

This keeps one source of truth for the consequence messages, respects the
"no raw `process.env` outside `env.ts`" hard rule (the pure module takes values;
only the tooling script and framework-glue instrumentation read env, as they're
allowed to), and follows the existing `scripts/*.ts` tsx convention
(`check-contrast.ts`, `verify-deeplinks.ts`, …).

**Alternatives considered:**
- **Option B — duplicate checks in each entry point, no shared module.** Rejected:
  the "Without it" consequence copy would drift across `.env.example`, the
  banner, and the doctor.
- **Option C — doctor-only, no in-app banner (a `pnpm dev:check` script).**
  Rejected: the highest-value moment is the *automatic* signal on `pnpm dev`;
  a separate script forkers must remember defeats the purpose.

## Data model changes

None. (The migrations-pending check only *reads* `__drizzle_migrations`; it does
not create or alter anything.)

## Files to touch

**New:**
- `packages/config/src/env-doctor.ts` — `CONFIG_CHECKS` + `evaluateConfig` (pure).
- `packages/config/src/env-doctor.test.ts` — unit tests for the pure evaluator.
- `scripts/doctor.ts` — `pnpm doctor` (table + live DB + migrations-pending).
- `scripts/setup.ts` — `pnpm setup` (readline wizard).
- `.nvmrc` — `22`.

**Edit:**
- `packages/config/src/index.ts` — export the new module.
- `apps/web/src/instrumentation.ts` — add the dev-only static banner in
  `register()` (keep existing runtime/phase guards; add `NODE_ENV==='development'`).
- `package.json` (root) — add `engines`, `doctor`, `setup` scripts.
- `README.md` — quickstart rewrite (min env set, `pnpm setup`, `pnpm db:migrate`,
  `pnpm doctor`).
- `.env.example` — one-line pointer to `pnpm setup` (optional, keep the rest).
- `FORK_CHECKLIST.md.template` — reference `pnpm setup` / `pnpm doctor` (optional).

## Edge cases

- **Banner must never fire in prod/test/CI/build.** Guard on `NEXT_RUNTIME==='nodejs'`,
  skip `NEXT_PHASE==='phase-production-build'`, and `env.NODE_ENV==='development'`.
- **Doctor DB check must not hang.** Wrap the connect/query in a short timeout;
  on failure report "unreachable: <reason>" and continue (never throw). Distinguish
  "no `DATABASE_URL` set" from "set but unreachable".
- **Migrations-pending on a DB with no `__drizzle_migrations` table** (never
  migrated) → report "0 of N applied — run `pnpm db:migrate`", not an error.
- **`pnpm setup` must not clobber an existing `.env.local`** — detect and ask
  before overwriting; default to merging/keeping. Generating a *new*
  `BETTER_AUTH_SECRET` should not overwrite an existing non-empty one.
- **`BETTER_AUTH_SECRET` needs ≥32 chars** (zod `min(32)`); `randomBytes(32).toString('base64')` satisfies it.
- **Monorepo vs flat** — resolved layout is monorepo; scripts reference
  `apps/web` / `packages/*` as-is (this is the template itself, not a generic app).
- **Node engine as a warning, not a hard block** — set `engines` but do NOT add
  `engine-strict`; a hard failure on Node 21/23 would be worse DX than a warning.

## Acceptance criteria

- [ ] `pnpm setup` on a fresh clone (no `.env.local`) creates `.env.local`,
      writes a valid 32+ char `BETTER_AUTH_SECRET`, sets `BETTER_AUTH_URL`,
      optionally captures `DATABASE_URL`, and offers to migrate — with zero new
      dependencies.
- [ ] Re-running `pnpm setup` with an existing `.env.local` does not clobber it
      without confirmation.
- [ ] `pnpm doctor` prints a readable table showing each var's status +
      consequence, plus a DB section: reachable? and "X of N migrations applied".
- [ ] `pnpm doctor` exits cleanly (no throw) when `DATABASE_URL` is unset or the
      DB is unreachable.
- [ ] Running `pnpm dev` with missing critical vars prints a concise,
      non-blocking warning banner naming what's missing + what breaks + "run
      pnpm doctor"; the server still starts.
- [ ] The banner does NOT print in `pnpm build`, `pnpm start` (prod), tests, or CI.
- [ ] `.nvmrc` = 22 and `package.json` `engines.node` present; `pnpm typecheck`,
      `pnpm lint`, `pnpm test` all pass; new pure evaluator has unit tests.
- [ ] README quickstart lists the minimum env set and includes `pnpm db:migrate`.

## Open questions

For the reviewer (`/mstack-review`) to resolve before implementation.

- **Doctor exit code:** informational (always 0) vs non-zero when a *critical*
  var is missing (so CI/pre-deploy can gate on it). Lean: default 0, add
  `--strict` for non-zero-on-critical. Confirm.
- **`env-doctor.ts` message source:** hard-code the consequence strings in the
  module (accepting slight duplication with `.env.example` prose), or have the
  module be the single source and add a check that `.env.example` stays in sync?
  Lean: module is source of truth; skip the sync-check for now.
- **Which vars count as "critical" for the dev banner** vs merely "recommended"?
  Proposed critical: `DATABASE_URL`, `BETTER_AUTH_SECRET`. Recommended:
  `BETTER_AUTH_URL` (has a default), `POSTMARK_*`. Confirm the split.
- **`instrumentation.ts` reads `NEXT_RUNTIME`/`NEXT_PHASE`** (raw `process.env`) —
  this matches the file's existing documented pattern and is framework glue, but
  confirm it's acceptable under the AGENTS hard rule (env values come from the
  validated `env`; only these framework flags are read raw).
