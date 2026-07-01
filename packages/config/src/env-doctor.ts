// @mlabs/config/env-doctor — single source of truth for the load-bearing
// environment config a fork must set, plus a *pure* evaluator over it.
//
// This module reads NO `process.env` and imports no server code: callers pass
// the values in. That keeps it safe to live in the universal @mlabs/config
// package (it never enters the mobile/design bundle — it's only reachable via
// the `@mlabs/config/env-doctor` subpath, not the package root) and trivially
// unit-testable.
//
// Consumers:
//   • scripts/doctor.ts            (pnpm doctor — full table + live DB check)
//   • apps/web/src/instrumentation (dev-boot banner — static presence only)

export type Severity = "critical" | "recommended" | "optional"

export interface ConfigCheck {
  /** Env var name. */
  key: string
  /** Human grouping for the doctor table. */
  group: string
  severity: Severity
  /** What breaks when this is missing. */
  consequence: string
  /** Where to obtain the value. */
  howToGet: string
}

// Critical = the app is broken for the core signup loop without it.
// Recommended = a major feature (email) is dead but signup can still work.
// Optional = feature-gated; unset is a valid web-only / no-billing fork.
export const CONFIG_CHECKS: readonly ConfigCheck[] = [
  {
    key: "DATABASE_URL",
    group: "Database",
    severity: "critical",
    consequence: "every DB query 500s — the app boots but is broken",
    howToGet: "console.neon.tech → Project → Connection Details (or run `pnpm setup`)",
  },
  {
    key: "BETTER_AUTH_SECRET",
    group: "Auth",
    severity: "critical",
    consequence: "auth flows fail (login, signup, password reset)",
    howToGet: "generate with `openssl rand -base64 32` (or run `pnpm setup`)",
  },
  {
    key: "BETTER_AUTH_URL",
    group: "Auth",
    severity: "recommended",
    consequence: "auth callbacks may sign under the wrong base URL",
    howToGet: "the public URL the app is reachable at (defaults to http://localhost:3000)",
  },
  {
    key: "POSTMARK_SERVER_TOKEN",
    group: "Email",
    severity: "recommended",
    consequence: "email flows fail (verify email, password reset)",
    howToGet: "account.postmarkapp.com → your server → API Tokens",
  },
  {
    key: "POSTMARK_FROM_EMAIL",
    group: "Email",
    severity: "recommended",
    consequence: "email flows fail (no verified sender)",
    howToGet: "a verified Sender Signature in your Postmark account",
  },
  {
    key: "REPLIT_OBJECT_STORAGE_BUCKET_ID",
    group: "Storage",
    severity: "optional",
    consequence: "file uploads (avatars etc.) fail",
    howToGet: "Replit project → Tools → Object Storage → create bucket → copy ID",
  },
  {
    key: "STRIPE_SECRET_KEY",
    group: "Billing",
    severity: "optional",
    consequence: "Stripe-dependent flows (checkout, payments, webhooks) fail",
    howToGet: "dashboard.stripe.com → Developers → API keys",
  },
]

export type CheckStatus = "ok" | "missing"

export interface CheckResult extends ConfigCheck {
  status: CheckStatus
}

/** Pure: given a value map, return each check's status. Whitespace-only counts as missing. */
export function evaluateConfig(
  values: Record<string, string | undefined>,
): CheckResult[] {
  return CONFIG_CHECKS.map((check) => {
    const raw = values[check.key]
    const present = typeof raw === "string" && raw.trim().length > 0
    return { ...check, status: present ? "ok" : "missing" }
  })
}

/** Missing results at a given severity. */
export function missingBySeverity(
  results: readonly CheckResult[],
  severity: Severity,
): CheckResult[] {
  return results.filter((r) => r.status === "missing" && r.severity === severity)
}

/** True if any critical var is missing (drives `pnpm doctor --strict` + the dev banner). */
export function hasMissingCritical(results: readonly CheckResult[]): boolean {
  return results.some((r) => r.status === "missing" && r.severity === "critical")
}
