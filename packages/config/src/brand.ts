// Single source of truth for brand identity. Edit this file to rebrand.
// No string literal of brand.name should appear anywhere else in the codebase.
// (ESLint rule no-brand-string-literal enforces this; allowlist: config/,
// templates/, legal/, translations/, docs/, tests/, e2e/.)
//
// The ESLint rule reads brand.name from this file at lint time. If you move
// it, update the candidates list in
// tooling/eslint-config/src/rules/no-brand-string-literal.mjs.

export const brand = {
  name: "MLabs Template",
  tagline: "AI engineering with guardrails, conventions, and a paper trail",
  // Substring of `tagline` rendered in `text-primary` on the landing hero.
  // First-match split; case-sensitive. If the substring doesn't appear in
  // `tagline`, the hero renders the tagline as plain text.
  taglineHighlight: "paper trail",
  supportEmail: "support@example.com",
  socialHandle: "@mlabs",
  legalEntity: "Million Labs Ltd",
  url: "https://example.com",
} as const

export type Brand = typeof brand
