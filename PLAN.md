# MLabs Template — v1 Plan

**Status:** Plan locked. Reviews complete (`/plan-eng-review` + `/plan-design-review`). Ready for spike + implementation.
**Reviewers:** Eng review, design review, Claude subagent (outside voice).
**Date locked:** 2026-05-09
**Branch:** `Vbhadala/try-now`

---

## 1. Mission

A monorepo template that the MLabs / Million Labs agency forks for every new MVP. Optimises for:

- **Fork-to-first-deploy in <30 minutes**
- **Handover-ready** — a non-MLabs dev or the client themselves can run, modify, and deploy
- **30 MVPs/year compounding leverage** — fixes and patterns flow back via `upgrade-template`
- **Consistency across forks** — devs save brainpower for the actual product, not stack decisions

Every fork inherits a working stack with auth, profile, avatar, notifications, messaging, admin, payments-ready, and a brand/SEO/design config layer that rebrands the whole app in 10 minutes.

---

## 2. Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14+ App Router + TypeScript | Most AI-fluent stack; standard |
| Styling | Tailwind CSS + shadcn/ui (copy-in, not dep) | Industry default; design tokens flow from `config/design.ts` |
| Icons | lucide-react | shadcn default, ~1k icons, tree-shakable |
| Theme | `next-themes` (system default + profile toggle) | Boring, dark mode "just works" |
| Database | Postgres on Neon | Generous free tier, Replit-friendly, branchable |
| ORM | Drizzle | Type-safe, lightweight, `drizzle-zod` for validation |
| Auth | **Better Auth** + Drizzle adapter | Self-hosted, TypeScript-native, modern features built-in. Layer 2 risk noted; migration path documented |
| Email | **Postmark** (transactional) | Best deliverability for transactional; templates editable by client post-handover |
| Storage | **Replit Object Storage** (default driver) | Already agency standard; clients inherit; Cloudinary/S3 swappable via adapter |
| Validation | Zod everywhere at boundaries | Better Auth uses it, `drizzle-zod`, shadcn forms |
| Env validation | `@t3-oss/env-nextjs` | Boot-time fail if env wrong |
| Tests | Vitest (unit/integration) + Playwright (E2E) | Both Layer 1 boring |
| Hosting | **Replit Reserved VM** | Single-instance is enough for MVP scale; deploy story matches client expectations |
| Package mgmt | npm (single Next.js app, **no workspaces**) | Reversed from initial plan — no second consumer; Replit ergonomics matter |

**Explicitly not used in v1:**
- pnpm workspaces (single app — `src/lib/` is the honest shape)
- SSE / WebSockets / LISTEN/NOTIFY (polling is enough; survives Replit deploys)
- Background job runners (`setInterval`, queues — inline send + retry button is enough)
- Pino / winston (thin `console` wrapper is enough)
- t() i18n wrapper (most MVPs are single-language; document migration if needed)
- Mixpanel / Sentry (per user request; revisit per-product)

---

## 3. Architecture

### Repo layout

