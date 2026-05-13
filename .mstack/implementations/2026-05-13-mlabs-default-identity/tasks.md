# Implementation: MLabs default identity

**Started:** 2026-05-13 (session)
**Completed:** 2026-05-13 (session)
**Review:** [2026-05-13-mlabs-default-identity](../../reviews/2026-05-13-mlabs-default-identity.md)
**Branch:** chore/monorepo-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Pre-commit

- [x] **Prep:** commit pre-existing WIP + planning artifacts · Commit: `2ac8ddd4`

## Tasks

- [x] **Task 1:** Wire MLabs brand tokens + regen mobile Tailwind · `16603ca1`
  - 28/28 WCAG pairs pass. Mid-flight: had to darken border/input and ring
    so they meet 3:1 against the new lighter surface — primary still reads
    as MLabs orange. Visual gate confirmed by user (orange renders on `/`,
    `/login`).

- [x] **Task 2:** Author DESIGN.md · `f7a4e641`
  - Repo-root design-system doc: token tables, rebrand recipe, dark-flip
    Phase 2 recipe, do/don't, mockup pointers.

- [x] **Task 3:** Move brand to @mlabs/config · `d8e37fa6`
  - 16 files changed. New `taglineHighlight: "days"` field. ESLint rule
    candidate list updated and verified against a deliberate violation.
    8 web imports (6 src + 3 tests/e2e) updated to `@mlabs/config`.
    Mobile gained `@mlabs/config` workspace dep.

- [x] **Task 4:** Marketing section components · `c54334d1`
  - 9 new files (8 sections + 1 `Tagline` helper). All server components,
    no hex literals, brand strings via `{brand.name}` interpolation.

- [x] **Task 5:** Replace landing page · `6c14d8f4`
  - `apps/web/src/app/page.tsx` rewritten to compose marketing components.
    Updated `e2e/home.spec.ts` assertions for the new structure.

- [x] **Task 6:** Web auth visual polish · `49b314e6`
  - `(auth)/layout.tsx` now shows orange-dot + brand.name wordmark with
    soft radial glow. Headlines across 5 auth pages bumped from `text-xl
    font-semibold` to `text-2xl font-bold tracking-tight`.

- [x] **Task 7:** Legal pages · `944caa79`
  - `legal-page.tsx` shared layout. `/privacy` (6 sections) and `/terms`
    (8 sections), every section TODO-marked for client legal review.

- [x] **Task 8:** `/design` live style guide · `ab4e75ef`
  - Auth-gated under `(app)/design/`. Renders brand wordmark, light +
    dark palettes, type scale, radii, motion, all 6 button variants,
    input states, surfaces — every value live from `@mlabs/config`.

- [x] **Task 9:** 404 + error boundary · `09d1747c`
  - `not-found.tsx` (server) and `error.tsx` (client per App Router
    convention) with primary CTA back to `/` and surface for `error.digest`.

- [x] **Task 10:** Mobile auth polish + Muscat strip · `86ba3edf`
  - 6 mobile auth screens: `Muscat` literal → `{brand.name}` from
    `@mlabs/config`. Wordmark visual parity with web (orange dot +
    extrabold tracking-tight). `grep -rn Muscat apps/mobile/app/` returns
    zero matches. `app.config.ts` placeholders intentionally untouched.
