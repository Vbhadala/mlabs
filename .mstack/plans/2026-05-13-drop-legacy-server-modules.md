# Plan: Drop legacy duplicate server modules in apps/web

**Date:** 2026-05-13
**Slug:** 2026-05-13-drop-legacy-server-modules
**Status:** reviewed
**Author:** Vinod
**Source TODO:** #32 in `TODOS.md`

---

## Context

The monorepo migration (PR #3) shipped `@mlabs/services` with the canonical
messages + notifications logic, but it left the original implementations in
`apps/web/src/features/{messages,notifications}/server/*` in place to keep the
migration PR reviewable. The duplicates create a "which is canonical?"
ambiguity every time someone touches these features — and 9 consumers
(pages, UI components, dev seeds, cross-feature) still import the legacy
modules instead of the service. This PR finishes the job: rewire all
consumers onto `@mlabs/services`, port the legacy test coverage to the
service package, then delete the legacy modules and tests so `@mlabs/services`
becomes the only entry point.

## Problem

Right now there are two parallel implementations of the same logic:

- `apps/web/src/features/messages/server/{conversations,cursor,errors,messages}.ts`
- `apps/web/src/features/notifications/server/{actions,create,queries}.ts`

vs.

- `packages/services/src/messages/*`
- `packages/services/src/notifications/*`

This hurts:

1. **Forks** — agency devs forking the template don't know which one to
   extend, and end up touching both or the wrong one.
2. **Tests** — the 556-line `apps/web/tests/messages-server.test.ts` and
   249-line `notifications.test.ts` cover the legacy code, while the service
   package has only `notifications/__tests__/service.test.ts` (163 lines) and
   no messages test directory at all. Coverage diverges over time.
3. **Cross-feature contract** — `features/messages/server/messages.ts` reaches
   into `features/notifications/server/create.ts` to fan out a notification
   on message send. That cross-feature hard import only exists because both
   live in apps/web; the service version routes through proper injected
   dependencies.

Success = `@mlabs/services` is the single source of truth, all 9 consumers
import from it, legacy modules are deleted, and the test coverage that used
to live in apps/web now lives next to the service code.

## Scope

**In:**
- Rewire 9 consumer files in `apps/web/src/` to import from
  `@mlabs/services` instead of `@/features/{messages,notifications}/server/*`
- Rename call sites for the 2 functions that changed name
  (`listForUser` → `listConversations`, `unreadCount` → `getUnreadCount`)
- Adapt call sites to the new service signature `(db, ctx, args)` and the
  new wrapped return shapes (`{ items }`, `{ count }`, `{ message }`,
  `{ rows }`)
- Port `apps/web/tests/messages-server.test.ts` (556 lines) in full to
  `packages/services/src/messages/__tests__/service.test.ts`
- Close any coverage gaps in `packages/services/src/notifications/__tests__/service.test.ts`
  by comparing against `apps/web/tests/notifications.test.ts`
- Delete `apps/web/tests/{messages-server,notifications}.test.ts`
- Delete `apps/web/src/features/messages/server/` and
  `apps/web/src/features/notifications/server/` directories
- Delete the stale comment-references in `features/notifications/types.ts`

**Out (deferred):**
- Any behavioural change in messages or notifications (signatures may
  shift, semantics must not)
- Refactoring `@mlabs/services` itself (signatures stay as they are today)
- Migrating the `mark-all-read/route.ts` route handler — it already goes
  through the operation adapter, not the legacy module
- Mobile (`apps/mobile/`) — already calls `@mlabs/services` through the
  shared API layer; not in this PR
- Reconstructing `0005_snapshot.json` (TODO #36, dormant)

## Approach

Branch off `Vbhadala/check-pending-todos`. Open as its own PR (the monorepo
migration PR is already 54 commits — this is feature-shaped cleanup, not
delete-and-go).

**Phase order — tests-first then consumers then deletes:**

1. **Port the messages service test first.** Create
   `packages/services/src/messages/__tests__/service.test.ts` and lift the
   full 556-line `apps/web/tests/messages-server.test.ts` over, adapting
   fixtures to the service contract (inject `db` + `ctx`, unwrap the new
   return shapes in assertions). This is the highest-safety move — once the
   service has equivalent coverage, the rest of the PR is mechanical.
2. **Close notifications test gap.** Diff
   `packages/services/src/notifications/__tests__/service.test.ts` (163
   lines, exists) against `apps/web/tests/notifications.test.ts` (249 lines)
   and add the missing cases to the service test.
3. **Rewire consumers, one commit per file.** ~9 atomic commits, each one
   import-path + signature + return-shape adjustments for a single consumer.
   This keeps every commit narrow enough to bisect, and lets a reviewer
   approve them serially.
4. **Delete legacy tests** (single commit).
5. **Delete legacy server modules** (single commit). At this point nothing
   imports them.
6. **Cleanup commit** for any straggling types or comment references that
   surface during typecheck.

Total: ~12–14 commits. Branch off `Vbhadala/check-pending-todos`. Estimated
3–5 hours focused.

**Alternatives considered:**

- **Thin wrapper module that re-exports service functions under legacy
  names** — rejected. Adds transient indirection and a "delete-me-later"
  commit. The rename is two functions (`listForUser`, `unreadCount`); doing
  them in-place is faster than building scaffolding to defer them.
- **Two big commits (one rewire + one delete)** — rejected. The TODO
  explicitly notes that each consumer has independent risk (UI page imports,
  type mismatches, name aliasing edge cases). Bisecting a regression across
  9 consumers in one commit defeats the point of atomic commits.
- **Delete legacy tests outright without porting** — rejected. The
  messages-server.test.ts has 556 lines of edge-case coverage (cursor edge
  cases, authz boundaries, fan-out semantics). Dropping that floor for the
  sake of scope feels like the wrong tradeoff for a starter template that
  forks rely on.

## Data model changes

None. Service layer already runs against the same `packages/db` schema.

## Files to touch

**New:**
- `packages/services/src/messages/__tests__/service.test.ts` — ported from
  `apps/web/tests/messages-server.test.ts`, adapted to `(db, ctx, args)`
  signatures + wrapped return shapes.

**Edit (9 consumers — one commit each):**
- `apps/web/src/app/(app)/notifications/page.tsx` — `listInbox` from service
- `apps/web/src/app/(app)/messages/page.tsx` — `listForUser` →
  `listConversations` from service
- `apps/web/src/app/(app)/messages/[id]/page.tsx` — `listMessages`,
  `getOtherParticipant`, `MessagesError` from service
- `apps/web/src/features/notifications/components/notification-list.tsx` —
  `markAllRead` + `NotificationRow` type from service
- `apps/web/src/features/notifications/components/notification-item.tsx` —
  `markRead` + `NotificationRow` type from service
- `apps/web/src/app/_dev/notifications/_seed-action.ts` —
  `createNotification` from service
- `apps/web/src/app/_dev/messages/_seed-action.ts` — `openOrCreate1to1`,
  `sendMessage` from service
- `apps/web/src/features/messages/server/messages.ts` — temporarily edit to
  use service `createNotification` (cross-feature). This file is then
  deleted in the delete phase. (Alternative: skip this rewire and delete
  the whole file in step 5 — see Open questions.)
- `apps/web/src/features/notifications/types.ts` — drop the stale comment
  reference to `features/messages/server/messages.ts`

**Edit (test):**
- `packages/services/src/notifications/__tests__/service.test.ts` — add
  cases missing vs. `apps/web/tests/notifications.test.ts`

**Delete:**
- `apps/web/tests/messages-server.test.ts`
- `apps/web/tests/notifications.test.ts`
- `apps/web/src/features/messages/server/{conversations,cursor,errors,messages}.ts`
- `apps/web/src/features/notifications/server/{actions,create,queries}.ts`

## Function rename map

| Legacy (apps/web) | Service (@mlabs/services) |
|---|---|
| `listForUser(userId)` | `listConversations(db, ctx)` → `{ items }` |
| `unreadCount(userId)` | `getUnreadCount(db, ctx)` → `{ count }` |
| `listInbox(userId)` | `listInbox(db, ctx)` → `{ rows }` |
| `listMessages(args)` | `listMessages(db, ctx, args)` → `{ items }` |
| `sendMessage(args)` | `sendMessage(db, ctx, args)` → `{ message }` |
| `markConversationRead(args)` | `markConversationRead(db, ctx, args)` → `{ ok: true }` |
| `markRead(id)` | `markRead(db, ctx, { id })` |
| `markAllRead()` | `markAllRead(db, ctx)` |
| `openOrCreate1to1(args)` | `openOrCreate1to1(db, ctx, args)` |
| `createNotification(args)` | `createNotification(db, ctx, args)` |
| `getOtherParticipant(args)` | **(verify)** — not surfaced in service exploration |
| `requireParticipant(args)` | **(verify)** — used only in tests, may be inlined |
| `encodeCursor` / `decodeCursor` | Same names, exported from `messages/cursor` |
| `MessagesError`, `MessagesErrorCode` | Same names (verify location in service) |

## Edge cases

- **Cross-feature fan-out** — `sendMessage` in the legacy module calls
  `createNotification` synchronously. The service version must preserve
  this contract. Verify in the ported test that sending a message produces
  the expected notification row.
- **`getOtherParticipant` / `requireParticipant` missing from service** —
  verification found these in legacy code but not enumerated in the service
  exports. Either: (a) they're exported under a different module path the
  exploration missed, or (b) they need adding to the service. Resolve in
  /mlabs-review.
- **Return-shape unwrapping** — every consumer that destructures a bare
  array (e.g. `const conversations = await listForUser(userId)`) must adapt
  to `const { items } = await listConversations(db, ctx)`. Easy to miss in
  a hot reload; typecheck will catch.
- **NotificationRow type location** — `notification-list.tsx` and
  `notification-item.tsx` currently import the type from
  `@/features/notifications/server/queries`. Service must export an
  equivalent type, or consumers need to import from `@mlabs/services` or a
  shared types file. Verify location.
- **Dev seeds reach into db directly** — `_seed-action.ts` files inject
  their own db handle. Confirm the service contract accepts whatever
  handle/ctx shape the dev seeds provide.
- **Existing pre-existing TS errors** (per memory: feedback_migration_gotchas)
  may obscure new ones — run typecheck before starting to establish a
  baseline.

## Acceptance criteria

- [ ] `packages/services/src/messages/__tests__/service.test.ts` exists and
      its test count ≥ `apps/web/tests/messages-server.test.ts`'s test count
- [ ] `packages/services/src/notifications/__tests__/service.test.ts`
      covers every behaviour that `apps/web/tests/notifications.test.ts`
      did (manual diff in PR description)
- [ ] All 9 consumer files import from `@mlabs/services`, not
      `@/features/{messages,notifications}/server/*`
- [ ] `apps/web/src/features/messages/server/` and
      `apps/web/src/features/notifications/server/` directories do not
      exist
- [ ] `apps/web/tests/messages-server.test.ts` and
      `apps/web/tests/notifications.test.ts` do not exist
- [ ] `pnpm typecheck` passes (with the existing baseline of pre-monorepo TS
      errors unchanged — no new errors introduced)
- [ ] `pnpm --filter @mlabs/services test` passes
- [ ] `pnpm --filter @mlabs/web test` passes (without the deleted suites)
- [ ] Manual smoke: cold-boot `apps/web`, sign in, open
      `/messages`, `/messages/[id]`, `/notifications`, mark a notification
      read, send a message and confirm the recipient gets a notification
- [ ] PR is ~12–14 commits, one consumer per commit, with the test-port and
      delete commits clearly labelled
- [ ] Branch is `Vbhadala/check-pending-todos` (or a child of it)

## Verification

1. Establish typecheck baseline before starting:
   `pnpm typecheck 2>&1 | tee /tmp/typecheck-before.log`
2. After all rewires, run:
   `pnpm typecheck 2>&1 | tee /tmp/typecheck-after.log` and diff against
   the baseline — no new errors.
3. Run targeted test suites:
   - `pnpm --filter @mlabs/services test`
   - `pnpm --filter @mlabs/web test`
4. Manual smoke as in the last acceptance criterion above (the cold-boot
   walkthrough that TODO #31 also requires).
5. Sanity grep: after deletes,
   `rg "features/(messages|notifications)/server" apps/` should return
   zero hits.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation:

1. **Are `getOtherParticipant` and `requireParticipant` already in
   `@mlabs/services`?** Exploration didn't surface them by name. If
   absent: (a) add them to the service in a pre-rewire commit, or (b)
   inline them at the page-level caller. Locking this affects the commit
   count.
2. **Where does `NotificationRow` (the type) live in the service?** If
   it's not exported, do we add it as a public type or generate from the
   service return shape?
3. **`features/messages/server/messages.ts` — rewire then delete, or
   delete in one move?** The file is itself a legacy module slated for
   deletion. Rewiring its cross-feature call to the service before
   deleting feels redundant. Option: skip step 8 in "Edit" and just delete
   the file in the delete phase, after all of its consumers have moved off
   it. Reviewer's call.
4. **Should the PR also delete the now-orphaned
   `features/notifications/types.ts` comment block** (which references the
   to-be-deleted messages server), or leave the file (which still has
   live exports) intact with a one-line edit?
5. **Is there a CI workflow that asserts no imports from
   `features/*/server/`?** If so we can add a lint rule in this PR to
   prevent regressions.
