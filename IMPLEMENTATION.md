# MLabs Template — Implementation Plan (v1)

**Companion to:** [`PLAN.md`](./PLAN.md) (the architectural source of truth).
**This doc is operational:** what to build, in what order, with what acceptance criteria. Update as you go.

**Total estimate:** ~10–12 dev-days with Claude (one dev). ~5–7 dev-days if 2 devs run parallel worktrees.

---

## Phases overview

| Phase | Scope | Est. | Status | Blocks |
|---|---|---|---|---|
| 0 | Risk de-risking — spikes + open questions | 1 day | not started | everything |
| 1 | W1 finish — scaffold + test infra + Replit deploy config | ½ day | partial (config layer done) | Phase 2 |
| 2 | W2 — Better Auth + Drizzle + audit_log | 2 days | not started | Phases 3, 5, 8 |
| 3 | W3 — Postmark email wrappers | ½ day | not started | Phase 5 (signup flow) |
| 4 | W4 — `lib/ui` + `lib/storage` + `lib/logger` | 1 day | not started | Phase 5 |
| 5 | W5–W8 — features (profile, avatar, notifications, messages, admin) | 3–4 days | **W5 + W6 + W7 + W8 all done (profile, avatar, notifications, messages, admin)** | Phase 5.5 |
| **5.5** | **Expo mobile app (`/mobile`) + bearer auth + conditional GET + shared schemas. See `PHASE_5_5.md`** | **3–4 weeks** | **planned (cleared by /plan-eng-review 2026-05-11)** | **Phase 7** |
| 6 | W9 — Claude Code skills (`prep-natively-build` dropped per decision 0004) | 1–2 days | not started | parallel with everything |
| 7 | Pre-ship — docs, dark mode QA, polling load test, first-fork dry run | 1 day | not started | v1 ship |

---

## Phase 0: De-risk before W1 finishes

**Goal:** answer every "this might bite" before sinking days into the wrong shape.

### 0.1 Open questions (need user input)

