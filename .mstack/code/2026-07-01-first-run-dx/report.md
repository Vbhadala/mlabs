# Implementation report: Tier A — first-run DX bundle

**Status:** complete
**Review:** [2026-07-01-first-run-dx](../../reviews/2026-07-01-first-run-dx.md)
**Branch:** Vbhadala/replace-admin-email-with-script
**Finished:** 2026-07-01

All 7 tasks implemented, one atomic commit each. Final gate: `pnpm typecheck`,
`pnpm lint`, `pnpm test` (5/5 packages) all green.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Pin Node (engines + .nvmrc) | ✓ done | `f239f29` |
| 2 | env-doctor checker (`@mlabs/config/env-doctor`) + tests | ✓ done | `d6c3434` |
| 3 | `getMigrationStatus()` (`@mlabs/db/status`) + root devDep | ✓ done | `8a9134f` |
| 4 | `pnpm doctor` (env + live DB + `--strict`) | ✓ done | `14ee4c5` |
| 5 | `pnpm setup` (zero-dep readline wizard) | ✓ done | `5e06cdc` |
| 6 | Dev-boot config banner (instrumentation) | ✓ done | `cb5e8b9` |
| 7 | Docs: quickstart + .env.example + fork checklist | ✓ done | `4ae675f` |

Plus two pre-run housekeeping commits: the in-flight admin-email refactor
committed as-is (user request), and the plan+review artifacts.

## Deviations from the review (all logged)

- **T2 test location:** `@mlabs/config` has no vitest runner, so the unit test
  lives in `apps/web/tests/env-doctor.test.ts` (vitest already runs there)
  rather than `packages/config/src/`. Module is pure, so location is immaterial;
  zero new deps.
- **T3 driver:** switched from the WebSocket `Pool` to the neon **HTTP** driver
  for the single read — the Pool emits an out-of-band stream error on an
  unreachable host that escapes try/catch and crashes the process; the HTTP
  driver rejects cleanly. (Also learned: root `scripts/` are CJS, so no
  top-level await — doctor/setup use async `main()`.)
- **T6 guards:** ESLint `no-restricted-syntax` blocks ALL `process.env`,
  including framework `NEXT_*` flags. Dropped those guards; `env.NODE_ENV ===
  "development"` alone correctly confines the banner to dev (build/start run as
  production, tests as test). No lint bypass.

## Follow-ups / human attention

- **Not runtime-verified in this run** (that's `/mstack-qa`'s job): the dev-boot
  banner actually printing on `pnpm dev`, and `pnpm setup`'s interactive
  DATABASE_URL prompt + migrate offer (only the non-interactive paths were
  sandbox-tested). Suggested QA focus: run `pnpm setup` interactively on a fresh
  `.env.local`, then `pnpm dev` with a critical var missing to confirm the banner.
- **Unrelated doc debt (out of scope):** `README.md` still lists "admin
  bootstrap" under `packages/auth` — stale after the admin-email refactor; the
  owning change should clean that up.

## Recommended next step

`/mstack-qa` focused on the first-run flow (`pnpm setup` → `pnpm doctor` →
`pnpm dev` banner).