```
mlabs-template/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Landing — `/`, `/about`, `/contact`
│   │   ├── (auth)/               # `/login`, `/signup`, `/forgot-password`, `/reset-password`
│   │   ├── (app)/                # Authed area
│   │   │   └── layout.tsx        # Nav links HARDCODED here (no registry)
│   │   ├── (admin)/              # Admin shell
│   │   ├── api/                  # Route handlers
│   │   └── globals.css           # CSS variables driven by design.ts
│   │
│   ├── features/                 # TRULY REMOVABLE — delete the folder + nav line
│   │   ├── profile/              # name, email, password change, delete account
│   │   ├── avatar/               # upload + server-side sharp resize
│   │   ├── notifications/        # in-app inbox, polling at 5s
│   │   ├── messages/             # user-to-user DMs, polling at 2s when chat open
│   │   └── admin/                # user mgmt, role/status, audit log writer
│   │
│   ├── lib/                      # CORE (non-removable)
│   │   ├── auth/                 # Better Auth config + helpers
│   │   ├── db/                   # Drizzle client (pooled), schema/, audit_log helper
│   │   ├── email/                # Postmark typed wrappers (one per template)
│   │   ├── storage/              # Adapter interface + Replit Object Storage driver
│   │   ├── ui/                   # shadcn primitives + EmptyState/LoadingState/ErrorState/DataList
│   │   └── logger/               # console wrapper + error_log table writer
│   │
│   └── config/                   # CENTRALIZED — rebrand happens here
│       ├── brand.ts              # name, tagline, supportEmail, socialHandle, legalEntity
│       ├── seo.ts                # defaultTitle, titleTemplate, description, ogImage
│       ├── design.ts             # semantic tokens + scales (see §6)
│       └── env.ts                # t3-env validation
│
├── drizzle/migrations/           # Committed SQL migrations
├── tests/                        # Vitest + Playwright
│
├── docs/
│   ├── decisions/
│   │   └── 0001-no-realtime.md   # Why polling, not SSE
│   ├── migrations/
│   │   └── from-better-auth.md   # If a fork outgrows Better Auth
│   └── handover/
│       ├── HANDOVER.md.template  # Copies into each fork on `new-project`
│       ├── secret-rotation.md    # Pre-launch checklist
│       └── backups.md            # Neon PITR runbook
│
├── .claude/skills/               # 7 skills (see §8)
├── DESIGN.md.template            # Each fork's design system source of truth
├── HANDOVER.md.template          # Each fork's handover story
├── TODOS.md                      # Deferred work list
├── .env.example                  # Every var documented with comment + source link
├── .replit                       # Replit-specific run/deploy config
├── replit.nix                    # If needed for sharp etc.
└── README.md
```

### Hard rules

- **No string literal of `brand.name` outside `config/brand.ts`** (ESLint enforced; allowlist: `config/`, `templates/`, `legal/`)
- **No raw `process.env` outside `config/env.ts`** (ESLint enforced)
- **`import "server-only"` in `lib/db`, `lib/email`, all `features/*/server/`** (build-time fail if leaked to client)
- **All input validation through Zod at boundaries** (Server Actions, route handlers)
- **Drizzle migrations only via `generate` + `migrate`** — never `push` in any environment; pre-commit hook fails if uncommitted schema changes have no migration
- **Idempotent webhooks/emails** by external ID
- **Boring deps only** (>2yr stable OR major-company-backed OR critical mass)

---

## 4. Locked architectural decisions

| # | Decision | Choice |
|---|---|---|
| A1 | Auth's home | `src/lib/auth/` — core, hard dep |
| A2 | Direct DB connection for LISTEN/NOTIFY | **Moot** — no SSE in v1 |
| A3 | Storage abstraction | Adapter in `src/lib/storage`, Replit Object Storage as default driver |
| A4 | Feature registry | None — plain Next.js routes; nav hardcoded in `app/(app)/layout.tsx` |
| A5 | Customization vs upgrades | At-your-own-risk; `upgrade-template` shows diffs, doesn't merge |
| Q6 | Drizzle migrations | `generate` (committed) + `migrate` on deploy. Pre-commit hook enforces. |
| Q7 | Audit log | Baked in v1: `audit_log` table + `audit({actor, action, target, meta})` helper. Metadata is a typed allowlist (no free-form PII). |
| T8 | Account deletion | Anonymize-in-place: PII wiped, FKs intact, audit log preserved |
| T9 | Postmark failure on signup | **Reversed:** inline send from Server Action; catch + show retry button. No `email_jobs` table, no setInterval runner. |
| P10 | Realtime architecture | **Reversed:** polling everywhere. Notifications: 5s. Messages: 2s when chat open, 10s background. No SSE, no `lib/realtime`, no LISTEN/NOTIFY. |
| P11 | Avatar resize | **Reversed:** server-side `sharp` resize, single path. iOS Safari canvas issue avoided. |
| OV1 | Monorepo vs single-app | **Reversed:** single Next.js app with `src/lib/`. No pnpm workspaces. |
| D1 | Dark mode | Built-in via `next-themes`, system default, toggle in profile |
| D2 | Auth screen pattern | Centered card on neutral background. Boring, configurable, no per-fork asset |
| D3 | Loading state default | Skeleton for `<DataList>`, spinner for button actions |

