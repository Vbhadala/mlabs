# Review: MLabs default identity — landing, auth polish, legal, design system

**Date:** 2026-05-13
**Slug:** mlabs-default-identity
**Plan reviewed:** [2026-05-13-mlabs-default-identity.md](../plans/2026-05-13-mlabs-default-identity.md)
**Status:** approved
**Reviewer:** Vinod (with /mlabs-review)

---

## Summary

Plan is sound and ready to implement after three structural fixes captured below.
The biggest correction is to **brand-package architecture**: `brand` must move
out of `apps/web/src/config/` and into `packages/config/` so mobile can stop
hardcoding `"Muscat"`. The plan's "Muscat fix" also expands from 2 mobile files
to 6 once we actually grep. `@mlabs/mobile` doesn't currently depend on
`@mlabs/config`, so the move requires a workspace-dep addition too. Everything
else from the plan stands: tokens land first as Task 1 with a required visual
gate; landing, auth polish, legal, `/design`, 404, and mobile auth follow.

---

## Findings

### Blockers (fixed before /mlabs-code)

- **`@mlabs/mobile` is missing the `@mlabs/config` workspace dependency.** The
  package only depends on `@mlabs/validators` today. The mobile auth polish
  task cannot import `brand` until this dep is added in the same commit that
  moves `brand` to `packages/config`. **Decision:** add
  `"@mlabs/config": "workspace:*"` to `apps/mobile/package.json` as part of
  Task 3.

- **ESLint `no-brand-string-literal` rule's path resolution.** The rule reads
  `brand.name` from `src/config/brand.ts` or `apps/web/src/config/brand.ts`
  (hardcoded candidate list). After moving `brand`, the candidate list must
  include `packages/config/src/brand.ts` or the rule silently no-ops (returns
  early when `brandName === ""`). **Decision:** add the new path to the
  candidates list in
  `tooling/eslint-config/src/rules/no-brand-string-literal.mjs` as part of
  Task 3.

### Concerns (raised, decided, recorded)

