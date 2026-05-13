# v2 — Light (inverted, same brand)

## What makes this distinct

- **Surface**: white `#FFFFFF` with very subtle gridlines and a warm peach
  glow behind the hero. Friendlier first impression for a B2B SaaS client.
- **Same orange `#FF6B2C` brand** as v1 — used on the primary CTA, headline
  highlight, feature icons, and the inverted CTA band.
- **Inverted CTA band**: ink-on-white feature flow ends with a dark `#0A0F1C`
  CTA block — same "warm radial bloom" treatment as v1, just on dark inside
  a light page. Re-states the brand color story.
- **Sticky nav** with subtle blur — light-page convention.
- **Ghost CTA**: black outline → fills black on hover (classic Linear/Vercel
  light-mode convention).
- **Hover state on cards**: border darkens to ink + soft drop shadow (no
  orange glow as in v1) — keeps the page calmer.

## Tokens used

- `--primary: #FF6B2C` (same as v1)
- `--background: #FFFFFF`
- `--foreground: #0A0F1C` (ink)
- `--card: #FFFFFF`, `--surface: #FAFAF9`
- `--muted: #5B6473`, `--mutedLow: #8A93A2`
- `--border: #E6E4DF`

Same brand, different default surface. A client agency adopting Tianjin can
toggle between v1 and v2 by flipping one `:root` block.

## When to prefer this

- Client is a B2B SaaS or fintech where "friendly + trustworthy" beats
  "agency-tech".
- Long-form marketing pages where readability at length matters.
- Markets where dark mode reads as "edgy / consumer crypto".

## Known placeholders

- Logo strip is text-only placeholders, same as v1.
- Testimonial is anonymised — replace before shipping.
