# Review: Drop legacy duplicate server modules in apps/web

**Date:** 2026-05-13
**Slug:** 2026-05-13-drop-legacy-server-modules
**Plan reviewed:** [2026-05-13-drop-legacy-server-modules.md](../plans/2026-05-13-drop-legacy-server-modules.md)
**Status:** approved
**Reviewer:** Vinod (via /mlabs-review)

---

## Summary

Plan is sound in direction but had two real factual errors and three latent
decisions that needed locking before `/mlabs-code` can run autonomously.
Reading the actual code surfaced:

1. `notifications/server/actions.ts` is **not** a legacy duplicate — it's the
   post-migration Server Action shim that already calls operations.
   Misidentified by the original TODO. Decision: move it out of `/server/`,
   don't delete it.
2. The messages service throws `ApiError` (from `@mlabs/api`), not
   `MessagesError`. The page that catches `MessagesError` needs a real
   rewrite, not just an import swap.
3. `getOtherParticipant` is not in the service at all — needs adding.
4. `requireParticipant` is a private helper in the service — the ported test
   needs an internal-but-exported entry point.
5. ESLint blocks reaching into `@mlabs/services/messages/service` directly;
   all consumers + tests must import from the `@mlabs/services` barrel.

Net effect: scope grew by 2 service-package commits (getOtherParticipant,
`_requireParticipant` export), 1 web-auth-helper commit
(`getCallerContext()`), and 1 rename commit (actions.ts move), but the
high-level shape from the plan (test-first, atomic per-consumer commits,
delete last) stands. The PR ends up at ~17–18 commits, still well under
the 54-commit monorepo migration that made deferral the right call.

## Findings

### Blockers (must fix before /mlabs-code)

- **`notifications/server/actions.ts` is not legacy.** The plan and the
  source TODO both list it for deletion, but it already routes through
  `@/server/operations/notifications` → `@mlabs/services`. It is the
  post-migration Server Action shim that the two client components
  (`notification-list.tsx` calling `markAllRead`, `notification-item.tsx`
  calling `markRead`) depend on. Resolved: keep the file, move it out of
  the `/server/` directory (decision below).

- **`MessagesError` does not exist in `@mlabs/services`.** The service uses
  `ApiError.notFound("messages.not_found", ...)` from `@mlabs/api`. The
  page `messages/[id]/page.tsx` currently does
  `if (err instanceof MessagesError && err.code === "not_found")` — that
  specific pattern has no semantic 1:1 swap; we rewrite to catch `ApiError`
  and check `err.code === "messages.not_found"`. Resolved below.

### Concerns (raised, decided, recorded)

- **Concern:** `getOtherParticipant` (used only by `messages/[id]/page.tsx`)
  is not exported from `@mlabs/services`. The legacy module defined it,
  the service migration didn't carry it over.
  **Decision:** Add `getOtherParticipant(db, ctx, { conversationId })` to
  `packages/services/src/messages/service.ts` as a new public export. One
  service-package commit upfront, before the consumer rewires. Avoids
  duplicating the query at the page level and keeps the inbox/thread surface
  uniform across the service.

- **Concern:** The 556-line legacy test imports `requireParticipant`
  directly to test the predicate's throw behaviour. The service version
  is private (internal helper).
  **Decision:** Add a named export `_requireParticipant` to
  `packages/services/src/messages/service.ts` (underscore prefix signals
  "internal — for tests only"). Cleaner test code; the surface-area leak is
  small and intentionally signalled.

- **Concern:** The `features/notifications/server/` directory survives if
  we only delete the two true legacy files (`create.ts`, `queries.ts`) and
  keep `actions.ts`. That contradicts the TODO's "shrink apps/web surface
  area" framing.
  **Decision:** Move `actions.ts` to `features/notifications/server-actions.ts`
  (one level up, renamed). The two component imports update accordingly.
  Both `/server/` directories get fully deleted. One extra commit for the
  move.

