# Implementation: Drop legacy duplicate server modules in apps/web

**Started:** 2026-05-13
**Completed:** 2026-05-13
**Review:** [2026-05-13-drop-legacy-server-modules](../../reviews/2026-05-13-drop-legacy-server-modules.md)
**Branch:** Vbhadala/check-pending-todos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Setup:** install deps + setup commit · `438ebd6b`
- [x] **Task 1:** Capture typecheck baseline · (no commit — baseline clean)
- [x] **Task 1.5:** Add `getCallerContext()` helper · `0cddef14`
- [x] **Task 2:** Add `getOtherParticipant` to messages service · `9a3c9c73`
- [x] **Task 3:** Export `_requireParticipant` from messages service · `6e760e74`
- [x] **Task 4:** Port messages-server.test.ts to service · `a7fb5701`
- [x] **Task 5:** Close notifications test coverage gap · `03bef77f`
- [x] **Task 6:** Rewire (app)/notifications/page.tsx · `b1befb13`
- [x] **Task 7:** Rewire (app)/messages/page.tsx · `af95bc45`
- [x] **Task 8:** Rewire (app)/messages/[id]/page.tsx · `3da438fc`
- [x] **Task 9:** Rewire notification-list.tsx type import · `7517fe82`
- [x] **Task 10:** Rewire notification-item.tsx type import · `ef1bdea8`
- [x] **Task 11:** Rewire _dev/notifications/_seed-action.ts · `6a773457`
- [x] **Task 12:** Rewire _dev/messages/_seed-action.ts · `365bc244`
- [x] **Task 13:** Move actions.ts out of /server/ · `fdf244bc`
- [x] **Task 14:** Delete legacy tests · `9aa5c0d6`
- [x] **Task 15:** Delete legacy server modules · `320218e2`
- [x] **Task 16:** Cleanup straggling references · `b6afa8d7`
- [x] **Task 17:** Final verification + report · (this commit)
