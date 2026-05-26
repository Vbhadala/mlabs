# Review: Replit fork hardening (Tailwind scan + Better Auth trustedOrigins + Next.js HMR)

**Date:** 2026-05-26
**Slug:** 2026-05-26-replit-fork-hardening
**Plan reviewed:** [2026-05-26-replit-fork-hardening.md](../plans/2026-05-26-replit-fork-hardening.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is approved with three meaningful corrections from reading Better Auth
1.6.11's actual source. (1) Better Auth already auto-trusts
`new URL(baseURL).origin`, so `BETTER_AUTH_URL` does **not** need to go into
our helper — drop it. (2) Better Auth natively reads
`BETTER_AUTH_TRUSTED_ORIGINS` (comma-separated env) — document this as the
fork escape hatch for custom domains; no code wiring needed. (3) Fold the
stale `next.config.ts` → `.mjs` reference and the new hardening rows into
`TEMPLATE.md` as part of this PR (the same TEMPLATE row already documents
`allowedDevOrigins`). One pause-if added to Task 2 in case Better Auth's
typing doesn't accept `string[]` directly.

## Findings

### Blockers (must fix before /mlabs-code)

- None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan pushes `BETTER_AUTH_URL` into `trustedOrigins`, but
  Better Auth 1.6.11's `getTrustedOrigins` (in
  `node_modules/better-auth/dist/context/helpers.mjs`) already pushes
  `new URL(baseURL).origin` unconditionally. Adding it again is redundant
  and risks normalization mismatch (`https://x.com/` vs `https://x.com`).
  **Decision:** Drop `BETTER_AUTH_URL` from the helper. Helper input is
  just `replitDevDomain?: string`; output is
  `[http://localhost:3000, http://localhost:5000, https://${replitDevDomain}]`
  with the Replit entry only when the env is set.

- **Concern:** Better Auth already supports a `BETTER_AUTH_TRUSTED_ORIGINS`
  env var natively (same `helpers.mjs`:
  `if (envTrustedOrigins) trustedOrigins.push(...envTrustedOrigins.split(","))`).
  The plan's question-1 answer ("no new env") was correct — but forks
  hitting a custom-domain `Invalid origin` 403 can use this var without
  any template changes.
  **Decision:** Document it. Add a commented line to `.env.example`
  alongside the existing `BETTER_AUTH_URL` block, and add a row in
  `TEMPLATE.md` calling it out as the escape hatch for non-Replit custom
  domains. No code wiring.

- **Concern:** `TEMPLATE.md` row 2 references `apps/web/next.config.ts`
  but the actual file is `next.config.mjs` (the file's leading comment
  explains why). Cleaning this up now avoids confusing future forks
  who grep the doc.
  **Decision:** Fix the typo in row 2, update its description to
  mention `*.kirk.replit.dev` + dynamic `REPLIT_DEV_DOMAIN`, and add
  two new rows for the Tailwind `@source` fix and the Better Auth
  `trustedOrigins` wiring. Bundle this with the other TEMPLATE.md
  edits so it's one coherent doc commit.

- **Concern:** `process.env.REPLIT_DEV_DOMAIN` in `next.config.mjs`
  reads raw `process.env`, which `AGENTS.md` discourages in app code.
  **Decision:** Accepted — `next.config.mjs` is build-time config that
  runs **before** the env validator can load. Same pattern is already
  used in the file's existing comments. No change needed beyond what
  the plan proposes.

- **Concern:** Better Auth typing for `trustedOrigins` is
  `string[] | ((req: Request) => string[] | Promise<string[]>)`. Our
  `string[]` form is supported per source. If a future bump changes
  the typing, the autopilot must escalate.
  **Decision:** Add a **Pause if** to Task 2.

### Suggestions (taken or deferred)

- Move `buildTrustedOrigins` to a dedicated file
  (`apps/web/src/lib/auth/origins.ts`) for testability. **Taken** —
  pure helper in its own file makes the unit test cleaner and removes
  the boot-time-import concern; cost is one extra file.
- Add a comment in the helper explaining that we deliberately do **not**
  add `BETTER_AUTH_URL` to the list because Better Auth auto-trusts it.
  **Taken.**
- Make the Tailwind glob narrower (only `packages/ui-web/src/**`) to
  avoid scanning service/db/auth packages that don't ship JSX.
  **Deferred** — per the plan's Q2, future-proof glob was the locked
  choice. Tailwind v4's scanner is fast on TS-only files; the cost is
  negligible.