---

## 5. Features in v1

| Feature | Type | Notes |
|---|---|---|
| Auth (signup, login, password reset, email verify, session middleware) | core (`lib/auth`) | Better Auth + Drizzle. Email verify required. Better Auth's built-in rate limit on login. |
| Profile (name, email change with reverify, password change, **delete = anonymize**) | feature | Sectioned-card single page |
| Avatar (upload, server-side sharp resize, replace cleans old file) | feature | 256×256 default, JPEG output |
| Notifications (in-app inbox + read state, optional Postmark + push channels) | feature | Polling at 5s when authed |
| Messages (DMs: conversations, send, read, **polling at 2s when chat open**) | feature | Plain CRUD; no realtime infra |
| Admin (user list, search, role change, ban/unban, send password reset, **all audit logged**) | feature | Sectioned admin layout; `audit()` invoked on every state change |
| Landing page | core | `/` route; swappable hero/features blocks per fork |
| Legal pages | core | `/terms`, `/privacy` as MDX with brand placeholders |
| Contact form | core | Routes to support email via Postmark with metadata |

---

## 6. Design system

### `config/design.ts` shape (locked)

```ts
export const design = {
  colors: {
    light: {
      // HSL triplets (shadcn convention) — drive CSS variables
      background, foreground, surface, surfaceMuted,
      border, input, muted, mutedForeground,
      accent, accentForeground,
      danger, dangerForeground,
      success, successForeground,
      warning, warningForeground,
      ring,
    },
    dark: { /* mirror set */ },
  },
  type: {
    xs, sm, base, lg, xl, "2xl", "3xl", "4xl"  // 8 sizes, no more
  },
  fonts: {
    sans: "Inter Variable, system-ui, sans-serif",
    display: "Inter Variable, system-ui, sans-serif",  // overridable per fork
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
  radius: { sm, md, lg, xl, full },
  motion: {
    durations: { instant, fast, normal, slow },
    easings: { out, in, inOut },
  },
} as const
```

Consumed by:
- `tailwind.config.ts` — extends theme from these tokens
- `app/globals.css` — sets CSS variables for both light and dark
- `next-themes` — handles `class="dark"` toggle

### State primitives (in `src/lib/ui`)

- `<EmptyState icon title description action />` — every list view; warmth + primary action
- `<LoadingState variant="skeleton|spinner|shimmer" rows />`
- `<ErrorState title description retry detail />` — collapsible technical detail
- `<DataList data loading error empty renderItem />` — list-rendering helper that **requires** all states; devs cannot forget

### `config/brand.ts` shape

```ts
export const brand = {
  name: "BetFrnd",
  tagline: "...",
  supportEmail: "support@...",
  socialHandle: "@...",
  legalEntity: "BetFrnd Ltd",
}
```

### `config/seo.ts` shape

```ts
export const seo = {
  defaultTitle, titleTemplate, description, ogImage, twitterCard
}
// Helper: generateMetadata() factory used by every route
```

### Default OG image

`@vercel/og` route at `/api/og` produces brand-default social cards. Each fork can override.

### Brand customization in 10 minutes (the template's promise)

1. Edit `config/brand.ts` (5 fields)
2. Edit `config/design.ts` colors (HSL triplets — light + dark)
3. Swap `public/favicon.ico`
4. Swap `public/og-default.png` (or rely on `@vercel/og` route)

That's the whole rebrand.

---

## 7. State primitives (recap)

