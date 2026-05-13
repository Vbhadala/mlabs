# Landing page — final decision

**Winner**: `v2/` — Light (inverted, same brand orange)

## Locked design decisions

- **Brand primary**: `#FF6B2C` (MLabs orange). Confirmed exact value.
- **Default surface**: light. Background `#FFFFFF`, ink `#0A0F1C`.
- **Inverted CTA block**: dark `#0A0F1C` with orange radial bloom at the
  bottom of the page — anchors the brand.
- **Headline treatment**: bold display Inter, `tracking-tighter2`, key phrase
  ("days", "day one", "product work", "Tianjin") highlighted in primary.
- **Buttons**: filled-primary (orange on light) + ghost (black outline →
  fills black on hover).
- **Section order**: nav → hero (pill + headline + dual CTA) → product mock
  → logo strip → 6-feature grid → testimonial → dark CTA band → footer.

## Tokens to introduce (not yet in `globals.css`)

The current `apps/web/src/app/globals.css` is pure grayscale. The approved
mockup requires these additions:

| Token | Light | Dark (later) |
| --- | --- | --- |
| `--primary` | `#FF6B2C` | `#FF6B2C` |
| `--primary-foreground` | `#FFFFFF` | `#0A0F1C` |
| `--background` | `#FFFFFF` | `#0A0F1C` |
| `--foreground` | `#0A0F1C` | `#FFFFFF` |
| `--muted` | `#5B6473` | `#A8B0C0` |
| `--border` | `#E6E4DF` | `rgba(255,255,255,0.08)` |
| `--card` | `#FFFFFF` | `#131A2E` |
| `--surface` | `#FAFAF9` | `#0F1525` |

These should be wired into `globals.css` **and** mirrored in
`apps/web/src/config/design.ts` (currently missing — file does not exist).

## Open items for `/mlabs-plan`

1. Wire the tokens above into `globals.css` (replacing the current grayscale
   `--primary` and friends).
2. Create `apps/web/src/config/design.ts` (referenced in CLAUDE / brief but
   missing from the tree).
3. Build the landing page route — likely `apps/web/src/app/(marketing)/page.tsx`
   or replace the existing `apps/web/src/app/page.tsx` — using shadcn
   primitives + the new tokens.
4. Component breakdown (from the mockup):
   - `<MarketingNav />` — logo, uppercase link list, primary CTA
   - `<Hero />` — pill, h1 with `<Highlight>` span, subhead, dual CTA, trust row
   - `<ProductMock />` — embedded dashboard preview (static, decorative)
   - `<LogoStrip />` — placeholder; flag for real logos before launch
   - `<FeatureGrid />` — 6 cells, icon + heading + body
   - `<Testimonial />` — single card; flag for real quote before launch
   - `<CTASection />` — dark band with orange radial bloom
   - `<MarketingFooter />` — wordmark, 4 columns, legal row
5. Real copy already drafted in v2/index.html — reuse verbatim where possible.
6. Replace the placeholder logo strip + testimonial with real assets, or
   gate behind a `landingPage.showSocialProof` flag if the template should
   ship without them by default.

## Known placeholders to address before going live

- 6 fake company "logos" in the logo strip (text-only) — replace or remove.
- Anonymised testimonial — replace with a real quote or hide.
- `mailto:support@example.com` — already keyed off `brand.supportEmail`,
  will update when `brand.ts` is updated.

## What did NOT win and why

`v1/` (dark, MLabs canonical) was the closer match to millionlabs.com, but
the template defaults to light because a light first-run is friendlier for
the broader range of clients agencies will rebrand into. The dark token set
above is preserved so a client can flip to dark mode without redesigning.
