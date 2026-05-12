# Plan: MLabs default identity — landing, auth polish, legal, design system

**Date:** 2026-05-13
**Slug:** mlabs-default-identity
**Status:** implemented
**Author:** Vinod (with /mlabs-plan)
**Review:** [.mstack/reviews/2026-05-13-mlabs-default-identity.md](../reviews/2026-05-13-mlabs-default-identity.md)
**Implementation:** [.mstack/implementations/2026-05-13-mlabs-default-identity/report.md](../implementations/2026-05-13-mlabs-default-identity/report.md)

---

## Problem

The Tianjin template currently ships with a near-empty landing page
(`apps/web/src/app/page.tsx` is 39 lines of centered brand name + two
buttons), a pure-grayscale token system, and auth screens that work
functionally but carry no brand identity. The mobile auth screens hardcode
`"Muscat"` (stale string from a prior fork) and the repo has no
`DESIGN.md`. There is no `/design` route to visually QA the token system,
and no branded `404` / `error` / `/privacy` / `/terms` pages.

A founder cloning the template right now sees a starter that *works* but
looks unfinished. They have to design the entire visual layer themselves
before they can show anyone — which defeats the "fork-to-first-deploy in
<30 min" promise from `PLAN.md`.

**Who benefits:** founders forking Tianjin, agencies setting up client
MVPs, and anyone evaluating the template at a glance. Success looks like:
a freshly cloned Tianjin renders a credible AI-product startup landing,
branded auth, branded legal stubs, and a `/design` page that lets the dev
verify the token system at a glance — all in the MLabs orange + light
default, all rebrandable by editing `packages/config/src/design.ts` and
`apps/web/src/config/brand.ts`.

## Scope

**In:**

- **Tokens & system**
  - Wire MLabs brand tokens into `packages/config/src/design.ts` (single
    source) and mirror in `apps/web/src/app/globals.css`.
  - Run `pnpm gen:mobile-tw` to regenerate `apps/mobile/tailwind.config.js`.
  - Author `DESIGN.md` at repo root: brand decisions, do/don't, dark-mode
    flip recipe, token rationale, links to the mockup.
  - Add `brand.taglineHighlight` field to `apps/web/src/config/brand.ts`
    so the hero can emphasise a substring in primary colour without
    hardcoding markup.
- **Web pages (`apps/web`)**
  - Replace `apps/web/src/app/page.tsx` with the v2 landing visual,
    rewritten for an AI-product startup voice. Hero H1 reads from
    `brand.tagline`; highlighted substring from `brand.taglineHighlight`.
    Sections: nav, hero, product mock, logo strip, 6-feature grid,
    testimonial, dark CTA band, footer.
  - Polish `apps/web/src/app/(auth)/layout.tsx` — keep the centered-card
    pattern (D2-locked) but add the MLabs orange-dot wordmark, looser
    spacing, brand-coloured primary CTA. Polish `login/page.tsx`,
    `signup/page.tsx`, `forgot-password/page.tsx`,
    `reset-password/page.tsx`, `verify-email/page.tsx` to match.
  - New `apps/web/src/app/privacy/page.tsx` and
    `apps/web/src/app/terms/page.tsx` — single legal-document layout
    component, placeholder content explicitly marked `<!-- TODO: client
    legal review -->` per section. Branded with the marketing layout
    wordmark + footer.
  - New `apps/web/src/app/(app)/design/page.tsx` — auth-gated style guide
    rendering palette, type scale, spacing scale, radii, button/input/
    card/badge variants, all sourced from `@mlabs/config` (so it stays
    in sync as tokens change).
  - New `apps/web/src/app/not-found.tsx` and
    `apps/web/src/app/error.tsx` (App Router conventions). Branded
    layout, primary-CTA back to `/`.
- **Mobile (`apps/mobile`)**
  - Polish `app/(auth)/login.tsx` and `app/(auth)/sign-up.tsx` to match
    the new web auth visual treatment (orange CTA, orange dot wordmark,
    same typographic scale). Replace hardcoded `"Muscat"` literals with
    a reference to a shared brand string. Also touch
    `forgot-password.tsx`, `reset-password.tsx`, `check-email.tsx`,
    `verify.tsx` for the same `"Muscat"` cleanup if found.
- **Process**
  - Light-only default this pass. `next-themes` stays installed; no
    toggle ships in marketing this pass.
  - Run `pnpm typecheck`, `pnpm lint`, `pnpm gen:mobile-tw:check`, and a
    local visual sanity-pass before each commit per `/mlabs-code`'s
    one-commit-per-task rule.

**Out (deferred):**

