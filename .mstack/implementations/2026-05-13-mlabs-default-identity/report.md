# Implementation report — MLabs default identity

**Status:** complete
**Date:** 2026-05-13
**Plan:** [.mstack/plans/2026-05-13-mlabs-default-identity.md](../../plans/2026-05-13-mlabs-default-identity.md)
**Review:** [.mstack/reviews/2026-05-13-mlabs-default-identity.md](../../reviews/2026-05-13-mlabs-default-identity.md)
**Branch:** `chore/monorepo-migration`
**Commits:** 11 total (1 prep + 10 task)

---

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| — | Prep: commit WIP + planning artifacts | ✓ | `2ac8ddd4` |
| 1 | Wire MLabs brand tokens + regen mobile TW | ✓ | `16603ca1` |
| 2 | Author DESIGN.md | ✓ | `f7a4e641` |
| 3 | Move brand to @mlabs/config + ESLint + mobile dep | ✓ | `d8e37fa6` |
| 4 | Marketing section components | ✓ | `c54334d1` |
| 5 | Replace landing page | ✓ | `6c14d8f4` |
| 6 | Web auth visual polish | ✓ | `49b314e6` |
| 7 | Legal pages (privacy + terms) | ✓ | `944caa79` |
| 8 | `/design` live style guide | ✓ | `ab4e75ef` |
| 9 | 404 + error boundary | ✓ | `09d1747c` |
| 10 | Mobile auth polish + Muscat strip | ✓ | `86ba3edf` |

All 10 tasks landed. No tasks skipped. No tasks aborted. One mid-task
adjustment in Task 1 (contrast pass — see notes below).

---

## Notable mid-flight decisions

- **Task 1 contrast.** First token flip set `border` and `input` to
  `oklch(0.78 0.005 75)` and `ring` to brand `oklch(0.69 0.18 39)`, all
  of which failed the 3:1 visibility bar against white. Darkened to
  `oklch(0.62 0.005 80)` and `oklch(0.62 0.19 39)` respectively. The
  border ended up slightly heavier than the v2 mockup's `#E6E4DF` —
  acceptable tradeoff since the mockup's HTML compensated for the light
  border with stronger drop shadows we don't carry into the React app.
- **Primary-foreground**. White on `#FF6B2C` fails AA (~3.4:1); dark ink
  on `#FF6B2C` passes (~6:1). Followed v1 mockup's choice (dark text on
  orange) over v2's choice (white text on orange — an accessibility
  oversight in the mockup).
- **Hero "highlight" implementation**. Plain first-match
  `String.split`. If `taglineHighlight` doesn't appear in `tagline` (or
  is empty), the hero renders the tagline as plain text. Covered in a
  `<Tagline>` helper component.
- **Mobile `app.config.ts` placeholders left in place**. The "Muscat" /
  "muscat" strings there are deliberate bundle-identifier / deep-link-
  host placeholders documented in the file itself and handled by
  `pnpm rename`. Sweeping them out of scope per the review.

---

## What changed (high level)

- **Tokens flipped to MLabs orange + light default** in
  `packages/config/src/design.ts` and mirrored in `globals.css`. Dark
  variant refreshed to the navy palette so Phase 2 is purely a toggle
  flip, not a token change. Mobile Tailwind regen is in the same commit
  as the token change.
- **Brand strings centralised** under `@mlabs/config`. 8 web files +
  6 mobile auth screens now import from one location.
- **Landing page is real**. Eight section components (nav, hero,
  product mock, logo strip, feature grid, testimonial, CTA band,
  footer) compose into a credible AI-product startup landing. Hero
  H1 is driven by `brand.tagline` + `brand.taglineHighlight`.
- **Auth screens look like one product**. Web `/(auth)/` layout and
  6 mobile auth screens both carry the orange-dot wordmark + the same
  typographic scale.
- **Legal scaffolding shipped**. `/privacy` and `/terms` with TODO-
  marked sections so legal review is a fill-in pass, not a from-scratch
  pass.
- **`/design`** is a live, auth-gated style guide that drifts when
  tokens drift. The page IS its own contract test for the design layer.
- **404 + error boundary branded**. Both surfaces use the same wordmark
  + radial-glow language as the auth layout.

---

## Known placeholders (must be addressed pre-launch)

These are intentional. Each is marked in code with
`data-placeholder="true"` or a `{/* TODO ... */}` comment so
pre-launch QA can find them.

- **Logo strip** — 6 text "logos" (Northwind, Acme.co, Lumen, etc.)
- **Testimonial** — anonymised "Head of platform, anonymised customer"
- **Privacy + Terms** — every section carries
  `{/* TODO: client legal review */}` markers
- **brand.taglineHighlight** — set to `"days"` for the MLabs default
  tagline. Forks setting their own tagline should set their own
  highlight too (or leave empty to skip highlighting)
- **brand.url** = `https://example.com`, `brand.supportEmail` =
  `support@example.com` — sentinel values; forks replace

---

## Verification snapshot

Per-task: `pnpm typecheck`, `pnpm lint`, and `pnpm check-contrast` ran
clean on every commit. Pre-commit hook also ran `check-mobile-tailwind`
on the Task 1 commit (in sync) and `check-contrast` on every commit
(28/28 pairs pass).

E2E (`pnpm test:e2e` / Playwright) was NOT run — that's `/mlabs-qa`'s
job per the skill contract. `home.spec.ts` was updated to assert
against the new structure; it's expected to pass under QA but hasn't
been executed in this run.

---

## Follow-ups (not part of this pass)

From the review's "Follow-ups" section, plus discoveries from this run:

- **Phase 2: dark default toggle.** Tokens already wired; only the
  toggle UI ships. Recipe in DESIGN.md.
- **Email templates rebrand.** Out of scope this pass.
- **Pricing page build-out.** Nav links to `#features` / etc. for now.
- **Logo strip + testimonial replacement.** Real partners or remove
  before launch.
- **Doc-sync.** Cross-check HANDOVER.md.template, AGENTS.md, the
  forking guide for stale `@/config/brand` references missed by Task 3.
- **Mobile metro resolver verification.** `@mlabs/config` resolved at
  typecheck time, but a live Metro bundle should be run via
  `pnpm --filter @mlabs/mobile start` to confirm the workspace package
  resolves at runtime under Hermes.

---

## Recommended next step

**`/mlabs-qa`** with focus on:

1. The new landing page rendering end-to-end at `/`
2. Web auth flow (signup → verify → login) under the new visual
3. Mobile auth flow under the new visual (orange dot wordmark, brand
   name, light surface)
4. `/design` route renders correctly while signed in
5. `/privacy`, `/terms` render with marketing chrome
6. 404 and a deliberate-throw both render branded fallbacks

Light-only default this pass; dark-mode QA is deferred until Phase 2.
