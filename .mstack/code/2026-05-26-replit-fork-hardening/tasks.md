# Implementation: Replit fork hardening

**Started:** 2026-05-26
**Review:** [2026-05-26-replit-fork-hardening](../../reviews/2026-05-26-replit-fork-hardening.md)
**Branch:** Vbhadala/pnpm-cloud-setup-token
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add Tailwind `@source` for workspace packages
  - Files: `apps/web/src/app/globals.css`
  - Commit: `2bd9209`
  - Notes: build verified.

- [x] **Task 2:** Wire Better Auth `trustedOrigins` through `createAuth`
  - Files: `packages/auth/src/server.ts`, `apps/web/src/lib/auth/origins.ts` (new), `apps/web/src/lib/auth/index.ts`
  - Commit: `c879cee`
  - Notes: pause-if cleared — Better Auth's typing accepts `string[]`.

- [x] **Task 3:** Unit test `buildTrustedOrigins`
  - Files: `apps/web/tests/auth-trusted-origins.test.ts` (new)
  - Commit: `95ff191`
  - Notes: 5/5 assertions passing.

- [x] **Task 4:** Update `next.config.mjs` `allowedDevOrigins`
  - Files: `apps/web/next.config.mjs`
  - Commit: `bd8186f`
  - Notes: tripped lint (raw `process.env`) — fixed in Task 5 by broadening the eslint carve-out glob.

- [x] **Task 5:** Document fork hardening in `.env.example` and `TEMPLATE.md`
  - Files: `.env.example`, `docs/template/TEMPLATE.md`, `apps/web/eslint.config.mjs` (carve-out glob fix)
  - Commit: `8529d5f`
  - Notes: also fixed identical `.ts`→`.mjs` typo in TEMPLATE.md row 11.
