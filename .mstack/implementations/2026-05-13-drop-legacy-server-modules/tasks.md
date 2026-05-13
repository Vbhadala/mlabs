# Implementation: Drop legacy duplicate server modules in apps/web

**Started:** 2026-05-13
**Review:** [2026-05-13-drop-legacy-server-modules](../../reviews/2026-05-13-drop-legacy-server-modules.md)
**Branch:** Vbhadala/check-pending-todos
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [~] **Setup:** install deps + setup commit
  - Files: .mstack/plans/.., .mstack/reviews/.., .mstack/learnings.jsonl, TODOS.md
  - Commit: —
  - Notes: pnpm install ran cleanly (1506 pkgs, 5.2s). tsx now in node_modules/.bin/.

- [ ] **Task 1:** Capture typecheck baseline
- [ ] **Task 1.5:** Add getCallerContext() helper
- [ ] **Task 2:** Add getOtherParticipant to messages service
- [ ] **Task 3:** Export _requireParticipant from messages service
- [ ] **Task 4:** Port messages-server.test.ts to service
- [ ] **Task 5:** Close notifications test coverage gap
- [ ] **Task 6:** Rewire (app)/notifications/page.tsx
- [ ] **Task 7:** Rewire (app)/messages/page.tsx
- [ ] **Task 8:** Rewire (app)/messages/[id]/page.tsx
- [ ] **Task 9:** Rewire notification-list.tsx type import
- [ ] **Task 10:** Rewire notification-item.tsx type import
- [ ] **Task 11:** Rewire _dev/notifications/_seed-action.ts
- [ ] **Task 12:** Rewire _dev/messages/_seed-action.ts
- [ ] **Task 13:** Move actions.ts out of /server/
- [ ] **Task 14:** Delete legacy tests
- [ ] **Task 15:** Delete legacy server modules
- [ ] **Task 16:** Cleanup straggling references
- [ ] **Task 17:** Final verification + report