- **Concern:** Cross-feature import — `features/messages/server/messages.ts`
  imports `createNotification` from `features/notifications/server/create.ts`
  — looks like it needs rewiring per the plan's Edit list.
  **Decision:** Skip. The legacy `messages.ts` file is being deleted in
  Phase 6, not rewired. The service version already handles the fan-out
  internally (`packages/services/src/messages/service.ts` line 407 calls
  `createNotification` from `../notifications`). No transient rewire
  needed.

- **Concern:** The ESLint `no-restricted-imports` rule blocks reaching into
  `@mlabs/services/messages/service` from outside the package; everything
  must go through the `@mlabs/services` barrel (or its domain barrels).
  Affects the ported test and the page rewires.
  **Decision:** All imports use `@mlabs/services` barrel, namespace-style:
  `import { messages, notifications } from "@mlabs/services"` then
  `messages.listConversations(...)`. Consistent with how
  `apps/web/src/server/operations/messages.ts` already imports.

- **Concern:** Pre-existing TS errors (from `feedback_migration_gotchas`)
  may obscure real new errors during the rewires.
  **Decision:** Task 1 captures a typecheck baseline before any edits; final
  task asserts no new errors above the baseline. Pre-existing errors stay
  pre-existing.

### Suggestions (taken or deferred)

- **Add a lint rule banning future imports from `apps/web/src/features/*/server/`.**
  Deferred — out of scope for this PR. Worth a separate ~10-line ESLint
  config tweak once these directories are deleted.

- **Reconcile the operation adapter's MessagesError handling** —
  `apps/web/src/server/operations/messages.ts` may or may not catch
  `ApiError` correctly. Taken: the typecheck pass will surface any
  mismatch; if operations need a tweak, it lands in the cleanup commit.

- **Port jest mocks / fixtures from the legacy test verbatim** rather than
  rewriting. Taken — the test-port commit should be mechanically as close
  to a cherry-pick as possible. Adapt fixtures only where the service
  contract requires it (db+ctx injection, wrapped return shapes, ApiError
  vs MessagesError).

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

1. **Keep `actions.ts`** — only `create.ts` and `queries.ts` are legacy
   duplicates in notifications. Move `actions.ts` to
   `features/notifications/server-actions.ts` so the `/server/` dir is
   fully removable.
2. **Add `getOtherParticipant` to the messages service** as a first-class
   public export. Returns `{ otherUser: { id, name, image } | null }`
   with `LIMIT 1` — matches legacy and the existing `listConversations`
   convention. Group conversations (v2) is a separate design pass.
3. **Rewrite the `MessagesError` catch in `messages/[id]/page.tsx`** to
   catch `ApiError` and check `err.code === "messages.not_found"`. Semantic
   1:1 with current behaviour.
4. **Add `_requireParticipant` named export** to the service so the ported
   test can exercise the predicate directly.
5. **No cross-feature rewire for `features/messages/server/messages.ts`** —
   the file is deleted in Phase 6; the service already handles fan-out.
6. **Consumer import style**: namespace-style from the `@mlabs/services`
   barrel — `import { messages, notifications } from "@mlabs/services"`.
7. **Pre-existing TS errors baseline** — snapshot before starting, assert
   no new errors at the end.
8. **Add a `getCallerContext()` helper** to `apps/web/src/lib/auth/server.ts`
   so all 7 consumer rewires (3 pages + 2 dev seeds + room for future
   server-component callers) build the `CallerContext` in one line
   instead of repeating the shape construction. `requestId` generated via
   `crypto.randomUUID()`; `source` defaults to `"web"`. Used uniformly by
   pages and dev seeds — no parallel "dev ctx" helper needed.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). Branch off
`Vbhadala/check-pending-todos`.

---

### Task 1: Capture typecheck baseline

- **Files:** none (out-of-tree artifact)
- **What:** Run `pnpm typecheck 2>&1 | tee /tmp/typecheck-before.log`. Stash
  this file outside the repo. It's the reference for "no new TS errors" at
  the end. No commit; this is a precondition.