## Decisions locked

Net new decisions beyond what was in the plan:

- **Helper signature simplified.** `buildTrustedOrigins(input: { replitDevDomain?: string }): string[]` —
  no `betterAuthUrl` input (redundant with Better Auth's own auto-trust).
- **Helper lives in its own file.** `apps/web/src/lib/auth/origins.ts`,
  not co-located in `index.ts`. (Updates plan's Q1.)
- **`BETTER_AUTH_TRUSTED_ORIGINS` documented but not wired.** Add one
  commented `.env.example` line + one `TEMPLATE.md` row pointing at
  Better Auth's native support. (Updates plan's Q2 with a more concrete
  outcome.)
- **TEMPLATE.md row 2 updated inline.** Fix `.ts`→`.mjs` typo, add
  cluster wildcard + dynamic-domain language. Add two new rows for
  items 1 and 2.
- **Test stays a pure-helper test, no env mocking.** (Confirms plan's Q3.)
- **Tailwind `@source` path:** `../../../../packages/*/src/**/*.{ts,tsx}` —
  resolves from `apps/web/src/app/globals.css` four levels up to the
  repo root's `packages/`. Counted: `src/app` → `src` → `web` → `apps` → repo root. (Confirms plan's Q4.)

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. One commit per
task. Conventional Commits style; all `fix(template):` scope.

### Task 1: Add Tailwind `@source` for workspace packages

- **Files:** `apps/web/src/app/globals.css` (edit)
- **What:** Add a single `@source "../../../../packages/*/src/**/*.{ts,tsx}";`
  directive near the top of the file (after the `@import` block, before
  `@custom-variant dark`). Glob is repo-root-relative through `../../../../`
  so Tailwind v4 picks up workspace-package JSX that pnpm symlinks to
  `node_modules` (which Tailwind v4 otherwise excludes from auto-scan).
- **Acceptance:** `pnpm --filter @mlabs/web build` succeeds. As a sanity
  check, grep the emitted CSS in `apps/web/.next/static/css/*.css` for
  a class that only appears in `packages/ui-web/src/components/*.tsx`
  (e.g. one from `password-input.tsx` or `field.tsx`) and confirm it's
  present. If `@mlabs/ui-web` doesn't yet ship any unique-to-package
  classes, the build-success criterion alone is sufficient.

### Task 2: Wire Better Auth `trustedOrigins` through `createAuth`

- **Files:**
  - `packages/auth/src/server.ts` (edit)
  - `apps/web/src/lib/auth/origins.ts` (new)
  - `apps/web/src/lib/auth/index.ts` (edit)
- **What:**
  1. In `packages/auth/src/server.ts`, add to `CreateAuthOptions`:
     ```ts
     /** Optional. Allowed Origin headers for /api/auth/*. Better Auth
      *  already auto-trusts new URL(baseUrl).origin; supply additional
      *  origins here for cross-port localhost (dev) or Replit preview
      *  (browser hits *.replit.dev while server runs at localhost:5000). */
     trustedOrigins?: string[]
     ```
     Destructure in `createAuth({...})` and pass through to
     `betterAuth({ trustedOrigins })`.
  2. Create `apps/web/src/lib/auth/origins.ts` exporting a pure helper:
     ```ts
     export function buildTrustedOrigins(input: {
       replitDevDomain?: string | undefined
     }): string[] {
       // Better Auth already auto-trusts new URL(baseURL).origin (see
       // node_modules/better-auth/dist/context/helpers.mjs), so we
       // deliberately do NOT include BETTER_AUTH_URL here. We add only
       // the cross-port localhost entries (dev) and the Replit preview
       // host (browser-vs-server host mismatch).
       const list = ["http://localhost:3000", "http://localhost:5000"]
       if (input.replitDevDomain) {
         list.push(`https://${input.replitDevDomain}`)
       }
       return list
     }
     ```
  3. In `apps/web/src/lib/auth/index.ts`, import the helper and pass its
     result into `createAuth({ trustedOrigins: buildTrustedOrigins({ replitDevDomain: env.REPLIT_DEV_DOMAIN }) })`.
- **Acceptance:**
  - `packages/auth/src/server.ts` `CreateAuthOptions` exposes
    `trustedOrigins?: string[]`.
  - `betterAuth({...})` receives `trustedOrigins` (verifiable by
    `grep -n "trustedOrigins" packages/auth/src/server.ts`).
  - `apps/web/src/lib/auth/origins.ts` exists and exports
    `buildTrustedOrigins`.
  - `apps/web/src/lib/auth/index.ts` calls `createAuth({ trustedOrigins })`
    with the helper's output.
  - `pnpm typecheck` clean.
- **Pause if:** Better Auth's TypeScript surface rejects `string[]` for
  the `trustedOrigins` option (i.e. the type narrows to a function-only
  shape in the published `.d.mts`). In that case, stop and ask before
  casting or refactoring to the `(req) => string[]` form — there's a
  decision to make about whether to depend on the static-array path or
  pre-compute on each request.

### Task 3: Unit test `buildTrustedOrigins`

- **Files:** `apps/web/tests/auth-trusted-origins.test.ts` (new)
- **What:** Vitest test mirroring the pattern in
  `apps/web/tests/example.test.ts`. Four cases:
  1. `replitDevDomain` set → list contains `https://${value}`.
  2. `replitDevDomain` unset → list does not contain `https://...`.
  3. Both cases include `http://localhost:3000` and `http://localhost:5000`.
  4. Output is a plain `string[]` (no duplicates from
     idempotent calls).
  No env mocking, no Better Auth boot. Pure helper test.