- **Concern:** Plan said "Mobile login.tsx and sign-up.tsx have hardcoded
  Muscat — fix in scope." Reality: 7 files in `apps/mobile/` contain `Muscat`.
  Six are auth UI strings (cleanly fixable). One is `apps/mobile/app.config.ts`
  — bundle identifiers, deep-link host, scheme, photo-permission copy —
  carrying a documented placeholder comment ("Forks replace it with their
  real bundle/package via the Phase 6 `new-project` skill").
  **Decision:** scope mobile string fix to the 6 auth screens only.
  `app.config.ts` is intentional placeholder + lives outside the brand-string
  ESLint rule's allowlist; leave it for `pnpm rename` / FORK_CHECKLIST.

- **Concern:** Plan assumed `@mlabs/ui-web/button` might need a new
  `marketing-ghost` variant. Reading the file, the existing `outline` variant
  is close enough to the mockup's ghost button.
  **Decision:** use the existing `outline` variant. Don't fragment the design
  system for a marketing-only treatment. If QA in `/mlabs-code` reveals it
  doesn't match the mockup, pause and revisit.

- **Concern:** Plan's hero highlight implementation was vague — naive
  `String.split(highlight)` may double-split if the highlight appears twice.
  **Decision:** first-match split is fine. Tagline copy is owner-controlled
  via `brand.ts`, so duplicate occurrence is a copy bug to fix at config
  time, not a rendering bug to guard against.

- **Concern:** PLAN.md decision D1 locks dark mode default via `next-themes`.
  This pass ships light-only default with no toggle, which diverges.
  **Decision:** explicit reversal. **D1 reversed: light-only default; dark
  tokens retained in `packages/config/src/design.ts` and validated in this
  pass so Phase 2 only needs to expose the toggle.** Recorded below.

- **Concern:** Web has 6 imports of `@/config/brand`. Once `brand` moves to
  `packages/config`, do we keep the alias working (re-export shim) or
  update all 6 imports?
  **Decision:** update all 6 imports to `@mlabs/config`. The shim approach
  hides the dependency direction and confuses future readers. The 6 files
  are listed in Task 3.

### Suggestions (taken)

- Token flip will touch *every* existing screen — make the visual sanity
  gate after Task 1 mandatory, not optional. **Taken**: Task 1 acceptance
  now includes the four-screen screenshot check.
- DESIGN.md must include a concrete "how to flip default to dark" recipe so
  Phase 2 is a doc lookup, not a code-archaeology pass. **Taken**: in Task
  2 scope.
- The dark token set was going to be left untouched. Better to update dark
  primary/background to mockup v1 values now (since we're already inside
  `design.ts`) so Phase 2 is purely UI work. **Taken**: Task 1 includes
  both light and dark refresh.

### Suggestions (deferred)

- Add an ESLint rule that prevents stale prior-fork strings in
  `apps/mobile/` (e.g. forbids the literal `"Muscat"`). **Deferred** — too
  niche; the brand-string rule already catches `brand.name` violations,
  and `pnpm rename` handles bundle-level placeholders.
- Pricing page stub. **Deferred** — explicitly out of scope this pass.
- Update README's rebrand recipe to reflect the new brand path. **Deferred
  to a doc-sync pass** post-implementation; the README already points at
  `packages/config/src/design.ts` for design and `apps/web/src/config/
  brand.ts` for brand. The brand reference needs a one-line update — small
  enough to roll into Task 3.
- **Taken as Task 3 sub-step**: update README rebrand recipe.

---

## Decisions locked

Net new decisions made during review (beyond the plan):

1. **Brand moves to `packages/config/src/brand.ts`**; re-exported from
   `@mlabs/config`. All 6 web imports of `@/config/brand` update to
   `@mlabs/config`. ESLint rule path-resolution updated. `apps/mobile/
   package.json` gains `@mlabs/config` workspace dep.
2. **D1 reversed**: light-only default this pass; dark tokens retained
   so Phase 2 can expose the toggle without further token work. Recorded
   in DESIGN.md.
3. **Both light AND dark token sets refreshed in Task 1** (orange primary
   shared; dark background = navy `#0A0F1C` per mockup v1).
4. **Mobile `Muscat` cleanup scoped to 6 auth screens.** `app.config.ts`
   is deliberate placeholder, out of scope.
5. **Existing `@mlabs/ui-web/button` `outline` variant** used for the
   marketing ghost button. No new variant added.
6. **Visual sanity gate after Task 1 is mandatory**: screenshot `/`,
   `/_dev/states`, `/login`, and any authed `(app)` page (e.g. `/profile`)
   before Task 2 starts. If anything looks wrong, pause.
7. **Hero highlight implementation**: first-match `String.split` with the
   matched substring rendered inside a `<span className="text-primary">`.
8. **`/design` route** lives at `apps/web/src/app/(app)/design/page.tsx`,
   auth-gated by route group, no nav link.
9. **DESIGN.md** at repo root.

---

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. One commit per task.

### Task 1: Wire MLabs brand tokens + regen mobile Tailwind

- **Files:**
  - `packages/config/src/design.ts` (edit) — flip `primary` to MLabs orange
    in OKLCH (target ≈ `oklch(0.69 0.18 39)`, eyeball-verify against mockup),
    in both `light` and `dark` sets. Refresh `dark.background` to navy
    (`oklch(0.18 0.02 260)` ≈ `#0A0F1C`), `dark.card` and `dark.muted`
    accordingly per FEEDBACK.md. Light set: only `primary`, `border`
    (slightly warmer), and `muted` move; everything else stays.
  - `apps/web/src/app/globals.css` (edit) — mirror the new OKLCH values
    in `:root` and `.dark` blocks. Keep all variable names identical.
  - `apps/mobile/tailwind.config.js` (edit, **via `pnpm gen:mobile-tw`** —
    do NOT hand-edit; the gen script is the source).
- **What:** Replace the grayscale primary with MLabs orange. Refresh dark
  background to navy so Phase 2's "flip to dark default" is purely UI.
  Regenerate mobile Tailwind from the new packages/config values and
  commit the regenerated file in the same commit.
- **Acceptance:**
  - [ ] `pnpm typecheck`, `pnpm lint`, `pnpm gen:mobile-tw:check` all pass
  - [ ] `pnpm dev` boots; visit `/`, `/_dev/states`, `/login`, and one
        authed page (e.g. `/profile` after signing in) — all four render
        cleanly with orange primary; no broken contrast
  - [ ] Screenshot the four pages and confirm visually before continuing
  - [ ] Mobile Tailwind regen file committed in the same commit
- **Pause if:**
  - The OKLCH conversion of `#FF6B2C` doesn't read like the mockup orange
    (too pink, too brown). Adjust chroma/hue and re-eyeball.
  - Any existing screen looks visually broken (contrast, illegible text,
    unexpected destructive-orange overlap).
  - `gen:mobile-tw:check` fails after running `gen:mobile-tw` (indicates
    a deeper sync issue — investigate before continuing).

### Task 2: Author DESIGN.md

- **Files:**
  - `DESIGN.md` (new, repo root)
- **What:** Human-readable source of truth. Sections: brand identity
  (one-line + screenshot reference), token table (light + dark with
  hex equivalents), how to rebrand for a fork (3 steps, links to the
  files), dark-mode flip recipe (one paragraph + the lines to change
  in `globals.css`), do/don't (don't hardcode brand strings; don't
  hand-edit `apps/mobile/tailwind.config.js`), pointer to
  `.mstack/mockups/landing-page/` for visual reference, pointer to
  `.mstack/mockups/landing-page/FEEDBACK.md` for decision history.