- **Acceptance:** `/tmp/typecheck-before.log` exists and lists pre-existing
  errors (the codebase is known not to be 100% clean per
  `feedback_migration_gotchas`).
- **Pause if:** typecheck command fails to run (different shape of problem).

### Task 1.5: Add `getCallerContext()` helper to web auth

- **Files:** `apps/web/src/lib/auth/server.ts` (edit)
- **What:** Add a new exported helper alongside `requireUser()`:
  ```ts
  export async function getCallerContext(
    source: CallerSource = "web",
  ): Promise<CallerContext> {
    const user = await requireUser()  // already redirects to /login if no session
    const role: Permission =
      (user as { role?: string }).role === "admin" ? "admin" : "user"
    return {
      userId: user.id,
      user: { id: user.id, email: user.email, role },
      requestId: crypto.randomUUID(),
      source,
    }
  }
  ```
  Import `CallerContext`, `CallerSource` from `@mlabs/api/context` and
  `Permission` from `@mlabs/api/permission`. Used by Tasks 6, 7, 8, 11, 12
  to build the ctx in one line: `const ctx = await getCallerContext()`.
- **Acceptance:** `pnpm --filter @mlabs/web typecheck` matches baseline.
  Helper imports cleanly from any server component.
- **Pause if:** The `CallerContext` shape has shifted since this review
  (e.g. a new required field landed) — surface before guessing defaults.

### Task 2: Add `getOtherParticipant` to messages service

- **Files:**
  `packages/services/src/messages/service.ts` (edit) ·
  `packages/services/src/messages/index.ts` (edit)
- **What:** Port the legacy `getOtherParticipant({ conversationId, meId })`
  from `apps/web/src/features/messages/server/conversations.ts` (lines
  192–212) into the service as
  `getOtherParticipant(db, ctx, { conversationId })`. Returns
  `{ otherUser: { id, name, image } | null }` (wrapped object, consistent
  with the service's return-shape convention). Re-export from the messages
  barrel.
- **Acceptance:** `pnpm --filter @mlabs/services typecheck` passes. The
  service barrel exports `messages.getOtherParticipant`. No consumer
  changes yet.
- **Pause if:** The legacy query's behaviour for group conversations (v2)
  matters and is ambiguous — confirm with user before assuming "first
  non-self participant" is the right semantic.

### Task 3: Export `_requireParticipant` from messages service

- **Files:**
  `packages/services/src/messages/service.ts` (edit) ·
  `packages/services/src/messages/index.ts` (edit)
- **What:** Promote the private `requireParticipant(db, conversationId,
  userId)` to a named export `_requireParticipant`. Re-export from the
  messages barrel. Underscore prefix signals "internal API, for tests
  only". Existing internal callers (`listMessages`, `sendMessage`,
  `markConversationRead`) keep calling the same function.
- **Acceptance:** `pnpm --filter @mlabs/services typecheck` passes.
  `messages._requireParticipant` is importable from `@mlabs/services`.

### Task 4: Port messages-server.test.ts → packages/services/src/messages/__tests__/service.test.ts

- **Files:**
  `packages/services/src/messages/__tests__/service.test.ts` (new) ·
  `packages/services/src/messages/__tests__/` (new directory)
- **What:** Lift all 556 lines from
  `apps/web/tests/messages-server.test.ts` into the new service test file.
  Adapt:
  - Inject `db` and `ctx = { userId, role: "user", email }` into every
    call site.
  - Unwrap return shapes: `await listConversations(...)` →
    `const { items } = await listConversations(...)`; `sendMessage` →
    `{ message }`; `markConversationRead` → `{ ok: true }`.
  - Replace `MessagesError` assertions with `ApiError` assertions —
    `expect(err).toBeInstanceOf(ApiError)` and check `err.code` matches
    the new namespaced codes (`messages.not_found`, `messages.user_not_found`,
    `messages.self_dm`, `messages.invalid_body`).
  - Import `messages._requireParticipant` for the direct predicate tests.
  - Use `@mlabs/services` barrel imports — no reaching into `./service`.
