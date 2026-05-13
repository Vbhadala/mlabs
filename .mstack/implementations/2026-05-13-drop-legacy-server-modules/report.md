# Implementation report: Drop legacy duplicate server modules

**Date:** 2026-05-13
**Slug:** 2026-05-13-drop-legacy-server-modules
**Branch:** Vbhadala/check-pending-todos
**Status:** complete

---

## Outcome

All 18 planned tasks executed without pauses. Net effect:

- `apps/web/src/features/messages/server/` and `apps/web/src/features/notifications/server/`
  deleted (6 legacy files, ~614 lines).
- `apps/web/tests/messages-server.test.ts` (556 lines) + `apps/web/tests/notifications.test.ts`
  (249 lines) deleted.
- 9 consumers (3 pages, 2 components, 2 dev seeds, 2 ad-hoc cleanups)
  rewired to import from `@mlabs/services`.
- Service package gains: `getOtherParticipant`, `_requireParticipant`
  export, ported 556-line messages test (15 cases), 3 gap-closing
  notifications cases.
- `apps/web/src/features/notifications/server-actions.ts` (renamed from
  `server/actions.ts`) survives as the Server Action shim that the two
  client components call into.
- New helper `getCallerContext()` in `apps/web/src/lib/auth/server.ts`
  builds a fully-formed `CallerContext` from `requireUser()` in one
  line. Used by all 7 service consumer sites.

`@mlabs/services` is now the single source of truth for messages +
notifications. The legacy duplicate-implementation question goes away.

## Verification

| Check | Result |
|---|---|
| `pnpm typecheck` | 10/10 packages pass (matches baseline) |
| `pnpm --filter @mlabs/web test` | 18 files / 160 tests pass |
| `pnpm --filter @mlabs/services test` | 3 files / 41 tests pass (was 23 pre-run) |
| `rg "features/(messages\|notifications)/server/" apps/` | 0 hits |

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 0 | Setup: install deps + setup commit | ✓ done | `438ebd6b` |
| 1 | Capture typecheck baseline | ✓ done | (no commit — out-of-tree) |
| 1.5 | Add `getCallerContext()` helper | ✓ done | `0cddef14` |
| 2 | Add `getOtherParticipant` to messages service | ✓ done | `9a3c9c73` |
| 3 | Export `_requireParticipant` from messages service | ✓ done | `6e760e74` |
| 4 | Port messages-server.test.ts to service | ✓ done | `a7fb5701` |
| 5 | Close notifications test coverage gap | ✓ done | `03bef77f` |
| 6 | Rewire `(app)/notifications/page.tsx` | ✓ done | `b1befb13` |
| 7 | Rewire `(app)/messages/page.tsx` | ✓ done | `af95bc45` |
| 8 | Rewire `(app)/messages/[id]/page.tsx` | ✓ done | `3da438fc` |
| 9 | Rewire `notification-list.tsx` type import | ✓ done | `7517fe82` |
| 10 | Rewire `notification-item.tsx` type import | ✓ done | `ef1bdea8` |
| 11 | Rewire `_dev/notifications/_seed-action.ts` | ✓ done | `6a773457` |
| 12 | Rewire `_dev/messages/_seed-action.ts` | ✓ done | `365bc244` |
| 13 | Move actions.ts out of `/server/` | ✓ done | `fdf244bc` |
| 14 | Delete legacy tests | ✓ done | `9aa5c0d6` |
| 15 | Delete legacy server modules | ✓ done | `320218e2` |
| 16 | Cleanup straggling references | ✓ done | `b6afa8d7` |
| 17 | Final verification + report | ✓ done | (this file) |

17 code commits + 1 setup commit = **18 commits total on this branch**.

## Notable in-run adjustments

1. **Task 13 absorbed a transient legacy-test edit.** Moving `actions.ts`
   into its new home broke the `tests/notifications.test.ts` import.
   Rather than let typecheck fail across an atomic commit (then heal in
   Task 14), the same commit updated the legacy test's import path —
   even though the file is deleted one commit later. Cost: 1 line of
   churn; benefit: every commit independently typecheck-clean, which
   matters for bisect-ability.

2. **`NotificationRow` import path.** The review prescribed
   `import type { NotificationRow } from "@mlabs/services"`. That doesn't
   compile because the root barrel uses `export * as notifications` —
   `NotificationRow` lives under the namespace, not at top level. Settled
   on the published subpath `@mlabs/services/notifications`, which IS a
   barrel (notifications/index.ts) and respects the "don't reach into
   ./service" convention. Same applies to all type-only imports.

3. **`_requireParticipant` is intentionally exported.** Tests import it
   directly to exercise the predicate's "wrong conv vs not in it" branch
   without going through a public method. The underscore prefix is the
   convention signal.

## Follow-ups

None blocking. The PR is ready to open. Suggestions for separate work:

- **ESLint rule.** Add a `no-restricted-imports` pattern banning future
  imports from `apps/web/src/features/*/server/` so the directories
  can't quietly reappear. Worth a ~10-line config tweak in its own PR.
- **Reconstruct `0005_snapshot.json` in `packages/db`** (TODO #36) —
  dormant until next schema change.
- **Set up `jest-expo` on apps/mobile** (TODO #34) — next opportune
  moment.

## Manual smoke (user-side)

Per the skill rules, e2e/Playwright is out of scope here. The user
should cold-boot the web app before merging:

```
pnpm --filter @mlabs/web dev
```

Walk: sign in → /messages → open a thread → send a message → confirm
notification reaches the recipient → /notifications → mark one as read
→ mark all as read.

## Recommended next step

`/mlabs-qa` with focus on messages + notifications (specifically:
participant-check 404 path, send fan-out, mark-read cascade). The
service test suite covers the unit-level behaviour but the
production-path wiring (operations adapter, Server Actions, polling)
isn't unit-tested.
