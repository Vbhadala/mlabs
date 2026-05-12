# Phase 5.5 — Expo mobile scaffold

**Status:** locked (cleared by /plan-eng-review 2026-05-11)
**Branch:** Vbhadala/muscat-v1
**Estimate:** 3–4 weeks for 1 dev + Claude Code
**Predecessor:** W1–W8 (PR #1 merged, commit `124b3a4`)
**Successor:** Phase 6 (W9 — Claude Code skills)

## Mission

Add an Expo mobile app at `/mobile` covering the core W5–W8 features (sign-up, login, password reset, profile, avatar, messages, notifications) on iOS and Android. Mobile shares auth, schemas, design tokens, and emails with the existing Next.js web app. Replaces the prior Natively-wrapper strategy.

**Out of scope for v1:** Expo Push (polling instead), biometric auth, offline message queue, mobile admin UI, App Store submission tooling. See PLAN.md §12 and decision doc 0004 for full list.

## Locked decisions (from /plan-eng-review 2026-05-11)

| # | Area | Decision |
|---|---|---|
| A1 | Mobile styling | NativeWind v4 + Tailwind v3 mobile config, **generated** from `src/config/design.ts` via `scripts/gen-mobile-tailwind.ts`. DO-NOT-EDIT header banner + CI `gen:mobile-tw --check` + pre-commit hook |
| A2 | Auth | Better Auth bearer plugin (v1.6.10+) with **1hr access + 7d refresh token** rotation; audit all `/api/*` handlers for cookie + bearer; integration test per route × transport |
| A3 | Deep links | Template ships placeholder `public/.well-known/apple-app-site-association` + `assetlinks.json` + Expo Router Linking config; `new-project` skill (Phase 6) prompts for bundle ID + team ID + Android SHA |
| A4 | Shared schemas | New `src/lib/schemas/` barrel — pure Zod, no Drizzle; ESLint guard banning `drizzle-orm` imports |
| A5 | Polling load | Conditional GET (If-Modified-Since / ETag) on `/api/notifications/unread-count` + `/api/messages/conversations` |
| A6 | EAS | `mobile/eas.json` with dev + preview profiles; production submit per-fork concern |
| C1 | Email URLs | `src/lib/email/url.ts` with `buildAuthUrl()` + `buildAppLinkUrl()`; all templates + Better Auth callbacks consume it |
| C2 | Mobile primitives | Build our own in `mobile/components/ui/` (Button, Input, Card, Sheet, Toast, Dialog, Avatar, Skeleton) matching shadcn API — no third-party RN UI library |
| C3 | Mobile API | `@tanstack/react-query` + `mobile/lib/api/client.ts` fetch wrapper with bearer + **401 auto-refresh** + `ApiError` throw |
| C4 | Audit | Extend `AuditMeta` union with `client: 'web' \| 'mobile'`; derive from `X-Client` header set by mobile API client |
| C5 | Mobile tree | Mirror web: `mobile/features/{auth,profile,avatar,messages,notifications}/`; `mobile/app/` is thin route files |
| P1 | Freshness signal | **DB triggers** populate `users.notifications_updated_at` + `users.messages_updated_at`; never app-level writes (race-safe) |
| P2 | Session caching | Skip in v1; TODOS.md #1 trigger threshold |
| T1 | E2E coverage | 11 Maestro flows (boil-the-lake) |
| T2 | E2E runs | Local-only; TODOS.md #2 tracks CI promotion |
| T3 | Type tests | `tsd` for AuditMeta contract; integration suite for cookie + bearer × all `/api/*` routes |
| OV1 | Strategy | Proceed now (don't wait for first fork to ship); mobile is a known MLabs requirement |
| OV2 | Bearer lifecycle | 1hr access + 7d refresh; revocation on admin ban via refresh-token row delete |
| OV6 | Deep-link verifier | `scripts/verify-deeplinks.ts` (local-only) validates AASA + assetlinks |
| OV7 | Error wire format | `src/lib/schemas/api-error.ts` Zod schema `{ error: { code, message, field? } }`; `apiError()` server helper; refactor existing routes |

---

## Architecture

```
┌─────────────────────────────── single repo ────────────────────────────────┐
│                                                                             │
│   src/  (Next.js web)                  mobile/  (Expo)                     │
│   ├── app/api/*  ◀────┬───── REST ────────────────┬── lib/api/client.ts   │
│   │  (cookie+bearer)  │                           │  (bearer + refresh)    │
│   ├── lib/auth/       │                           │                        │
│   │  └─ bearer plugin │                           ├── features/            │
│   ├── lib/schemas/  ◀─┼───── import shared ───────┤  ├── auth/             │
│   │  └─ api-error.ts  │     pure Zod, no Drizzle  │  ├── profile/          │
│   ├── lib/email/url.ts│                           │  ├── avatar/           │
│   ├── lib/db/         │                           │  ├── messages/         │
│   │  ├── schema/users │                           │  └── notifications/    │
│   │  │  + 2 timestamps│                           │                        │
│   │  │  (DB triggers) │                           ├── components/ui/       │
│   │  └── audit.ts     │                           │  └─ 8 primitives        │
│   │     + client field│                           │                        │
│   └── config/design.ts───────► generator ────────►│  tailwind.config.js    │
│                          gen-mobile-tailwind.ts    │  (generated, RO)       │
│                                                    │                        │
│   public/.well-known/                              │  app.config.ts         │
│   ├── apple-app-site-association ◀─── deep ───────┤  + bundle ID           │
│   └── assetlinks.json              link verifier  │  + scheme              │
│                                                    │                        │
└─────────────────────────────────────────────────────────────────────────────┘

POLLING + CONDITIONAL GET FLOW

  Mobile client                  Server                       Postgres
       │                            │                            │
       │ GET /api/notifications     │                            │
       │ /unread-count              │                            │
       │ If-Modified-Since: T0      │                            │
       │ Authorization: Bearer ...  │                            │
       │ X-Client: mobile           │                            │
       ├───────────────────────────►│                            │
       │                            │ SELECT notifications_      │
       │                            │ updated_at FROM users      │
       │                            │ WHERE id = $session_user   │
       │                            ├───────────────────────────►│
       │                            │◄─────────── T1 ────────────┤
       │                            │                            │
       │                            │ if T1 <= T0 → 304          │
       │                            │ if T1  > T0 → 200 + body   │
       │◄───────────────────────────┤                            │
       │  (304 short-circuits before any notifications table read)│
```

---

## Files touched

### New files
- `mobile/` — entire Expo tree (~50 files; layout, screens, primitives, features, lib, config)
- `src/lib/schemas/index.ts` — barrel
- `src/lib/schemas/api-error.ts` — `ApiErrorResponse` Zod + `apiError()` helper
- `src/lib/schemas/auth.ts` — pure-Zod sign-up, login, reset schemas (extracted from Drizzle land)
- `src/lib/email/url.ts` — `buildAuthUrl()` + `buildAppLinkUrl()`
- `src/lib/db/migrations/NNNN_add_user_timestamps.sql` — `notifications_updated_at` + `messages_updated_at` columns + 2 triggers
- `public/.well-known/apple-app-site-association` — placeholder
- `public/.well-known/assetlinks.json` — placeholder
- `eslint-rules/no-drizzle-in-schemas.js` + test
- `scripts/gen-mobile-tailwind.ts` — design token generator with `--check` flag
- `scripts/verify-deeplinks.ts` — fetches + validates AASA/assetlinks
- `docs/decisions/0004-expo-over-natively.md` ✓ (this PR)
- `docs/decisions/0005-conditional-get-load-math.md` ✓ (this PR)
- `TODOS.md` ✓ (this PR)

### Modified
- `src/lib/auth/index.ts` — enable bearer plugin + refresh token rotation
- `src/lib/auth/server.ts` — audit cookie-or-bearer (Better Auth handles automatically; verify in tests)
- `src/lib/db/audit.ts` — extend `AuditMeta` union with `client` field, default `'web'`
- `src/lib/db/schema/users.ts` — add `notifications_updated_at`, `messages_updated_at` columns
- `src/lib/email/templates/*` — refactor to use URL helpers
- `src/app/api/*/route.ts` (every handler) — return `ApiErrorResponse` shape via `apiError()` helper; derive `client` from `X-Client` header for audit
- `src/app/api/notifications/unread-count/route.ts` — add If-Modified-Since check
- `src/app/api/messages/conversations/route.ts` — add If-Modified-Since check
- `PLAN.md` — §4 monorepo carve-out note, §8 drop `prep-natively-build`, §12 drop "Native mobile codebase"
- `IMPLEMENTATION.md` — insert Phase 5.5 between Phase 5 and Phase 6
- `package.json` — add Better Auth v1.6.10 bump, scripts entries
- `HANDOVER.md.template` — add production EAS submission checklist + deep-link prerequisites

---

## Implementation lanes (parallelizable)

```
LANE A — server foundations (sequential prerequisite, ~3 days)
   1. Bump Better Auth → v1.6.10
   2. Enable bearer plugin + refresh token rotation in src/lib/auth/index.ts
   3. Audit every src/app/api/**/route.ts for requireUser/getSession
   4. Write cookie regression suite + bearer integration suite
   5. Merge

LANE B — server lib + schema work (~3 days, parallel with C/D after A merges)
   6. Create src/lib/schemas/api-error.ts + apiError() helper
   7. Refactor every src/app/api/**/route.ts to use apiError()
   8. Extract pure-Zod schemas from features/* into src/lib/schemas/
   9. Add ESLint rule no-drizzle-in-schemas + unit test
   10. Extend AuditMeta union with client field; thread X-Client header through handlers
   11. Create src/lib/email/url.ts + refactor email templates
   12. Drizzle migration: add 2 timestamp columns + 2 DB triggers to users
   13. Add If-Modified-Since handling to /api/notifications/unread-count + /api/messages/conversations
   14. Tests: conditional GET 304/200 + DB trigger atomicity

LANE C — mobile scaffold (~5 days, parallel with B/D)
   15. Init mobile/ with Expo Router + TypeScript strict + EAS init
   16. Write scripts/gen-mobile-tailwind.ts (with --check, header banner emit)
   17. Wire NativeWind v4 against generated config
   18. CI: gen:mobile-tw --check + pre-commit hook
   19. Build 8 primitives in mobile/components/ui/
   20. Set up @tanstack/react-query + mobile/lib/api/client.ts with 401 refresh logic
   21. mobile/features/auth/ — hooks + screens (signup, login, forgot, reset, verify)
   22. mobile/features/profile/ — hook + screen
   23. mobile/features/avatar/ — hook + screen + expo-image-picker
   24. mobile/features/messages/ — hooks + screens (inbox + thread)
   25. mobile/features/notifications/ — hook + screen + AppState cadence
   26. Expo Router Linking config + deep-link handler
   27. Better Auth Expo client + expo-secure-store wiring
   28. mobile/eas.json — dev + preview profiles
   29. Maestro 11 flows in mobile/.maestro/

LANE D — docs + deep-link infrastructure (~1.5 days, parallel)
   30. docs/decisions/0004-expo-over-natively.md ✓
   31. docs/decisions/0005-conditional-get-load-math.md ✓
   32. PHASE_5_5.md ✓
   33. PLAN.md edits
   34. IMPLEMENTATION.md edits
   35. TODOS.md ✓
   36. public/.well-known/apple-app-site-association + assetlinks.json
   37. scripts/verify-deeplinks.ts
   38. HANDOVER.md.template (new file) with EAS submission checklist + bundle ID / team ID / SHA collection

LANE E — final integration (~1 day, after B + C merge)
   39. Wire mobile screens to /api/* endpoints with X-Client: mobile
   40. tsd type test for AuditMeta contract
   41. Run full cookie regression suite (must still pass)
   42. Run full bearer integration suite
   43. Run 11 Maestro flows locally (CONTRIBUTING.md)
   44. Update CHANGELOG
```

**Conflict flags:** Lane B and D both touch `PLAN.md`. Coordinate: Lane D's PLAN.md edits land last.

---

## Tests (~25 new + 11 Maestro)

**Critical regressions (IRON RULE — must ship):**
- Cookie auth still works on every `/api/*` after bearer plugin enabled
- Existing `audit()` callers compile with extended union (type test)
- `/api/notifications/unread-count` without `If-Modified-Since` returns 200 + body (unchanged web behavior)
- `src/lib/schemas/` ESLint rule fires on `drizzle-orm` import

**Server integration (Vitest):**
- 6 routes × 2 transports (cookie + bearer) = 12 contract tests
- Conditional GET: 304 path (timestamp match) + 200 path (new data)
- DB trigger atomicity (insert notification → timestamp updated in same transaction)
- `buildAuthUrl` / `buildAppLinkUrl` happy + edge (URL-encoded tokens)
- `apiError()` helper produces locked shape
- Refresh token flow: access expires → mobile gets 401 → refresh succeeds → retry → 200
- Refresh token revocation: admin ban deletes refresh token row → next refresh → 401 → mobile logs out

**Type tests (tsd):**
- `AuditMeta` union: default `'web'` when client field omitted
- `ApiErrorResponse` shape contract

**Mobile unit (Jest + RNTL):**
- 8 primitives — variant + size prop matrix
- API client wrapper — bearer attach, 401 refresh, ApiError throw
- AppState cadence hook — foreground 5s, background 60s

**Mobile E2E (Maestro, 11 flows, local-only):**
1. signup → verify email → tap universal link → app opens → home
2. login wrong password → inline error
3. login unverified user → inline error + resend
4. forgot password → tap link → reset → login
5. avatar upload from library → appears on profile within 2s
6. send DM to existing user → appears in thread → web user sees within 10s
7. notifications 304 polling → no UI flicker
8. cold launch → restore session from SecureStore → home
9. sign out → SecureStore cleared → next launch login
10. admin ban (via web) → mobile next call refresh fails → signed out
11. backgrounded mid-upload → completes or fails clearly

See `~/.gstack/projects/Vbhadala-mlabs/vinod-Vbhadala-muscat-v1-eng-review-test-plan-20260511-221355.md` for the full test plan artifact.

---

## Failure modes evaluated

| Codepath | Failure mode | Test | Error handling | User experience |
|---|---|---|---|---|
| Bearer auth | Access token expired | ✓ | refresh on 401, retry | seamless |
| Bearer auth | Refresh token expired | ✓ | sign out + login screen | one-time interruption |
| Bearer auth | Admin ban during session | ✓ E2E #10 | refresh fails → sign out | immediate next interaction |
| DB trigger | Migration fails midway | ✓ | Drizzle rollback | n/a (caught in CI) |
| DB trigger | Trigger fires correctly | ✓ atomicity test | n/a | n/a |
| Avatar upload | Background mid-upload | ✓ E2E #11 | abort + toast | clear retry |
| Avatar upload | >5MB file | ✓ | client-side reject | inline message |
| Avatar upload | Camera permission denied | ✓ | inline message | user can grant + retry |
| Universal link | App not installed | manual only | OS falls back to web | minor — opens browser |
| Email URL helper | EXPO_SCHEME missing | ✓ | falls back to web URL | email opens browser, still works |
| Conditional GET | Server clock skew → stale 304 | flag | needs explicit Date header | possible 1-poll-interval stale state |
| Audit X-Client header | Missing on mobile request | ✓ | defaults to 'web' (correct behavior) | n/a |

**Critical gaps:** None remaining. Timestamp race resolved via DB triggers (P1).

---

## Unresolved concerns (acknowledged, not fixed)

1. **Mobile E2E rot** — local-only Maestro will degrade over time. TODOS.md #2 tracks promotion to CI.
2. **Innovation token contradiction** — Expo + NativeWind + Better Auth bearer + Maestro + EAS = ~5 moving parts; v1 already spent 3 tokens (Better Auth, Replit, polling). Acknowledged trade-off.
3. **Estimate** — 3–4 weeks is a planning estimate, not a guarantee. Real number emerges from Lane A + B (server foundations) since those gate everything else.
4. **Better Auth pin** — bumped to v1.6.10 to get the bearer cookie-merge bugfix (released 2026-05-09). Another bugfix could land before Phase 5.5 ships, requiring another pin.

---

## Definition of done

- [ ] Lanes A–E all merged
- [ ] Cookie regression suite green
- [ ] Bearer integration suite green
- [ ] 11 Maestro flows passing locally
- [ ] `gen:mobile-tw --check` green in CI
- [ ] `verify:deeplinks` runs clean on a fake fork
- [ ] HANDOVER.md.template populated
- [ ] `package.json` mobile scripts: `dev`, `build`, `test`, `e2e`
- [ ] EAS dev build builds successfully on Mac + Linux
- [ ] PR merged with `feat(phase-5.5): expo mobile + bearer auth + conditional GET`

---

## Design specification (locked by /plan-design-review 2026-05-12)

### Navigation graph

```
Root (Expo Router)
 │
 ├── (auth)  ── stack, no tab bar, brand wordmark in header
 │    ├── sign-up.tsx
 │    ├── login.tsx
 │    ├── forgot-password.tsx
 │    ├── reset-password.tsx       ← deep-link target (modal-over-auth)
 │    ├── verify.tsx               ← deep-link target (modal-over-auth)
 │    └── check-email.tsx          ← post-signup verify-pending screen
 │
 └── (app)   ── bottom tab bar, 4 tabs, icon + label always visible
      ├── home/         Tab 1 — greeting + 1 CTA placeholder
      ├── messages/     Tab 2 — inbox → [id] thread (stack within tab); badge for unread
      ├── notifications Tab 3 — list; badge for unread
      └── profile       Tab 4 — iOS Settings pattern (grouped rows, NOT cards)
```

Tab bar hidden on auth screens. Deep-link targets stacked modally over auth.

### Per-screen information hierarchy

| Screen | Primary | Secondary | Tertiary |
|---|---|---|---|
| Home | "Welcome, {name}" + 1 primary action placeholder | (fork-customizable) | — |
| Sign-up | Full-screen layout: brand wordmark top-left, big H1, fields w/ 24px gaps, primary CTA bottom-pinned full-width | Field validation inline | "Already have an account?" footer |
| Login | Same composition as Sign-up | Inline error on failed auth | "Forgot password?" + "Need an account?" |
| Forgot password | Email field + send-reset CTA | Helper text | Back to login link |
| Reset password | New password + confirm fields | Submit CTA | (no nav — deep-link landing) |
| Verify | Auto-runs token check + status text | Manual "resend verify" if failed | (no nav — deep-link landing) |
| Check email (post-signup) | "We sent a link to {email}. Tap it on this phone to continue." + "Open Mail app" button (Linking.openURL('message://')) | "Resend" after 30s cooldown | — |
| Profile | Avatar + name identity row | Grouped editable rows (Profile / Security / Account) with iOS Settings hairline dividers and uppercase muted section headers | Danger Zone (Sign out, Delete account) |
| Messages inbox | Most recent thread first | Compose button (header icon) | Empty state w/ illustration + "Send your first DM" CTA |
| Messages thread | Message list (newest at bottom, auto-scroll) | Composer pinned bottom (above keyboard) | Contact name + avatar in header |
| Notifications | Unread first, then grouped by day with date dividers | "Mark all read" header action | Empty state w/ celebratory illustration + "You're all caught up." |

### Interaction state matrix

| Screen | Loading | Empty | Error (network/5xx) | Success | Partial (offline / 304) |
|---|---|---|---|---|---|
| Home | Skeleton greeting | n/a (always has greeting) | Toast + cached name | n/a | Last cached name visible |
| Sign-up | Submit btn → spinner | n/a | Inline Zod field errors | → Check-email | n/a (online-only) |
| Login | Submit btn → spinner | n/a | Inline "Wrong email/password" | → Home | n/a |
| Forgot pw | Submit btn → spinner | n/a | Inline "Couldn't send" | "Check your email" view | n/a |
| Reset pw | Submit btn → spinner | n/a | "Link expired" + retry | → Login | Show token from URL params |
| Verify | Auto-spinner on mount | n/a | "Link expired" + resend | → Home | n/a |
| Profile | Skeleton row stack | n/a (always has self) | Toast + last cached | Toast "Saved" + new value | Cached values, edit disabled |
| Messages inbox | 3 skeleton rows | Illustration + "Send your first DM" CTA | Empty list + retry toast | Polling auto-refresh | Last cached list visible |
| Messages thread | 5 skeleton bubbles | "Say hello to {name}" + composer focused | Toast + retry state on message bubble | Optimistic append | Pending state (gray bubble + retry tap) |
| Notifications | 3 skeleton rows | Illustration + "You're all caught up." | Empty + retry toast | Polling auto-refresh | Last cached list visible |
| Avatar uploader | Spinner over preview | (within Profile) | Toast + restore previous avatar | Toast "Saved" | n/a |

### Onboarding journey (cold launch → signed in)

```
| STEP | USER DOES              | FEELS              | SUPPORTED BY                                     |
|------|------------------------|--------------------|--------------------------------------------------|
|  1   | Open app cold          | Curious            | Brand splash (wordmark on themed bg)             |
|  2   | Tap "Get started"      | Committed          | Sign-up screen instantly visible                 |
|  3   | Type email/pw/name     | Slight friction    | Inline validation as they type                   |
|  4   | Tap "Create account"   | Anticipation       | Submit → spinner (real feedback)                 |
|  5   | Land on Check-email    | Mild confusion     | "We sent X. Tap link on this phone." + Open Mail |
|  6   | Switch to Mail         | Task-switch        | Native Mail app launched via Linking             |
|  7   | Tap verify link        | Hope               | Universal link opens app → verify.tsx            |
|  8   | See verify spinner     | Brief impatience   | Auto-runs, <1s happy case                        |
|  9   | Land on Home tab       | RELIEF + WELCOME   | "Welcome, {name}" + tab bar visible              |
| 10   | Notice tab bar         | Orientation        | Icon + label tabs make destinations obvious      |

Time-horizon design:
- 5s visceral: branded splash, not generic Expo.
- 5m behavioral: signup → check email → verify → home, all under 90s typical.
- 5y reflective: trustworthy data handling (audit log + bearer refresh + revocation visible in profile).
```

### AI slop hard rejections — all addressed

- Auth screens: **full-screen layout** (NOT centered card) — brand wordmark top-left, big H1, field stack with 24px gaps, primary CTA bottom-pinned full-width
- Profile: **iOS Settings pattern** (grouped rows + hairline dividers + uppercase muted section headers) — NOT stacked cards
- Empty states: **3 hand-drawn-style monochrome SVGs** shipped (`mobile/assets/empty-inbox.svg`, `empty-notifications.svg`, `empty-search.svg`), single brand color via `currentColor`, forks override 3 files
- Typography: **Geist via expo-font** for pixel parity with web (NOT Inter — that's the AI default to avoid)
- Decorative chrome: none. No blobs, no wavy dividers, no emoji-as-design. Plain.

### Mobile-specific design system

- Dark mode: **`useColorScheme()` from Expo** — app matches OS setting; no in-app toggle in v1 (matches web's default-follow behavior). Toggle deferred to TODOS.
- Typography: **Geist** loaded via `expo-font`, splash held by `SplashScreen.preventAutoHideAsync()` until ready
- Tokens: generated from `src/config/design.ts` into `mobile/tailwind.config.js` (DO-NOT-EDIT header banner)
- Splash: brand wordmark centered on themed bg; assets at `mobile/assets/splash.png` + `splash-dark.png`
- Avatar fallback: **initials** on color derived deterministically from `hash(user.id) % palette.length` (Gmail/Slack pattern)
- Toasts: **bottom-anchored**, 3s success / 6s error, dismiss-on-tap. One `Toast` primitive both platforms.

### Accessibility specs

**Touch targets** (mandatory; lint rule TBD):
- Tab icons: 48pt height, 60pt tap area
- Buttons / inputs: 44pt min height
- Icon-only buttons: 44 × 44pt
- List rows (inbox, notifications): 60pt min
- Avatar tap on profile: 88 × 88pt

**Responsive viewports** (Maestro test matrix):
- 320pt (iPhone SE — smallest supported)
- 375pt (iPhone 13 mini — baseline)
- 414pt (iPhone Pro Max baseline)
- 430pt (iPhone 15 Pro Max)
- 768pt (iPad portrait — basic support, no iPad layout v1)

Every screen wraps in `SafeAreaView` (`react-native-safe-area-context`).

**Dynamic Type:**
- All text scaled units; cap at 1.5× on display H1
- Tested against iOS "Larger Text" max setting

**Screen reader (VoiceOver / TalkBack):**
- Every button has `accessibilityLabel`
- All icon-only tap targets have a label
- Form fields have `accessibilityHint` for non-obvious behavior
- Empty states: `accessibilityRole="text"` on illustration + text combo

**Color contrast (WCAG AA):**
- Body text: 4.5:1 against background (light + dark themes)
- Large text (18pt+): 3:1 minimum
- Interactive elements: 3:1 against adjacent colors
- **Automated check:** `scripts/check-contrast.ts` reads token pairs from `src/config/design.ts`, fails build if any pair < 4.5:1. Wired into pre-commit + CI.

**Keyboard / external input:**
- All forms tab-navigable (iPad with keyboard)
- Submit on `returnKeyType="go"` on final field
- `keyboardShouldPersistTaps="handled"` on scrollers

### Approved mockups

No visual mockups generated this pass — gstack designer requires OpenAI API key not configured. All decisions text-locked above. Recommend running /design-shotgun later for visual exploration of:
1. Sign-up screen variants (the brand-defining moment)
2. Tab bar styling (label position, badge style)
3. Empty-state illustration set

---

## References

- `docs/decisions/0004-expo-over-natively.md`
- `docs/decisions/0005-conditional-get-load-math.md`
- `~/.gstack/projects/Vbhadala-mlabs/vinod-Vbhadala-muscat-v1-eng-review-test-plan-20260511-221355.md`
- `TODOS.md`
- /plan-eng-review session 2026-05-11, commit `124b3a4`
- /plan-design-review session 2026-05-12, commit `124b3a4` (initial 5/10 → final 9/10)