- **Acceptance:**
  - [ ] DESIGN.md exists at repo root
  - [ ] Token table shows both light and dark sets
  - [ ] Dark-flip recipe is copy-pasteable

### Task 3: Move `brand` to `@mlabs/config` + update ESLint rule + add mobile dep

- **Files:**
  - `packages/config/src/brand.ts` (new) — actual brand config plus the
    new `taglineHighlight: "days"` field
  - `packages/config/src/index.ts` (edit) — add `export { brand } from
    "./brand"; export type { Brand } from "./brand"`
  - `apps/web/src/config/brand.ts` (delete)
  - `apps/web/src/app/page.tsx`, `apps/web/src/lib/email/templates.ts`,
    `apps/web/src/config/seo.ts`, `apps/web/src/app/admin/layout.tsx`,
    `apps/web/src/app/(auth)/layout.tsx`,
    `apps/web/src/app/(app)/layout.tsx` (edit) — replace
    `from "@/config/brand"` with `from "@mlabs/config"`
  - `apps/mobile/package.json` (edit) — add `"@mlabs/config":
    "workspace:*"` to `dependencies`
  - `tooling/eslint-config/src/rules/no-brand-string-literal.mjs`
    (edit) — add `path.join(cwd, "packages/config/src/brand.ts")` to the
    `candidates` list
  - `README.md` (edit) — single line in §Rebrand: `apps/web/src/config/
    brand.ts` → `packages/config/src/brand.ts`
- **What:** Single commit that moves the canonical brand source so mobile
  can import it. Adds `taglineHighlight` for the landing hero. Updates the
  ESLint rule path-resolution so it keeps finding `brand.name`. Adds the
  workspace dep on mobile.