Convention: **every list view in every feature uses `<DataList>`**. Forks inherit the pattern by example — every shipped feature demonstrates it.

```tsx
<DataList
  data={notifications}
  loading={isLoading}
  error={error}
  empty={<EmptyState ... />}
  renderItem={(n) => <NotificationRow {...n} />}
/>
```

---

## 8. Claude Code skills (in `.claude/skills/`)

| Skill | What it does |
|---|---|
| `new-project` | Clone template, rename, set up Replit, generate Stripe test keys, create Neon DB branch |
| `remove-feature` | Safely delete a feature folder: drop migrations, remove env vars, remove npm dep, update nav |
| `add-feature` | Pull a feature back in from upstream template (post-fork) |
| `upgrade-template` | Diff against template version, show patchable changes — dev decides what to merge |
| `generate-admin-crud` | Given a Drizzle table, scaffold admin list/detail/edit |
| `prep-natively-build` | Pre-flight for Natively wrap: manifest, icons, splash, deep links, push setup |
| `handover-pack` | Generate filled `HANDOVER.md`, env checklist, Loom recording script, client invite, secret rotation list |

---

## 9. Testing

**Stack:** Vitest (unit + integration) + Playwright (E2E).

**Must-ship in v1 template (the demonstration set forks copy):**
1. Auth wrapper tests (~8): signup happy + duplicate email + Postmark failure handling; login happy + wrong password + unverified user; password reset request + confirm + reuse rejected
2. Adapter tests (~6, mocked externals): `audit` helper, storage upload/delete/getUrl, email wrappers
3. **Authz tests** (4 critical boundaries): notifications cross-user, messages non-participant, messages SSE → moot (now polling), admin endpoints non-admin
4. **5 E2E tests** (Playwright): signup→verify→login→profile, forgot password→reset→login, A sends DM→B sees within 3s (polling), admin bans user→user blocked, avatar upload→appears on profile
5. CI smoke: `npm install && npm run typecheck && npm run build && npm run db:migrate:dry-run && npm test`

**Skip:** snapshot tests, UI unit tests on shadcn primitives, performance/load tests for v1.

**Test plan artifact:** `~/.gstack/projects/Vbhadala-mlabs/vinod-Vbhadala-try-now-eng-review-test-plan-20260509-083650.md`

---

## 10. Critical gaps — fix in v1 base

These were flagged by the eng review and the outside voice. Don't defer.

| Gap | Fix |
|---|---|
| `audit()` write failure is silent | Wrap in try/catch + loud `logger.error`; for state-change actions, **write audit before action** so failed audit blocks action |
| `error_log` DB table for post-incident analysis | 20 lines: table + `logger.error()` writes a row in addition to console |
| Audit log metadata GDPR | Typed `AuditMeta` union; no free-form strings allowed in `metadata` jsonb |
| Brand-string ESLint rule exception list | Enumerate explicitly in `.eslintrc`: `config/`, `templates/`, `legal/`, `messages/translations/` |
| Better Auth abandonware risk | Document `docs/migrations/from-better-auth.md` upfront — even 1-page outline is insurance |

---

## 11. Implementation phases (parallelization)

### Pre-W1: spikes (de-risk before scaffolding)

| Spike | Time | Why |
|---|---|---|
| **Sharp on Replit Reserved VM** | 15 min | Verify Linux x64 binary installs cleanly in `npm install`; if not, server-side avatar resize plan breaks |
| **Polling load test sketch** | 30 min | Quick math + back-of-envelope: 1k users × 5s notif poll × 24h = ~17M req/day — fits Replit Reserved VM? Postgres? |

### Lane plan