- **Acceptance:** `pnpm --filter @mlabs/services test` passes. Test count
  in the new file ≥ test count in the legacy file (verify with
  `grep -c '\bit\(' ` or similar).
- **Pause if:** A legacy test exercises behaviour the service doesn't
  preserve (e.g. an error code that genuinely changed semantics, not just
  namespaced). Surface the diff before committing.

### Task 5: Close notifications test coverage gap

- **Files:**
  `packages/services/src/notifications/__tests__/service.test.ts` (edit)
- **What:** Diff `apps/web/tests/notifications.test.ts` (249 lines)
  against the existing service test (163 lines). Identify cases present in
  the legacy but missing in the service — likely candidates: enumeration
  defence on `markRead` (bogus id vs. not-mine vs. already-read all return
  `{ changed: 0 }`), `createNotification` edge cases, ordering of
  `listInbox`. Add the missing cases.
- **Acceptance:** Manual cases-present diff documented in the commit
  message. `pnpm --filter @mlabs/services test` passes.

### Task 6: Rewire `(app)/notifications/page.tsx`

- **Files:**
  `apps/web/src/app/(app)/notifications/page.tsx` (edit)
- **What:** Replace
  `import { listInbox } from "@/features/notifications/server/queries"`
  with namespaced barrel imports:
  ```ts
  import { notifications } from "@mlabs/services"
  import { db } from "@/lib/db"
  import { getCallerContext } from "@/lib/auth/server"
  ```
  Change body to:
  ```ts
  const ctx = await getCallerContext()
  const { rows } = await notifications.listInbox(db, ctx)
  ```
  (Drop the separate `requireUser()` call — `getCallerContext()` already
  enforces auth.)
- **Acceptance:** Page still renders the inbox. Typecheck unchanged from
  baseline.

### Task 7: Rewire `(app)/messages/page.tsx`

- **Files:** `apps/web/src/app/(app)/messages/page.tsx` (edit)
- **What:** Same import pattern as Task 6 (`messages` namespace, `db`,
  `getCallerContext`). Body becomes:
  ```ts
  const ctx = await getCallerContext()
  const { items } = await messages.listConversations(db, ctx)
  ```
  Pass `items` to `<ConversationsList initialItems={items} />`. Drop the
  separate `requireUser()` call.
- **Acceptance:** Page still renders the inbox. Typecheck unchanged.

### Task 8: Rewire `(app)/messages/[id]/page.tsx`

- **Files:** `apps/web/src/app/(app)/messages/[id]/page.tsx` (edit)
- **What:** Replace three legacy imports with namespaced service +
  `ApiError` + `getCallerContext`:
  ```ts
  import { messages } from "@mlabs/services"
  import { ApiError } from "@mlabs/api"
  import { db } from "@/lib/db"
  import { getCallerContext } from "@/lib/auth/server"
  ```
  Body:
  ```ts
  const ctx = await getCallerContext()
  const { id: conversationId } = await params

  let initialMessages
  try {
    const { items } = await messages.listMessages(db, ctx, { conversationId })
    initialMessages = items
  } catch (err) {
    if (err instanceof ApiError && err.code === "messages.not_found") {
      notFound()
    }
    throw err
  }

  const { otherUser } = await messages.getOtherParticipant(db, ctx, { conversationId })

  return (
    <Thread
      conversationId={conversationId}
      meId={ctx.userId}
      otherUser={otherUser}
      initialMessages={initialMessages}
    />
  )
  ```
- **Acceptance:** Page renders the thread for participants, 404s for
  non-participants and bogus ids. Typecheck unchanged.

### Task 9: Rewire `notification-list.tsx` (type-only swap)

- **Files:**
  `apps/web/src/features/notifications/components/notification-list.tsx`
  (edit)