- Email templates rebrand (separate pass)
- Pricing page build-out (nav can still link; build-out deferred)
- Marketing-page theme toggle (light/dark switcher)
- Dashboard empty/loading-state visual refresh
- Dark mode default flip (kept as Phase 2; tokens preserved in
  `.mstack/mockups/landing-page/FEEDBACK.md`)
- `pnpm rename` script updates (no namespace change in this pass)

## Approach

**Chosen: Approach A — single bundled plan, task-ordered, tokens land
first.** One plan doc, one `/mlabs-review` pass, then `/mlabs-code`
implements as ordered tasks with one commit per task. The per-task commit
gate gives us token-regression safety without splitting into two plans.

The token shift is the load-bearing change. Once `packages/config/src/
design.ts` flips primary from `oklch(0.205 0 0)` (near-black) to
`oklch(0.69 0.18 39)` (≈`#FF6B2C` MLabs orange — OKLCH form for shadcn
parity), every existing screen using `bg-primary` / `text-primary` /
`ring-primary` re-themes automatically: dashboard, profile, messages,
admin, the unchanged auth screens. We land tokens first as a single
commit and the dev verifies visually before the next task starts.

For the landing, we keep the v2 mockup as the visual reference (see
`.mstack/mockups/landing-page/v2/index.html`) and rewrite the copy from
the agency-template voice into a generic AI-product startup voice — the
template ships as if it were a real AI-product startup's landing, so what
the founder sees out of the box demonstrates what a great startup landing
looks like. The hero H1 is driven by `brand.tagline` (with a substring
highlighted in primary via the new `brand.taglineHighlight` field), so
rebranding swaps the headline in one config edit.

For auth, decision D2 in `PLAN.md` locked the centered-card pattern. We
keep it. Polish is purely visual: brand orange-dot wordmark instead of
plain text, slightly more breathing room, primary-coloured CTA. The form
mechanics (`signIn.email`, `signUp.email`, error/success states) don't
change.

The `/design` route lives under `(app)` so it's auth-gated by the
existing auth-shell middleware — a maintenance surface, not a marketing
surface. It reads exclusively from `@mlabs/config` (no hardcoded values)
so it visually drifts the moment a token does — that's the point.

**Alternatives considered:**

- **Approach B (token-first plan, UI plan second)** — rejected because
  the token pass is small enough (one file edit + one mirror + one
  regen) that the per-task commit boundary in `/mlabs-code` already
  gives us the same "verify before continuing" gate without a second
  plan doc.
- **Approach C (per-surface lanes)** — rejected because tokens are the
  shared dependency. Web and mobile can't start until tokens land, so
  parallel lanes collapse to sequential anyway.

## Data model changes

None. No DB schema, no migrations, no env vars added or removed.

The only "schema" change is the `brand` config type:

```ts
// apps/web/src/config/brand.ts
export const brand = {
  name: "MLabs Template",
  tagline: "Ship MVPs in days, not months",
  taglineHighlight: "days",       // NEW: substring rendered in primary
  supportEmail: "support@example.com",
  socialHandle: "@mlabs",
  legalEntity: "Million Labs Ltd",
  url: "https://example.com",
} as const
```

## Files to touch

**New:**

- `DESIGN.md` (repo root) — token rationale, dark-flip recipe, do/don't
- `apps/web/src/app/not-found.tsx` — branded 404
- `apps/web/src/app/error.tsx` — branded error boundary (client component)
- `apps/web/src/app/privacy/page.tsx` — branded legal layout + TODO copy
- `apps/web/src/app/terms/page.tsx` — branded legal layout + TODO copy
- `apps/web/src/app/(app)/design/page.tsx` — auth-gated style guide
- `apps/web/src/components/marketing/marketing-nav.tsx` — landing nav
- `apps/web/src/components/marketing/marketing-footer.tsx` — landing footer
- `apps/web/src/components/marketing/hero.tsx` — hero section
- `apps/web/src/components/marketing/product-mock.tsx` — embedded mock
- `apps/web/src/components/marketing/logo-strip.tsx` — placeholder logos
- `apps/web/src/components/marketing/feature-grid.tsx` — 6-cell grid
- `apps/web/src/components/marketing/testimonial.tsx` — single card
- `apps/web/src/components/marketing/cta-band.tsx` — dark CTA section
- `apps/web/src/components/legal/legal-page.tsx` — shared legal layout
- `apps/web/src/components/design-system/*.tsx` — palette/type/spacing/
  radii/component-preview cells (one file per cell; small focused)
