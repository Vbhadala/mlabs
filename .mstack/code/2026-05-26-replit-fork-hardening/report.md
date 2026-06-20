# Implementation report: Replit fork hardening

**Status:** complete
**Review:** [2026-05-26-replit-fork-hardening](../../reviews/2026-05-26-replit-fork-hardening.md)
**Branch:** Vbhadala/pnpm-cloud-setup-token
**Commits:** 6 (1 preamble + 5 implementation)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 0 | Preamble: plan + review artifacts | ✓ | `76f2142` |
| 1 | Tailwind `@source` for workspace packages | ✓ | `2bd9209` |
| 2 | Wire Better Auth `trustedOrigins` through `createAuth` | ✓ | `c879cee` |
| 3 | Unit test `buildTrustedOrigins` | ✓ | `95ff191` |
| 4 | Update `next.config.mjs` `allowedDevOrigins` | ✓ | `bd8186f` |
| 5 | Document fork hardening + eslint glob fix | ✓ | `8529d5f` |

## Commits

- `76f2142` chore: add plan + review for Replit fork hardening
- `2bd9209` fix(template): add Tailwind @source for workspace packages
- `c879cee` fix(auth): wire trustedOrigins through createAuth
- `95ff191` test(auth): unit-test buildTrustedOrigins helper
- `bd8186f` fix(template): cover newer Replit cluster wildcards in allowedDevOrigins
- `8529d5f` docs(template): document Replit fork hardening + fix eslint glob for next.config.mjs

## Verification

- **`pnpm typecheck`:** 10/10 packages clean
- **`pnpm lint`:** clean (after fixing the stale `next.config.ts` glob in
  `apps/web/eslint.config.mjs` — see below)
- **`pnpm test`:** 167/167 tests pass, including 5 new `buildTrustedOrigins` assertions
- **`pnpm --filter @mlabs/web build`:** succeeds with new `@source` directive

## Pause-if checkpoints

- **Task 2 pause-if (Better Auth typing rejects `string[]`)** — cleared before
  edits: verified the type def in
  `node_modules/@better-auth/core/dist/types/init-options.d.mts` accepts
  `string[] | ((req) => ...)`. No pause needed.

## Net-new changes beyond the review

Two small additions were needed but not anticipated in the review:

1. **Fixed stale `next.config.ts` typo in `apps/web/eslint.config.mjs`.** The
   carve-out glob disabling `no-restricted-syntax` for the Next config was
   scoped to `next.config.ts`, but the file is `.mjs` (has been since before
   this PR). Task 4's `process.env.REPLIT_DEV_DOMAIN` therefore tripped lint
   on first run. Broadened the glob to `next.config.{ts,mjs}` and inlined a
   comment pointing to `next.config.mjs`'s header for the rationale. Folded
   into the Task 5 commit since it's documentation-of-intent + a typo fix.
2. **Fixed the same stale `next.config.ts` typo in `TEMPLATE.md` row 11.**
   The review scoped row 2; row 11 had the identical typo and was
   inconsistent to leave. Folded into the Task 5 commit.

## Follow-ups

- **`/mlabs-qa` on Replit** — these fixes are infra-level; the visible
  outcome is "fewer fork-day-1 papercuts." A manual Replit fork is the
  realest verification.
- **`TEMPLATE.md` line 28 says "Changes 5–14"** — confirmed correct after
  the row additions; row 14 is the highest now.

## Recommended next step

`/mlabs-qa` — scenario-driven Playwright pass focused on the auth flows
(login / signup / password reset) to confirm that `trustedOrigins` doesn't
regress any cookie-handling on the standard localhost dev path. The Replit
preview path itself can only be verified manually on a Replit workspace.