- **What:** Change
  `import type { NotificationRow } from "@/features/notifications/server/queries"`
  to
  `import type { NotificationRow } from "@mlabs/services"` (the type is
  re-exported from the notifications barrel — same shape).
  `markAllRead` import stays as-is — it'll move in Task 13.
- **Acceptance:** Component typechecks; behaviour unchanged.

### Task 10: Rewire `notification-item.tsx` (type-only swap)

- **Files:**
  `apps/web/src/features/notifications/components/notification-item.tsx`
  (edit)
- **What:** Same type-import swap as Task 9. `markRead` import stays
  pending the move in Task 13.
- **Acceptance:** Component typechecks; behaviour unchanged.

### Task 11: Rewire `_dev/notifications/_seed-action.ts`

- **Files:** `apps/web/src/app/_dev/notifications/_seed-action.ts` (edit)
- **What:** Replace
  `import { createNotification } from "@/features/notifications/server/create"`
  with namespaced barrel imports (`notifications`, `db`,
  `getCallerContext`). Drop the separate `requireUser()` — use
  `ctx.userId` instead. Call
  `await notifications.createNotification(db, ctx, { userId: ctx.userId, body })`.
  Commit message note: the seed notifies the current user themselves
  (`ctx.userId === args.userId`); the service's `createNotification`
  doesn't authz-check that pairing (caller-is-responsible model), so this
  is intentionally fine.
- **Acceptance:** Dev seed still runs end-to-end. Typecheck unchanged.

### Task 12: Rewire `_dev/messages/_seed-action.ts`

- **Files:** `apps/web/src/app/_dev/messages/_seed-action.ts` (edit)
- **What:** Replace legacy `openOrCreate1to1` and `sendMessage` imports
  with the namespaced barrel; add `getCallerContext`. Drop the separate
  `requireUser()` — use `ctx.userId` instead. Adapt args:
  - `openOrCreate1to1({ meId, otherEmail })` →
    `messages.openOrCreate1to1(db, ctx, { otherEmail })` (meId comes from
    `ctx.userId`)
  - `sendMessage({ conversationId, senderId, body })` →
    `messages.sendMessage(db, ctx, { conversationId, body })` (senderId
    comes from `ctx.userId`)
  Keep the existing direct `db` query for partner-existence — that's not
  a service concern.
- **Acceptance:** Dev seed still runs end-to-end. Typecheck unchanged.

### Task 13: Move `actions.ts` out of `/server/`

- **Files:**
  `apps/web/src/features/notifications/server-actions.ts` (new — `git mv`
  from `server/actions.ts`) ·
  `apps/web/src/features/notifications/server/actions.ts` (delete) ·
  `apps/web/src/features/notifications/components/notification-list.tsx`
  (edit import) ·
  `apps/web/src/features/notifications/components/notification-item.tsx`
  (edit import)
- **What:** `git mv` the file up one level, rename to `server-actions.ts`
  (keeps `"use server"` clarity). Update the two component imports from
  `@/features/notifications/server/actions` to
  `@/features/notifications/server-actions`. Contents of the file
  unchanged.
- **Acceptance:** Components still call Server Actions; pressing "Mark all
  read" / "Mark read" works end-to-end.

### Task 14: Delete legacy tests

- **Files:**
  `apps/web/tests/messages-server.test.ts` (delete) ·
  `apps/web/tests/notifications.test.ts` (delete)
- **What:** Delete both test files. Service-side equivalents now own the
  coverage (Task 4 + Task 5).
- **Acceptance:** `pnpm --filter @mlabs/web test` passes (without these
  suites). `pnpm --filter @mlabs/services test` passes.
- **Pause if:** Tasks 4 or 5 didn't actually cover the full set of legacy
  cases. Run a final diff before deleting:
  `diff <(grep -E "^\s*(it|test)\(" apps/web/tests/notifications.test.ts) <(grep -E "^\s*(it|test)\(" packages/services/src/notifications/__tests__/service.test.ts)`
  — if any legacy case has no service counterpart, pause and surface it.

