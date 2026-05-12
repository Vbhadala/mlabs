// Single source of truth for brand identity. Edit this file to rebrand.
// No string literal of brand.name should appear anywhere else in the codebase.
// (ESLint rule enforces this; allowlist: config/, templates/, legal/.)

export const brand = {
  name: "MLabs Template",
  tagline: "Ship MVPs in days, not months",
  supportEmail: "support@example.com",
  socialHandle: "@mlabs",
  legalEntity: "Million Labs Ltd",
  url: "https://example.com",
} as const

export type Brand = typeof brand