- Optionally: `apps/mobile/src/config/brand.ts` (or use `@mlabs/config`
  for `brand` if it's already shared) — needed to remove the `"Muscat"`
  literal; pick the simpler of (a) import from web's `@/config/brand`
  via package shim, (b) move `brand` into `packages/config`. **Open
  question** — see below.

**Edit:**

- `packages/config/src/design.ts` — flip `primary` (light + dark), adjust
  `border`/`muted` slightly to match mockup values; preserve dark set
  as-shipped per `FEEDBACK.md`.
- `apps/web/src/app/globals.css` — mirror the new values.
- `apps/web/src/app/page.tsx` — replace existing minimal landing with
  the new section composition (importing the new marketing components).
- `apps/web/src/app/(auth)/layout.tsx` — orange-dot wordmark, looser
  spacing.
- `apps/web/src/app/(auth)/login/page.tsx`,
  `apps/web/src/app/(auth)/signup/page.tsx`,
  `apps/web/src/app/(auth)/forgot-password/page.tsx`,
  `apps/web/src/app/(auth)/reset-password/page.tsx`,
  `apps/web/src/app/(auth)/verify-email/page.tsx` — visual polish only,
  no logic changes.
- `apps/web/src/config/brand.ts` — add `taglineHighlight`.
- `apps/mobile/app/(auth)/login.tsx`,
  `apps/mobile/app/(auth)/sign-up.tsx`,
  `apps/mobile/app/(auth)/check-email.tsx` (and any other auth screen
  with the stale `"Muscat"` literal) — replace literal with
  `brand.name`, apply visual treatment matching new web auth.
- `apps/mobile/tailwind.config.js` — regenerated via
  `pnpm gen:mobile-tw` (do NOT hand-edit; the gen script is the source).

## Edge cases

- **Token flip touches every existing screen.** Dashboard, profile,
  messages, admin currently render with grayscale primary. Once primary
  flips to orange, every `bg-primary` / hover-ring / focus-ring becomes
  orange. Most cases will look correct; some (e.g. a primary-coloured
  destructive button if any exists) may surprise. The
  `apps/web/src/app/_dev/states/page.tsx` dev preview should be sanity-
  checked after Task 1.
- **`gen:mobile-tw:check` CI gate.** If we forget to regenerate after
  editing `packages/config/src/design.ts`, CI fails. `/mlabs-code` must
  run `pnpm gen:mobile-tw` as part of the token task and commit the
  regenerated file in the same commit.
- **OKLCH ≈ #FF6B2C conversion.** sRGB hex doesn't translate one-to-one
  to OKLCH. The shadcn `primary` slot uses OKLCH for in-gamut wide-color
  display correctness. Approximate target:
  `oklch(0.69 0.18 39)` — must be eyeball-verified against the mockup,
  not just numerically converted.
- **Brand-string ESLint rule.** PLAN.md §3 hard rule: no string literal
  of `brand.name` outside `config/brand.ts` (allowlist:
  `config/`, `templates/`, `legal/`). Landing-page copy must reference
  `{brand.name}` instead of "MLabs Template". Legal pages are in the
  allowlist; ESLint won't block placeholder copy there.
- **Logo strip and testimonial.** Both contain placeholder content that
  must not look like a fake customer claim before shipping. Wrap each
  in a `data-placeholder="true"` attribute and add a `// TODO:` line
  comment so dev / QA finds them.
- **Mobile brand-string fix.** If `apps/mobile/` doesn't yet have its
  own `brand` import path (it might be using literal strings because
  `@mlabs/config` doesn't export `brand`), we need to decide whether to
  (a) add a `brand.ts` to `packages/config` and re-export, or
  (b) duplicate a thin `apps/mobile/src/config/brand.ts`. Option (a) is
  cleaner. Flagged in Open Questions.
- **`/design` route auth gate.** Putting it under `(app)/` auto-applies
  the auth middleware. If a logged-out dev clones the template and runs
  it, `/design` will redirect to `/login`. That's fine — log in once and
  it's accessible. Don't move it back to public.
- **`error.tsx` must be a client component.** Next.js App Router
  requires `"use client"` on error boundaries. Don't forget the
  directive — silent failure mode.
- **Theme toggle absence.** `next-themes` is installed for D1 but no
  toggle ships in marketing this pass. That's intentional. If a dev
  flips `class="dark"` on `<html>`, the dark tokens are still wired and
  the page should render correctly — verify this once during QA.

## Acceptance criteria

- [ ] Cloning fresh + `pnpm install && pnpm dev` shows the new MLabs-
      branded landing at `/` (no orange-on-grayscale half-broken state)
- [ ] `packages/config/src/design.ts` `primary` is the MLabs orange in
      both light and dark token sets
- [ ] `apps/web/src/app/globals.css` mirrors the same values exactly
- [ ] `pnpm gen:mobile-tw:check` passes (mobile tw is in sync)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all pass
- [ ] `DESIGN.md` exists at repo root, includes token table, dark-flip
      recipe, do/don't, mockup reference
- [ ] `brand.ts` exposes `taglineHighlight`; landing hero highlights it
- [ ] `/login`, `/signup`, `/forgot-password`, `/reset-password`,
      `/verify-email` all render with the new wordmark + primary CTA
- [ ] `/privacy` and `/terms` render with branded layout, placeholder
      copy explicitly TODO-marked
- [ ] `/design` (auth-gated) renders palette, type scale, spacing scale,
      radii, button + input + card + badge variants, all live from
      `@mlabs/config`
- [ ] `not-found.tsx` and `error.tsx` render branded; back-to-home CTA
      works
- [ ] Mobile `/login` and `/sign-up` render with the new visual; no
      `"Muscat"` string anywhere in `apps/mobile/`
- [ ] `grep -rn "Muscat" apps/mobile/` returns zero results
- [ ] No new top-level dependencies added (boring-deps rule)
- [ ] Logo strip + testimonial each carry a TODO marker so they can be
      found before going live

## Open questions

For `/mlabs-review` to resolve before `/mlabs-code` starts:

1. **Mobile `brand` import path.** Cleanest: move `brand` into
   `packages/config/src/brand.ts` (alongside `design.ts`) and re-export
   from `@mlabs/config`. Web then imports from `@mlabs/config` instead
   of `@/config/brand`. Mobile imports from the same package. **OR**
   leave web's `apps/web/src/config/brand.ts` as the source and add a
   thin mobile `brand.ts` that imports it — but that crosses an app
   boundary which we generally don't do. **Recommend the package move.**
2. **OKLCH primary value.** Eyeball-confirm `oklch(0.69 0.18 39)` against
   the mockup screenshot before committing. If it reads off-hue, adjust
   chroma/hue and re-verify.
3. **Hero "highlight" implementation.** Naive `String.split(highlight)`
   is fragile if the highlight occurs more than once or with different
   casing. Should the highlight be a tuple `[before, highlight, after]`
   instead, or a regex? **Recommend** keeping it a plain substring with
   case-sensitive first-match split — overkill is a smell; if a fork
   needs more they can override the hero component.
4. **`/design` route — visible in nav, or stays hidden behind URL?**
   Recommend hidden (no nav link); devs find it via DESIGN.md doc.
5. **Marketing copy.** Generic AI-product framing — confirmed direction,
   but draft copy will be reviewed when `/mlabs-code` runs. Reviewer
   should flag if any line reads "agency template" voice rather than
   "fictional AI startup" voice.
6. **`@mlabs/ui-web` button variants.** Mockup uses an "outlined-on-
   light → fills-dark on hover" ghost button. If shadcn's `outline`
   variant doesn't match, do we add a `marketing-ghost` variant or
   inline the styles? **Recommend** add to the shadcn `Button`
   `variants` — single source of truth.
7. **DESIGN.md scope.** Repo root vs `docs/DESIGN.md`. PLAN.md §13
   already lists `DESIGN.md.template` as a v1 TODO. **Recommend repo
   root** so it shows up in GitHub previews.

## Task ordering (suggested for `/mlabs-review` to formalise)

1. **Tokens & DESIGN.md** — packages/config + globals.css + gen:mobile-tw
   + DESIGN.md + brand.taglineHighlight field. One commit. **Visual
   gate**: run the app, sanity-check existing screens, then proceed.
2. **Move `brand` to `@mlabs/config`** (if Open Q1 lands that way).
3. **Marketing components** — `marketing-nav`, `hero`, `product-mock`,
   `logo-strip`, `feature-grid`, `testimonial`, `cta-band`,
   `marketing-footer`. One commit each, or grouped logically.
4. **Landing page** — replace `apps/web/src/app/page.tsx`.
5. **Web auth polish** — `(auth)/layout.tsx` + each auth page.
6. **Legal pages** — shared `legal-page` component + `/privacy` +
   `/terms`.
7. **`/design` route** — auth-gated under `(app)/design/`.
8. **404 + error pages** — `not-found.tsx` + `error.tsx`.
9. **Mobile auth polish + `"Muscat"` strip** — `login.tsx`,
   `sign-up.tsx`, and any other auth screen with the stale string.

## References

- `.mstack/mockups/landing-page/v2/index.html` — visual reference
- `.mstack/mockups/landing-page/FEEDBACK.md` — locked tokens + decisions
- `PLAN.md` §3 (hard rules), §4 (D1 dark mode, D2 auth pattern, §6
  design.ts shape), §13 (DESIGN.md TODO)
- `CLAUDE.md` (mstack workflow, hard rules)
- `README.md` (rebrand recipe — must stay accurate)
