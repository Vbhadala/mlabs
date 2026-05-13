# v1 — Dark (MLabs canonical)

## What makes this distinct

- **Surface**: deep navy `#0A0F1C` with subtle gridlines + soft orange radial
  glow behind the hero. Mirrors the millionlabs.com hero treatment.
- **Headline**: bold display, `tracking-tighter2`, key phrase ("days") in
  brand orange.
- **Hero pill**: orange-tinted with a glowing dot — direct nod to the
  "Trusted by 1100+ startups" pill on millionlabs.com.
- **Product mock**: small inline app preview (sidebar + KPI cards + line
  chart) reinforces that this is a real, shipping starter — not vapor.
- **Logo strip**: text-only "logos" (no fake brand imagery), placeholder
  styles to be swapped before going live.
- **Feature cards**: subtle border that lights up orange on hover, soft
  translate-up — small motion only.
- **CTA band**: gradient from warm-near-black through navy with an orange
  radial bloom — anchors the page and re-uses the hero glow language.

## Tokens used

- `--primary: #FF6B2C` (proposed addition)
- `--background: #0A0F1C` (proposed dark default)
- `--card: #131A2E`, `--surface: #0F1525`
- `--muted: #A8B0C0`, `--mutedLow: #6E7689`
- `--border: rgba(255,255,255,0.08)`

All values are mockup-only. Once approved they should be wired into
`apps/web/src/app/globals.css` and mirrored in `src/config/design.ts`.

## Known placeholders

- Logo strip is text-only ("Northwind", "Acme.co", etc.) — replace with real
  partner/customer logos or remove the section.
- Testimonial is intentionally anonymised; copy should be replaced with a
  real quote before shipping.