| Lane | Workstreams | Order |
|---|---|---|
| A | W1: Stack scaffold + config + ESLint + tsconfig + .env.example + .replit | Sequential prerequisite |
| B | W2: `lib/auth` (Better Auth + Drizzle wiring + sessions schema) | After A |
| B | W3: `lib/email` (Postmark typed wrappers; no jobs runner) | After A |
| B | W4: `lib/storage` (adapter + Replit driver) + `lib/ui` (shadcn + state primitives + DataList) + `lib/logger` (console wrapper + error_log) | After A |
| C | W5: `features/profile` + `features/avatar` (with sharp) | After B |
| C | W6: `features/notifications` (polling) | After B |
| C | W7: `features/messages` (CRUD + polling) | After B |
| C | W8: `features/admin` + `audit_log` table + `audit()` helper | After B (W2 dependency for audit metadata typing) |
| D | W9: `.claude/skills/*` (7 skills) | Independent — runs alongside A/B/C |

**Conflict flag:** W2, W3, W8 all touch `src/lib/db/schema/`. **Mitigation:** separate files (`users.ts`, `email_sends.ts` if needed, `audit_log.ts`); single `index.ts` re-exports.

**Estimated v1:** ~3-4 weeks for 1 dev + Claude. Less if ruthless.

---

## 12. NOT in scope (v1)

| Item | Why deferred |
|---|---|
| Analytics (Mixpanel, Sentry) | Per user; revisit per-product |
| i18n wrapper | Most MVPs single-language; document migration path |
| Multi-instance scaling beyond Reserved VM | Single-VM ceiling is fine for MVP scale |
| Feature flags / runtime feature toggling | Deletion model chosen |
| Audit log UI | Table + helper baked in v1; admin UI for browsing entries deferred |
| Multi-tenancy / orgs / teams | Better Auth has plugin if a project needs it |
| OAuth providers (Google/Apple) | Better Auth supports them; not enabled by default |
| 2FA / passkeys | Better Auth supports both; off by default; documented as opt-in |
| Background jobs beyond email retry | Email runner reversed; richer jobs deferred |
| Webhooks-in (Stripe etc.) | Per-project; template ships idempotent receiver pattern but not configured |
| User-to-user DMs across multiple devices with offline replay | Polling catches up on next poll; no message queue |
| Native mobile codebase | Natively wraps the responsive web app |
| Eject mechanic for sealed features | Defer unless customization-vs-upgrade pain emerges |
| Distribution mechanism for adding v2 features into in-flight forks | `add-feature` skill deferred until shape is proven |
| Per-product visual identity / landing hero | Each fork runs `/design-consultation` post-fork |
| Animation library beyond CSS transitions (framer-motion etc.) | Defer until first product needs orchestrated motion |
| Right-to-left language UI mirroring | i18n was deferred; RTL follows |
| High-density admin tables / data-grid libraries | Standard table is enough for v1 |

---

## 13. TODOs (deferred — captured before they're forgotten)

Tracked separately in `TODOS.md` post-v1.

| TODO | When |
|---|---|
| Rate limiting (Upstash + auth + email + polling endpoints) | Before first fork ships to real users |
| Backups & restore runbook (Neon PITR per-fork) | Pre-handover for first fork |
| Secret rotation checklist at handover | v1.1 |
| Cost ceilings & budget alerts (Replit + Neon + Postmark + Object Storage) | v1.1 (start with docs, integrations later) |
| Error tracking strategy beyond Replit logs | After 3rd fork; consider Sentry self-hosted or Better Stack |
| Better Auth migration path doc (to NextAuth/Clerk) | v1 (1-page outline) |
| Audit log metadata GDPR scoping (typed allowlist) | **v1 small** — bake in now |
| Brand-string ESLint rule exception list | **v1 tiny** — bake in now |
| Sharp on Replit binary verification spike | **Before W1** |
| Distribution mechanism for adding/upgrading features in already-forked projects | After 3 forks, when shape is proven |
| Document SSE-was-considered-and-rejected (`docs/decisions/0001-no-realtime.md`) | **v1** |
| Polling load test (1k users × 5s/2s polls) before v1 ships | **Pre-ship** |
| Default OG image generator (`@vercel/og` route) | v1 small |
| Motion preference detection (`prefers-reduced-motion`) wired into design tokens | v1 tiny |
| Dark mode QA pass on every starter component before v1 ships | **Pre-ship** checklist |
| Audit shadcn examples and pin which ones template uses (avoid drift) | Post-v1 |
| `<DataList>` example in every starter feature | v1 |
| `DESIGN.md.template` shipped with template | v1 |
| Brand-customization-in-10-min checklist in HANDOVER | v1 |
| Pick "Million Labs neutral" default fonts (sans + display + mono) | **v1 — needed before W4** |

