# Landing page — Tianjin template

## Goal

Polished, opinionated default landing page so the Tianjin template feels like
an MLabs product the moment a client agency clones it. Clients can rebrand by
swapping tokens in `src/config/design.ts` / `globals.css`.

## Reference

User-supplied screenshot at `.context/attachments/image.png` — the
millionlabs.com hero. Drives the visual direction.

## Brand tokens (proposed)

Currently `globals.css` is pure grayscale (chroma 0). To match MLabs we need
to introduce:

- `--primary: #FF6B2C` — MLabs orange (was: near-black)
- Dark mode as the default for the landing page (light mode still ships for
  the app shell)
- Background `#0A0F1C` (dark) / `#FFFFFF` (light)
- Foreground white / dark-navy
- Muted `#A8B0C0` (dark) / `#6B7280` (light)

These are mockup-only for now. A `/mlabs-plan` pass should wire them into
`globals.css` + `src/config/design.ts` once the look is approved.

## Variant axis

**Visual style** (chosen by user). Same structure, layout, and copy across
variants — they differ only in light vs dark default surface.

## Variants

- **v1 — Dark (MLabs canonical)**. Mirrors the millionlabs.com hero: deep
  navy surface, white display headline with orange highlight, orange CTA,
  uppercase nav. Strong agency-tech feel.
- **v2 — Light (inverted)**. Same brand orange, but light surface with dark
  text. Friendlier first impression for a B2B SaaS client; same tokens, just
  inverted.

## Sections (both variants)

- Top nav with wordmark + uppercase links + primary CTA
- Hero: trust pill, display headline (with orange phrase), subhead, dual CTA
- Feature grid (6 cells) — the actual Tianjin value props
- Social proof — testimonial card + agency logo strip
- CTA band — single headline + primary button
- Footer — wordmark, columns, legal line

## Copy source

`apps/web/src/config/brand.ts`:

- name: "MLabs Template"
- tagline: "Ship MVPs in days, not months"
- supportEmail: "support@example.com"
- legalEntity: "Million Labs Ltd"

## Anti-goals

- Not a marketing site for MLabs the agency — this is the template default
- No stock illustrations or photography (template ships zero image assets)
- No fake testimonials with real names