| # | Question | Why it matters now | Owner |
|---|---|---|---|
| Q1 | Default fonts: stick with Geist sans + Geist mono (Next.js scaffold default) or pick something else? | Affects `design.ts`, `globals.css`, and per-fork brand identity. Geist is fine; only override if MLabs has a house typography preference. | User |
| Q2 | Replit account — does MLabs use one shared workspace + branch per project, or separate Replit accounts per project? | Affects `new-project` skill design + Replit deploy config + Object Storage bucket strategy. | User |
| Q3 | Postmark setup — one Postmark server per project, or one shared server with multiple Sender Signatures? | Affects email config strategy + handover (does client get keys to MLabs's Postmark, or their own?). | User |
| Q4 | Neon plan — Free, Launch, or Scale? Affects branching, PITR retention, and the backups runbook. | Drives `docs/handover/backups.md` and `db:branch` workflow. | User |
| Q5 | First real fork — which client project + when? Sets the v1 ship deadline. | If no project lined up, build to plan. If project on the books, scope cuts may be needed. | User |

**Output:** answers added to `PLAN.md §15`, this doc updated, `IMPLEMENTATION.md §1.6` (Replit config) and §3.2 (Postmark templates) actionable.

### 0.2 Spikes

| # | Spike | Time | Done when |
|---|---|---|---|
| S1 | **Sharp on Replit Reserved VM.** Push the current scaffold to a Replit Reserved VM, run `npm install`, verify sharp loads (`node -e "console.log(require('sharp').versions)"`). | 15 min | Console prints sharp + libvips versions |
| S2 | **Polling load math.** Spreadsheet: 1k users × 5s notification poll × 24h = ~17M req/day. Single Reserved VM RPS budget? Neon connection ceiling? Verify "no surprises at scale." | 30 min | One-page note in `docs/decisions/0002-polling-load.md` |
| S3 | **Better Auth + Drizzle + Neon serverless** — minimal "hello, signup" in a throwaway dir. Verifies the stack composes before W2 commits 2 days. | 1 hr | Throwaway repo lets a user sign up; deleted after |

**Spike priority:** S1 first (cheapest, biggest blast radius). S3 is optional but high-value.

**Output of Phase 0:** all 5 questions answered + 3 spikes green (or known-broken with workarounds documented). Phase 1 can start with confidence.

---

## Phase 1: Finish W1

**Status:** config layer done. Remaining tasks below.

### 1.1 shadcn init + 4 primitives

Used by every feature. Locks the component vocabulary.

```bash
npx shadcn@latest init
# accept: TypeScript, "@/components" alias, Tailwind 4 mode, neutral base color (we override via design.ts)
npx shadcn@latest add button input label form sonner
```

**Files added:** `components.json`, `src/components/ui/{button,input,label,form,sonner}.tsx`, deps `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `react-hook-form`, `@hookform/resolvers`.

**Acceptance:** `npm run typecheck && npm run build` pass; manually drop a `<Button>Hello</Button>` on `/` and confirm it renders with `accent` token color.

**Time:** 30 min.

### 1.2 Drizzle config + DB client wiring

Set up the ORM scaffolding without committing schema yet (W2 owns schema).

**Files to create:**

```
drizzle.config.ts                  # Drizzle Kit config
src/lib/db/index.ts                # Pooled client (Neon serverless driver)
src/lib/db/schema/index.ts         # Empty re-export point
```

**Acceptance:** `npm run db:generate` runs cleanly (no migrations yet, but no errors); `import { db } from "@/lib/db"` typechecks.

**Time:** 30 min.

### 1.3 Vitest config + first integration test

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Files to create:** `vitest.config.ts`, `tests/setup.ts`, `tests/example.test.ts` (smoke test for `brand.ts` import).

**Add script:** `"test": "vitest run"`, `"test:watch": "vitest"`.

**Acceptance:** `npm test` passes one test.

**Time:** 30 min.

### 1.4 Playwright config + first E2E

```bash
npm init playwright@latest
# accept: TypeScript, tests dir = e2e/, GitHub Actions = no (we wire CI later)
```

**Files to create:** `playwright.config.ts`, `e2e/home.spec.ts` (loads `/`, asserts `<h1>` shows brand name).

**Add script:** `"e2e": "playwright test"`.

**Acceptance:** `npm run e2e` passes against locally-running dev server.

**Time:** 45 min (Playwright install is slow due to browser binaries).

### 1.5 Replit deploy config

**Files to create:** `.replit`, `replit.nix` (only if S1 found Nix changes needed), `docs/handover/replit-setup.md` (1-page setup guide for clients).

**Contents (skeleton):**
```toml
# .replit
run = "npm run dev"
[deployment]
deploymentTarget = "vm"     # Reserved VM
build = ["sh", "-c", "npm install && npm run build"]
run = ["sh", "-c", "npm start"]
```

**Acceptance:** repo deploys to Replit Reserved VM; homepage loads. (Same as S1 spike but committed.)

**Time:** 30 min.

### 1.6 ESLint custom rules

Two rules from PLAN.md §3:
1. **no-direct-process-env** — anything outside `src/config/env.ts` importing `process.env` fails.
2. **no-brand-string-literal** — string literal of `brand.name` outside allowlist (`config/`, `templates/`, `legal/`, `messages/`) fails.

**Approach:** custom ESLint rules in `eslint-rules/` dir, registered in `eslint.config.mjs`. Or use `no-restricted-syntax` for the simpler `process.env` rule and write a custom rule for the brand check.

**Acceptance:** intentional violation in a test file fails `npm run lint`.

**Time:** 1 hr.

### 1.7 Pre-commit hook for migrations

**Tool:** [`lefthook`](https://github.com/evilmartians/lefthook) (faster than husky, single binary).

```bash
npm install -D lefthook
npx lefthook install
```

**Hook contract:** if `src/lib/db/schema/**/*.ts` changed AND no new file in `drizzle/migrations/` is staged, fail the commit with "run npm run db:generate".

**Acceptance:** edit a schema file without generating, attempt commit, hook blocks.

**Time:** 30 min.

### 1.8 Commit baseline

```
chore: w1 scaffold + config + test infra + replit deploy
```

Tag: `v0.1.0-w1`.

---

## Phase 2: W2 — Better Auth + Drizzle + audit_log

**Goal:** auth flows + DB foundation + audit infrastructure. The biggest single chunk.

### 2.1 DB schema — users + sessions + verifications + audit_log

**Files:**
```
src/lib/db/schema/users.ts          # Better Auth's user table shape
src/lib/db/schema/sessions.ts
src/lib/db/schema/verifications.ts  # Email verify + reset tokens
src/lib/db/schema/audit_log.ts      # actor, action, target, metadata jsonb (typed allowlist)
src/lib/db/schema/index.ts          # re-export all
```

**Audit metadata typed allowlist** (per PLAN.md §10):
```ts
export type AuditMeta =
  | { kind: "user.role_changed"; from: Role; to: Role }
  | { kind: "user.banned"; reason?: string }
  | { kind: "user.unbanned" }
  | { kind: "user.password_reset_sent" }
  | { /* extend per-feature */ }
```

**Acceptance:** `npm run db:generate` produces SQL migration; `npm run db:migrate` applies cleanly to a Neon test branch.

**Time:** 2 hrs.

### 2.2 `src/lib/auth/` — Better Auth config

**Files:**
```
src/lib/auth/index.ts               # Better Auth instance
src/lib/auth/client.ts              # Client-side hooks
src/lib/auth/server.ts              # Server helpers (requireUser, getSession)
src/app/api/auth/[...all]/route.ts  # Better Auth route handler
```

**Wired:** Drizzle adapter, email/password, email verify required (calls `lib/email.sendVerifyEmail`), password reset (calls `lib/email.sendPasswordResetEmail`). Email functions stubbed for now (W3 fills in).

**Acceptance:** `requireUser()` returns the authed user in server components; throws redirect to `/login` if absent.

**Time:** 3 hrs.

### 2.3 `lib/db/audit.ts` — audit helper

```ts
export async function audit(opts: {
  actorId: string | null
  action: string
  target?: { type: string; id: string }
  meta?: AuditMeta
}): Promise<void>
```

**Critical:** wrap in try/catch + `logger.error`. For state-change actions, **write audit BEFORE the action** (so failed audit blocks action — see PLAN.md §10).

**Acceptance:** unit test writes a row, reads it back, verifies metadata typing.

**Time:** 1 hr.

### 2.4 Auth UI shells (`(auth)` group routes)

```
src/app/(auth)/layout.tsx           # Centered card pattern (per Design D2)
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/(auth)/verify-email/page.tsx
```

**Form pattern:** shadcn Form + react-hook-form + zod resolver + Better Auth client.

**Acceptance:** signup form validates on the client, submits, hits Better Auth, creates user (email send fails until W3 — surface friendly error).

**Time:** 4 hrs.

### 2.5 Tests — auth wrapper integration

Per PLAN.md §9, ~8 tests:
- signup happy + duplicate email + Postmark failure (mocked)
- login happy + wrong password + unverified user
- password reset request + confirm + reuse rejected

**Acceptance:** `npm test` passes all 8.

**Time:** 3 hrs.

### 2.6 Commit

```
feat(auth): better-auth + drizzle + audit_log
```

Tag: `v0.2.0-w2`.

---

## Phase 3: W3 — Postmark

### 3.1 `src/lib/email/` — Postmark client + typed wrappers

**Files:**
```
src/lib/email/client.ts             # Postmark client singleton
src/lib/email/templates.ts          # Type definitions per template
src/lib/email/send.ts               # sendVerifyEmail, sendPasswordResetEmail, sendNotificationEmail
```

**Wrapper shape (typed-per-template, no generic `send(name, vars)`):**
```ts
export async function sendVerifyEmail(opts: { to: string; verifyUrl: string; name: string }): Promise<void>
```

**Acceptance:** unit tests mock Postmark, assert correct template alias + variables.

**Time:** 2 hrs.

### 3.2 Postmark templates set up

Templates created in Postmark UI (not in code): `verify-email`, `password-reset`, `notification-generic`. Variables documented in `src/lib/email/templates.ts` + a markdown sheet in `docs/handover/postmark-templates.md`.

**Acceptance:** dev sets `POSTMARK_SERVER_TOKEN` + `POSTMARK_FROM_EMAIL`, runs signup flow, gets verify email.

**Time:** 1 hr (mostly clicking around in Postmark UI).

### 3.3 Wire into Better Auth callbacks

Better Auth's email-required hooks call `sendVerifyEmail` / `sendPasswordResetEmail`. Inline send (no jobs runner per PLAN.md T9).

On Postmark failure: catch, log, return user-friendly error to UI; user sees "we couldn't send your email — try again" with a retry button.

**Acceptance:** end-to-end signup → verify email arrives → click → user verified.

**Time:** 1 hr.

### 3.4 Commit

```
feat(email): postmark client + typed wrappers + auth wiring
```

Tag: `v0.3.0-w3`.

---

## Phase 4: W4 — `lib/ui` + `lib/storage` + `lib/logger`

These are independent; can split across worktrees if 2+ devs.

### 4.1 `src/lib/ui/` — state primitives + `<DataList>`

**Files:**
```
src/lib/ui/empty-state.tsx
src/lib/ui/loading-state.tsx        # variants: skeleton | spinner | shimmer
src/lib/ui/error-state.tsx
src/lib/ui/data-list.tsx            # Generic, requires data/loading/error/empty/renderItem
```

**Acceptance:** Storybook-style demo route at `/_dev/states` shows all 4 components in all states (delete `_dev/` before v1 ship).

**Time:** 2 hrs.

### 4.2 `src/lib/storage/` — adapter + Replit driver

**Files:**
```
src/lib/storage/index.ts            # public API: storage.upload, .delete, .getUrl
src/lib/storage/types.ts            # StorageAdapter interface
src/lib/storage/drivers/replit.ts   # Replit Object Storage driver (default)
```

**Interface:**
```ts
export interface StorageAdapter {
  upload(opts: { key: string; body: Buffer; contentType: string }): Promise<{ url: string }>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}
```

**Acceptance:** unit tests with mocked Replit SDK pass; integration test upload→getUrl→fetch round-trips.

**Time:** 3 hrs.

### 4.3 `src/lib/logger/` — wrapper + error_log table

**Files:**
```
src/lib/logger/index.ts             # logger.info, .warn, .error
src/lib/db/schema/error_log.ts      # NEW table for persisted errors
```

`logger.error(msg, ctx)` writes to `console` AND inserts a row in `error_log` (PLAN.md §13).

**Acceptance:** thrown error in a server action is caught by error boundary, logged to console + DB.

**Time:** 1 hr.

### 4.4 Commit

```
feat(lib): ui state primitives + storage adapter + logger
```

Tag: `v0.4.0-w4`.

---

## Phase 5: Features (W5–W8)

Strict order on the first one (profile/avatar set the pattern). After that, can split.

### 5.1 `features/profile` — uses lib/auth + lib/db audit

**Routes:** `(app)/profile` — single page, sectioned cards.
**Sections:** Account (name + email change with reverify) → Security (password change → revoke other sessions) → Notifications preferences → **Danger zone** (delete account → anonymize-in-place).

**Critical bits:**
- Email change triggers re-verification (Better Auth handles)
- Password change calls Better Auth's `revokeOtherSessions`
- Account delete = anonymize: PII wiped (`deleted-{id}@example.com`, name → "Deleted user"), avatar deleted from storage, audit row preserved

**Acceptance:** all 4 sections work; E2E test: signup → change name → change password → delete → verify other sessions invalid.

**Time:** 4 hrs.

### 5.2 `features/avatar` — server-side sharp resize

**Routes:** part of `/profile`. Upload → POST to `/api/avatar` → sharp resize to 256×256 JPEG → `storage.upload()` → write URL on user row → delete old file.

**Acceptance:** upload arbitrary image, get 256×256 JPEG; replace removes old file; oversize/wrong-MIME rejected with friendly error.

**Time:** 2 hrs.

### 5.3 `features/notifications` — polling at 5s

**Schema:** `notifications` table (id, user_id, type, body jsonb, read_at, created_at).
**Routes:** `(app)/notifications` (full inbox), `_components/NotificationBell` (in nav, polling every 5s for unread count).
**Server actions:** `markRead(id)`, `markAllRead()`.

**Authz tests:** A cannot mark B's notification read.

**Acceptance:** create notification (admin route), bell badge updates within 5s; mark-read updates immediately.

**Time:** 5 hrs.

### 5.4 `features/messages` — DMs + polling

**Schema:** `conversations`, `conversation_participants`, `messages`.
**Routes:** `(app)/messages` (conversation list), `(app)/messages/[id]` (thread).
**Polling:** 2s when chat is open, 10s in background. SWR or react-query for client-side.

**Authz tests:** non-participant cannot send/read; conversation creation requires both users to exist.

**Acceptance:** A sends to B; B sees within 3s when chat open. E2E test in Playwright (two browser contexts).

**Time:** 7 hrs.

### 5.5 `features/admin` — uses audit on every state change

**Routes:** `(admin)/users` (list, search, filter), `(admin)/users/[id]` (detail + actions).
**Actions:** change role, ban/unban, send password reset email. Each calls `audit({...})` BEFORE the action (PLAN.md §10).

**Authz tests:** non-admin gets 403; audit logged.

**Acceptance:** ban a user → user's existing sessions invalid → user blocked from login. Audit log shows the action.

**Time:** 4 hrs.

### 5.6 Commits

One per feature:
```
feat: profile + avatar
feat: notifications
feat: messages
feat: admin
```

Tag: `v0.5.0-features`.

---

## Phase 5.5: Expo mobile scaffold

Full plan in `PHASE_5_5.md`. Summary:

- `/mobile` Expo app covering auth, profile, avatar, messages, notifications
- Bearer auth (1hr access + 7d refresh) on top of existing Better Auth
- Conditional GET (If-Modified-Since / ETag) backed by DB triggers on `users.notifications_updated_at` + `users.messages_updated_at`
- `src/lib/schemas/` pure-Zod barrel (ESLint-guarded) + `ApiErrorResponse` wire format
- NativeWind v4 + Tailwind v3 mobile config generated from `src/config/design.ts` (CI-checked, header-banner protected)
- Build our own 8 mobile primitives matching shadcn API
- `@tanstack/react-query` on mobile with 401 auto-refresh
- 11 Maestro E2E flows (local-only; TODOS.md #2 tracks CI promotion)
- Universal Links + App Links plumbing (placeholders in template; `new-project` skill fills bundle ID / team ID / SHA)

**Lanes (parallelizable):** A (server foundations, sequential) → B + C + D (parallel) → E (final integration). See `PHASE_5_5.md` for the 44-step breakdown.

**Decision docs:** `docs/decisions/0004-expo-over-natively.md`, `docs/decisions/0005-conditional-get-load-math.md`.

**Test plan artifact:** `~/.gstack/projects/Vbhadala-mlabs/vinod-Vbhadala-muscat-v1-eng-review-test-plan-20260511-221355.md`.

Tag: `v0.5.5-mobile`.

---

## Phase 6: W9 — Claude Code skills

These run in parallel with everything (W9 lane in PLAN.md). Defer the heaviest ones to v1.1.

### 6.1 v1 skills (must ship)

| Skill | Time | What it does |
|---|---|---|
| `new-project` | 4 hrs | Clone template, rename, init Replit, init Neon branch, generate Better Auth secret. **Phase 5.5 additions:** prompt for iOS bundle ID + Apple team ID + Android cert SHA-256; fill placeholders in `public/.well-known/apple-app-site-association`, `public/.well-known/assetlinks.json`, and `mobile/app.config.ts`; run `npm run gen:mobile-tw`. |
| `handover-pack` | 2 hrs | Generate filled `HANDOVER.md`, secret rotation list, Loom script. **Phase 5.5 additions:** production EAS submission checklist (Apple Developer account, Play Console, signing certs); `npm run verify:deeplinks` reminder. |
| `remove-feature` | 3 hrs | Delete feature folder, drop migrations, remove env vars, update nav. **Phase 5.5 additions:** also strip mirror `mobile/features/{feature}/` folder. |

### 6.2 v1.1 skills (defer)

| Skill | Why deferred |
|---|---|
| `add-feature` | Need 3+ forks to find the right shape |
| `upgrade-template` | Same; in-flight propagation is partially fantasy per outside voice |
| `generate-admin-crud` | Once admin pattern is proven on 2 features, scaffold from a Drizzle table |
| ~~`prep-natively-build`~~ | **Dropped per decision 0004 — Expo replaces Natively** |

### 6.3 Commit

```
feat(skills): new-project + handover-pack + remove-feature
```

---

## Phase 7: Pre-ship

### 7.1 Decisions docs

- `docs/decisions/0001-no-realtime.md` — why polling, not SSE
- `docs/decisions/0002-polling-load.md` — load math from S2
- `docs/decisions/0003-monorepo-rejected.md` — why single Next.js app, not workspaces

### 7.2 Migration docs

- `docs/migrations/from-better-auth.md` — 1-page outline for swapping to NextAuth/Clerk

### 7.3 Handover artifacts

- `HANDOVER.md.template` — what client gets after handover
- `docs/handover/secret-rotation.md` — pre-launch checklist
- `docs/handover/backups.md` — Neon PITR runbook

### 7.4 Design docs

- `DESIGN.md.template` — design system source of truth (shipped with each fork)

### 7.5 Pre-ship QA

- **Dark mode QA pass** — every starter screen in light + dark, screenshot diff
- **Polling load test** — 100 simulated users polling for 10 min, watch Neon connection count + Replit RPS
- **First-fork dry run** — actually fork the template for a fake project, time fork→deploy. Target <30 min. Record actual time + pain points → v1.1 backlog.
- **Replit deploy** — final cold deploy + sharp verification + SSE-not-needed verification (every page works after a deploy, no broken connections to recover)

### 7.6 Tag v1

```
git tag v1.0.0
git push origin v1.0.0
```

---

## Definition of done for v1

Pulled from `PLAN.md §17` + this doc:

- [ ] Phase 0 complete: all 5 questions answered, all 3 spikes green
- [ ] All workstreams W1–W9 commits land
- [ ] All locked decisions in `PLAN.md §4` implemented
- [ ] All critical gaps in `PLAN.md §10` addressed
- [ ] Tests in `PLAN.md §9` written, ~25 total, all passing
- [ ] CI smoke runs on PR (typecheck + build + migrate dry-run + tests + lint)
- [ ] Dark mode QA pass green on every starter component
- [ ] `DESIGN.md.template`, `HANDOVER.md.template`, `.env.example` populated
- [ ] First-fork dry run complete, fork-to-first-deploy time recorded (target <30 min)
- [ ] All decisions docs (§7.1) written
- [ ] `v1.0.0` tagged and pushed

---

## Cadence + checkpoints

After each phase: brief checkpoint commit + PR (if multi-dev). After each commit: run full quality gate (`npm run typecheck && npm run lint && npm test && npm run build`).

**Daily standup question** (even solo): "what's blocking the next phase?" If the answer is a Phase 0 question, escalate to the user immediately rather than guess.

---

## Things that will go wrong (and the response)

| Risk | Response |
|---|---|
| Sharp doesn't load on Replit | Fall back to client-side canvas resize for v1; flag as v1.1 fix; revisit Phase 5.2 |
| Neon free tier connection limit hit during polling load test | Switch to Neon Launch ($19/mo) before v1 ships; document in `0002-polling-load.md` |
| Better Auth has a sharp edge for our use case | Document in `from-better-auth.md`; if blocking, fall back to NextAuth (1-day rework) |
| First-fork dry run takes >60 min | Don't ship. Diagnose; common culprit will be Replit/Neon/Postmark setup steps not scripted in `new-project` skill |
| Polling at 2s feels janky in messages E2E | Drop to 1s; if still bad, reconsider per-feature SSE for messages only (cost: 1 day rework, plus the SSE complexity tax we just dodged) |

---

*This doc is the live execution plan. Edits as work progresses (status column, time-actuals). Lock-step with `PLAN.md` — if a decision changes, update both.*