---

## 14. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Better Auth becomes unmaintained | Low (now), Med (in 2027) | Medium | Migration doc to NextAuth in `docs/migrations/`; fork that hits problem self-rescues |
| Sharp doesn't install cleanly on Replit Reserved VM | Low | High (breaks avatar feature) | **15-min spike before W1** |
| Polling at 2s for messages feels janky | Medium | Medium | Document tradeoff in `0001-no-realtime.md`; first fork that needs better can swap to per-feature SSE |
| `upgrade-template` becomes unusable after fork divergence | High | Low (only affects in-flight projects) | Documented as best-effort; not a client promise |
| Cost run-up on abandoned fork (Replit + Neon + Postmark) | Medium | Low (per-fork small $) | TODO: budget alerts. Interim: handover doc tells client to monitor |
| Replit Reserved VM single-instance cap (≈1k concurrent) | Low for MVPs | Medium | Documented ceiling; projects that grow can graduate to multi-instance hosting |

---

## 15. Open questions before W1 starts

1. **Default fonts** for "Million Labs neutral" — Inter Variable for sans is locked. Display font? Mono font? (TODO before W4)
2. **Replit deploy frequency** — does Reserved VM redeploy on every push, or only on manual deploy? Affects polling decision rationale (now moot but worth knowing).
3. **Postmark account setup** — does MLabs have a multi-tenant Postmark setup, or one per fork? Affects `from` address strategy.
4. **Neon plan** — is the agency on Neon Pro (for branching + PITR) or free? Affects backup runbook.

---

## 16. Reviews complete

| Review | Outcome | Findings |
|---|---|---|
| `/plan-eng-review` | CLEAR | 13 issues addressed; 4 reversals from outside voice (monorepo, SSE, jobs runner, canvas); 1 critical gap remaining (audit silent failure — addressed in §10) |
| `/plan-design-review` | CLEAR | Score 4/10 → 8/10; 3 decisions locked (dark mode, auth pattern, loading default) |
| Outside voice (Claude subagent) | issues_found | 4 substantive reversals applied; rest captured in §13 TODOs |
| `/plan-ceo-review` | not run | Not flagged as needed by either review |

---

## 17. Definition of done for v1

- [ ] Pre-W1 spikes pass (sharp on Replit, polling load math)
- [ ] All workstreams W1–W9 complete
- [ ] All locked decisions in §4 implemented and documented in code comments where non-obvious
- [ ] All critical gaps in §10 addressed
- [ ] Tests in §9 written and passing
- [ ] CI smoke runs on PR (typecheck + build + migrate dry-run + tests)
- [ ] Dark mode QA pass on every starter component
- [ ] `DESIGN.md.template`, `HANDOVER.md.template`, `.env.example` all populated
- [ ] First fork attempt: scaffold a real project from the template, time the fork-to-first-deploy. Target <30 min. Record actual time and pain points → feeds v1.1
- [ ] `docs/decisions/0001-no-realtime.md` written (so the decision survives team turnover)

---

## 18. Definition of done for v1.1 (the second iteration)

After fork #1 ships, gather pain points and address:

- Whatever broke during fork #1
- Rate limiting (now that real users exist)
- Cost alerts
- Whatever the client asked for that the template didn't have

---

*This plan is the source of truth for v1. Edits: PR against this file with reasoning. Decisions in §4 are locked — reopening one requires explicit user approval and noting the reversal here.*