### Task 15: Delete legacy server modules

- **Files:**
  `apps/web/src/features/messages/server/` (delete entire directory) ·
  `apps/web/src/features/notifications/server/` (delete entire directory)
- **What:** `rm -rf` both `server/` directories. At this point nothing
  should still import from them.
- **Acceptance:**
  `rg "features/(messages|notifications)/server" apps/` returns zero hits.
  `pnpm typecheck` returns the same set of pre-existing errors as the
  baseline — no new errors.
- **Pause if:** The grep returns any hits — there's still a consumer that
  Task 6–12 missed. Don't delete; surface the missed consumer.

### Task 16: Cleanup straggling references

- **Files:**
  `apps/web/src/features/notifications/types.ts` (edit — drop comment
  references to deleted modules) · any other files surfaced by typecheck
- **What:** Clean up dangling comment references and any typecheck errors
  that surfaced during deletes. The plan's "stale comment in
  notifications/types.ts" referencing `features/messages/server/messages.ts`
  is one known instance.
- **Acceptance:** Final `pnpm typecheck` matches baseline (no new errors).
  Final `pnpm --filter @mlabs/services test` and
  `pnpm --filter @mlabs/web test` pass.

### Task 17: Manual smoke + PR

- **Files:** none (verification step + PR open)
- **What:**
  1. Cold-boot `apps/web` locally: `pnpm --filter @mlabs/web dev`.
  2. Sign in.
  3. Walk: `/messages` (inbox renders), open a thread (`/messages/[id]`),
     send a message (recipient gets a notification row),
     `/notifications` (renders), mark one read, mark all read.
  4. Confirm no console errors.
  5. Open PR against `Vbhadala/check-pending-todos`. PR description
     includes: linked plan + review, the test-coverage diff from Task 5,
     the typecheck baseline-vs-final summary, the rename-table from the
     plan, and a 1-paragraph rationale for why `actions.ts` survived.
- **Acceptance:** Manual smoke walks clean. PR opened.
- **Pause if:** Any step in the manual smoke surfaces a regression.

## Open questions

All three open questions from the initial review have been resolved by
reading the relevant code paths. Resolutions captured below; no questions
remain blocking `/mlabs-code`.

1. **CallerContext factory** — *Resolved.* No public helper exists today;
   `requireUser()` returns the raw session user. Decision: add a
   `getCallerContext()` helper in `apps/web/src/lib/auth/server.ts` that
   wraps `requireUser()` and returns a fully-formed `CallerContext`
   (`{ userId, user: { id, email, role }, requestId, source }`). Generates
   a fresh `requestId` via `crypto.randomUUID()` (pages have no inbound
   `X-Request-Id`); `source` defaults to `"web"`. Used by all 7 consumer
   rewires (3 pages + 2 dev seeds + room for future server-component
   callers). New Task 1.5 below.

2. **`getOtherParticipant` for group conversations** — *Resolved.* The
   legacy implementation already uses `LIMIT 1` and returns a single
   user; the service's existing `listConversations` does the same with an
   explicit comment ("group conversations (v2) just pick the first
   non-self participant"). The port matches that contract exactly:
   `{ otherUser: { id, name, image } | null }`. v2 group conversations
   are a separate design pass when v2 actually lands.

3. **Dev seed db handle** — *Resolved.* Both `_dev/notifications/_seed-action.ts`
   and `_dev/messages/_seed-action.ts` use the normal cookie-session
   `requireUser()` path and the regular `@/lib/db` handle. No admin
   impersonation. Tasks 11 and 12 use the same `getCallerContext()` helper
   from Task 1.5. One quiet note for the commit message on Task 11: the
   notifications seed notifies the current user themselves
   (`ctx.userId === args.userId`); the service's `createNotification`
   doesn't authz-check that pairing (comment: "Caller is responsible for
   authorization"), so this works as-is but worth flagging.