- **Acceptance:**
  - [ ] `grep -rn 'from ["'"'"']@/config/brand["'"'"']' apps/web/src/`
        returns zero matches
  - [ ] `apps/web/src/config/brand.ts` no longer exists
  - [ ] `packages/config/src/brand.ts` exists with `taglineHighlight`
  - [ ] `pnpm install` succeeds (workspace dep resolves)
  - [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass
  - [ ] ESLint rule still flags violations: introduce a deliberate
        `"MLabs Template"` literal in a test file and confirm it errors,
        then revert
- **Pause if:**
  - Workspace install fails after adding the dep — likely a peer-dep or
    React-version conflict in the monorepo (known gotcha from the
    migration). Investigate before continuing.
  - Any web import update introduces a TS or lint error that isn't a
    trivial path fix.

### Task 4: Marketing section components

- **Files (all new under `apps/web/src/components/marketing/`):**
  - `marketing-nav.tsx` — wordmark (orange dot + `{brand.name}`),
    uppercase link list, primary CTA button
  - `hero.tsx` — pill, H1 from `brand.tagline` with
    `brand.taglineHighlight` wrapped in `<span className="text-primary">`,
    subhead, dual CTA, trust row
  - `product-mock.tsx` — embedded dashboard preview, decorative, static
  - `logo-strip.tsx` — six text-styled placeholder "logos", each carries
    `data-placeholder="true"` and a `{/* TODO: replace before launch */}`
    comment
  - `feature-grid.tsx` — six cells, icon + heading + body; copy framed
    as a generic AI-product startup (e.g. "AI assistant that learns your
    team's voice", not "type-safe end-to-end")
  - `testimonial.tsx` — single card; `data-placeholder="true"` and a
    `{/* TODO: replace with a real quote before launch */}` comment
  - `cta-band.tsx` — dark `#0A0F1C` band with orange radial bloom; uses
    `bg-foreground text-background` so it inverts cleanly under both
    light and dark token sets
  - `marketing-footer.tsx` — wordmark, 4 columns, legal row pulling from
    `brand.legalEntity`
- **What:** Build each section as an isolated server component (no
  `"use client"` unless absolutely required — only the CTA nav links
  need it if any). All copy lives inline in the component for now; a
  later pass can hoist to config.
- **Acceptance:**
  - [ ] Each component renders standalone without props or with minimal
        props
  - [ ] No string literal of `brand.name` outside the component —
        always `{brand.name}` interpolation
  - [ ] `pnpm typecheck`, `pnpm lint` pass

### Task 5: Replace landing page

- **Files:**
  - `apps/web/src/app/page.tsx` (edit, full replace) — server component
    that composes marketing components in order: nav, hero, product-mock,
    logo-strip, feature-grid, testimonial, cta-band, footer.
    Keep the existing `getSession()` check so signed-in visitors see a
    "Go to dashboard" CTA in the nav instead of "Sign in / Get started".
  - `apps/web/e2e/home.spec.ts` (edit) — update any selectors that
    asserted against the old minimal landing
- **What:** Wire the marketing components into the `/` route. Don't add
  a marketing route group — keep `/` at the app root.
- **Acceptance:**
  - [ ] `pnpm dev` shows the full landing at `http://localhost:3000/`
  - [ ] Signed-out: nav shows "Sign in" + "Get started"; signed-in: nav
        shows the dashboard CTA
  - [ ] `pnpm test` and any e2e suite pass
- **Pause if:**
  - Existing e2e assertions in `home.spec.ts` would need rewriting from
    scratch — confirm with reviewer rather than guess.

### Task 6: Web auth visual polish

- **Files:**
  - `apps/web/src/app/(auth)/layout.tsx` (edit) — replace the stacked
    `legalEntity / name` wordmark with an orange-dot + `{brand.name}`
    wordmark, increase top spacing, widen card slightly (max-w-md)
  - `apps/web/src/app/(auth)/login/page.tsx` (edit)
  - `apps/web/src/app/(auth)/signup/page.tsx` (edit)
  - `apps/web/src/app/(auth)/forgot-password/page.tsx` (edit)
  - `apps/web/src/app/(auth)/reset-password/page.tsx` (edit)
  - `apps/web/src/app/(auth)/verify-email/page.tsx` (edit)
- **What:** Visual polish only — typography weight + spacing + small
  copy nudges. No form logic, no auth flow changes. The shadcn `Button`
  already pulls from primary, so the orange CTA appears automatically
  after Task 1.
- **Acceptance:**
  - [ ] All five auth pages render with the new wordmark + orange CTA
  - [ ] Form submission still works on all five (manual smoke)
  - [ ] `pnpm typecheck`, `pnpm lint` pass

### Task 7: Legal pages

- **Files:**
  - `apps/web/src/components/legal/legal-page.tsx` (new) — shared
    `<LegalPage title lastUpdated>{children}</LegalPage>` layout
    component. Renders marketing nav + footer wrapping a long-form prose
    container (`max-w-3xl`, `prose` styling).
  - `apps/web/src/app/privacy/page.tsx` (new) — placeholder content with
    explicit `{/* TODO: client legal review */}` markers per section
  - `apps/web/src/app/terms/page.tsx` (new) — same pattern
- **What:** Ship the legal scaffolding so clients have a starting point.
  `legal/` is in the ESLint allowlist so placeholder copy can mention
  the brand verbatim if needed.
- **Acceptance:**
  - [ ] `/privacy` and `/terms` render with marketing nav + footer + the
        prose-styled body
  - [ ] Each section header carries the `TODO` marker
  - [ ] `pnpm typecheck`, `pnpm lint` pass

### Task 8: `/design` route — live style guide

- **Files:**
  - `apps/web/src/app/(app)/design/page.tsx` (new) — auth-gated by route
    group. Imports `design` from `@mlabs/config` and renders palette
    swatches, type scale, spacing scale, radii samples, plus a row of
    `Button` variants (default, outline, secondary, ghost, destructive,
    link), `Input` states (default, error, disabled), `Card` example, and
    `Badge` variants.
  - Optionally: `apps/web/src/components/design-system/*.tsx` if the
    page grows beyond ~300 lines — split into `palette.tsx`,
    `typography.tsx`, etc.
- **What:** Live style guide that reads exclusively from `@mlabs/config`,
  so the moment a token changes the page visually drifts. No hardcoded
  hex anywhere. No nav link — devs find it via DESIGN.md.
- **Acceptance:**
  - [ ] Visiting `/design` while signed in renders palette + type +
        spacing + radii + 4 component groups
  - [ ] Visiting `/design` signed out redirects to `/login` (proves
        the auth gate)
  - [ ] `pnpm typecheck`, `pnpm lint` pass

### Task 9: 404 + error boundary

- **Files:**
  - `apps/web/src/app/not-found.tsx` (new) — server component, branded
    layout, "Page not found", primary CTA back to `/`
  - `apps/web/src/app/error.tsx` (new) — **client component** (`"use
    client"` directive required by Next.js App Router error
    convention). Accepts `{ error, reset }`. Shows branded layout
    + retry button + back-to-home CTA. Optionally `console.error(error)`
    for dev visibility.
- **What:** Branded fallback surfaces for unknown routes and unhandled
  exceptions.
- **Acceptance:**
  - [ ] `curl http://localhost:3000/this-does-not-exist` shows the
        branded 404
  - [ ] Deliberately throw in a page and confirm `error.tsx` renders
        (then revert)
  - [ ] `pnpm typecheck`, `pnpm lint` pass
- **Pause if:**
  - The `error.tsx` doesn't render under Next 16's error-boundary
    convention — confirm the route conventions in `node_modules/next/
    dist/docs/` before diverging.

### Task 10: Mobile auth visual polish + `Muscat` strip

- **Files (all edits):**
  - `apps/mobile/app/(auth)/login.tsx`
  - `apps/mobile/app/(auth)/sign-up.tsx`
  - `apps/mobile/app/(auth)/forgot-password.tsx`
  - `apps/mobile/app/(auth)/reset-password.tsx`
  - `apps/mobile/app/(auth)/verify.tsx`
  - `apps/mobile/app/(auth)/check-email.tsx`
- **What:** Replace the hardcoded `"Muscat"` `<Text>` literal in each
  file with `{brand.name}` imported from `@mlabs/config`. Apply visual
  polish to match new web auth visual: orange dot before the wordmark,
  same headline weight, same vertical rhythm. Button + Input components
  pull from NativeWind classes generated from `packages/config`, so the
  orange CTA appears automatically after Task 1.
- **Acceptance:**
  - [ ] `grep -rn 'Muscat' apps/mobile/app/` returns zero matches
  - [ ] `pnpm --filter @mlabs/mobile typecheck && pnpm --filter
        @mlabs/mobile lint` pass
  - [ ] Mobile auth screens visually match the web auth treatment when
        run in Expo Go (or simulator)
- **Pause if:**
  - Importing `brand` from `@mlabs/config` fails at metro bundling time
    — likely a metro resolver config gap. Confirm `metro.config.js` /
    workspace setup before diverging.
  - NativeWind classes don't reflect the new tokens — re-run
    `pnpm gen:mobile-tw` and verify.

---

## Open questions

For `/mlabs-code` to escalate if it hits any of these:

- **OKLCH primary exact value.** Target ≈ `oklch(0.69 0.18 39)` — but
  eyeball confirm against `.mstack/mockups/landing-page/v2/index.html`.
  If it doesn't match, adjust chroma/hue (not lightness, which is
  load-bearing for contrast). Pause if unclear.
- **AI-product framing copy.** Direction confirmed (generic AI-product
  startup), but specific lines for the 6-feature grid and the
  testimonial are owner taste. Default draft is acceptable; flag any
  lines that read "we built a template" instead of "we built a
  product".

## Follow-ups (post-implementation, not part of this pass)

- Phase 2: expose the dark-mode toggle (use `next-themes` already
  installed; tokens already validated)
- Doc-sync pass: cross-check README + HANDOVER.md.template + AGENTS.md
  for any other `apps/web/src/config/brand.ts` references missed by
  Task 3
- Replace logo-strip + testimonial placeholders with real content
  before any client launch
- Email-template rebrand (deferred from this pass)
- Pricing page build-out (deferred from this pass)