- **Acceptance:** `pnpm --filter @mlabs/web test` runs and the new file
  reports ≥4 passing assertions. `pnpm test` from the repo root also
  passes.

### Task 4: Update `next.config.mjs` `allowedDevOrigins`

- **Files:** `apps/web/next.config.mjs` (edit)
- **What:** Extend the `allowedDevOrigins` array literal to include
  `"*.kirk.replit.dev"` and dynamically push `process.env.REPLIT_DEV_DOMAIN`
  when set:
  ```js
  allowedDevOrigins: [
    "127.0.0.1",
    "*.replit.dev",
    "*.repl.co",
    "*.worf.replit.dev",
    "*.kirk.replit.dev",
    ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
  ],
  ```
  Add a one-line comment above the new entries explaining: Replit's
  newer workspace cluster domains are two-level (`*.kirk.replit.dev`),
  and the dynamic push covers any future cluster prefix.
- **Acceptance:** `apps/web/next.config.mjs` contains both new entries.
  `pnpm --filter @mlabs/web build` still succeeds. `pnpm typecheck`
  clean (the JSDoc-typed config still validates).

### Task 5: Document fork hardening in `.env.example` and `TEMPLATE.md`

- **Files:**
  - `.env.example` (edit)
  - `docs/template/TEMPLATE.md` (edit)
- **What:**
  1. **`.env.example`:** below the existing `BETTER_AUTH_URL` line
     (around line 32), add a commented block:
     ```
     # BETTER_AUTH_TRUSTED_ORIGINS: comma-separated list of additional
     # allowed Origin headers for /api/auth/*. Better Auth already trusts
     # the BETTER_AUTH_URL origin automatically. Set this on custom-domain
     # deploys where the browser Origin differs from BETTER_AUTH_URL.
     # BETTER_AUTH_TRUSTED_ORIGINS=https://app.example.com,https://www.example.com
     ```
  2. **`TEMPLATE.md`:**
     - Fix row 2: change `apps/web/next.config.ts` → `apps/web/next.config.mjs`;
       update the description to mention `*.kirk.replit.dev` and the dynamic
       `REPLIT_DEV_DOMAIN` push.
     - Add a new row (after the existing row 12, continuing the numbered
       sequence) for **Tailwind `@source` for workspace packages** — file
       `apps/web/src/app/globals.css`, reason "Tailwind v4 excludes
       `node_modules` from auto-scan, so pnpm-symlinked workspace packages
       are invisible without an explicit `@source` glob."
     - Add another new row for **Better Auth `trustedOrigins` defaults** —
       files `packages/auth/src/server.ts` + `apps/web/src/lib/auth/{origins.ts,index.ts}`,
       reason "Better Auth auto-trusts `baseURL` origin only; cross-port
       localhost and `*.replit.dev` browser hosts otherwise 403 with
       'Invalid origin'. Forks with custom domains can use
       `BETTER_AUTH_TRUSTED_ORIGINS` env var (Better Auth reads it natively)."
- **Acceptance:** Both files updated. `pnpm lint` clean. `pnpm typecheck`
  clean (these are doc/env files; no compile impact).

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **Task 2 Pause-if** is the only escalation point. If Better Auth's
  `string[]` shape is rejected, stop — the function-form refactor is a
  design decision, not an autopilot fix.

