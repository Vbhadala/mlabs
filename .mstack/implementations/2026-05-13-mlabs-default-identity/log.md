# Run log

## 2026-05-13 — pre-flight

- Working tree was dirty: `M AGENTS.md`, `M README.md`, `?? .claude/`, `?? .mstack/`.
- User chose to commit everything as a single prep commit. Landed at `2ac8ddd4`.
- Pre-commit hook ran `check-contrast` against the current grayscale
  `packages/config/src/design.ts` — all 28 pairs pass at ≥4.5:1 (or ≥3:1
  for non-text pairs). Baseline captured.

## Decisions noted before Task 1

- **primaryForeground must flip from near-white to near-black** when
  primary flips to orange. White on `#FF6B2C` is ~3.36:1 (FAILS WCAG AA
  4.5:1 threshold). Dark ink on `#FF6B2C` is ~6:1 (passes). Mockup v1
  already uses dark-on-orange; mockup v2 had white-on-orange which was
  an accessibility oversight we'll correct here.
- Conservative scope: change only the tokens the review explicitly
  named. If `check-contrast` fails on any pair after the flip, back off
  on the offending token and document in the commit message.

## Task 1 — feat(config): MLabs brand tokens

- Edited `packages/config/src/design.ts` and mirrored in `apps/web/src/app/globals.css`.
- First contrast pass failed 3 light-theme pairs (border, input, ring at 2.00:1 / 2.98:1).
  Resolved by darkening border+input to `oklch(0.62 0.005 80)` and ring to
  `oklch(0.62 0.19 39)` — kept the warm/orange identity, just darker enough for
  the 3:1 non-text-component bar.
- `pnpm gen:mobile-tw` regenerated `apps/mobile/tailwind.config.js`; `gen:mobile-tw:check` passes.
- `pnpm typecheck`, `pnpm lint`, `pnpm check-contrast` all pass.
- Commit `16603ca1`.
- **PAUSE: visual gate.** User must `pnpm dev`, view `/`, `/_dev/states`, `/login`,
  and one authed page (e.g. `/profile` after signing in), and confirm the orange
  reads correctly + nothing is visually broken before Task 2 starts.
