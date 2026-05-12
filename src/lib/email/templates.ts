// Typed template wrappers — one per Postmark template alias.
// Each function locks the template alias + variable shape, so a typo or missing
// variable becomes a TS error, not a silent runtime bug.
//
// Adding a new template:
//   1. Create the template in Postmark (UI: Servers → Your Server → Templates → New)
//   2. Note its alias and the variables it expects
//   3. Add a typed wrapper here
//   4. Document in docs/handover/postmark-templates.md so client handover is clean
//
// Template content lives in Postmark UI on purpose — clients can edit copy
// without touching the codebase.

import "server-only"
import { brand } from "@/config/brand"
import { getEmailDriver } from "./driver"
// Re-exported so call sites that compose CTA URLs do it through the helpers
// instead of `${env.BETTER_AUTH_URL}/path?token=${tok}` string concat (C1 in
// PHASE_5_5.md). When a notification CTA must deep-link into the mobile app,
// use buildAppLinkUrl; otherwise buildAuthUrl is the right call.
export { buildAppLinkUrl, buildAuthUrl } from "./url"

interface BaseSendOpts {
  to: string
}

/**
 * Sent by Better Auth when a user signs up. Variables expected by the
 * `verify-email` Postmark template:
 *   - brand_name
 *   - name
 *   - verify_url
 */
export async function sendVerifyEmail(
  opts: BaseSendOpts & { name: string; verifyUrl: string },
): Promise<void> {
  await getEmailDriver().send({
    templateAlias: "verify-email",
    to: opts.to,
    variables: {
      brand_name: brand.name,
      name: opts.name,
      verify_url: opts.verifyUrl,
    },
    fromName: brand.name,
  })
}

/**
 * Sent by Better Auth when a user requests a password reset. Variables expected
 * by the `password-reset` Postmark template:
 *   - brand_name
 *   - name
 *   - reset_url
 *   - expires_in_minutes
 */
export async function sendPasswordResetEmail(
  opts: BaseSendOpts & { name: string; resetUrl: string; expiresInMinutes?: number },
): Promise<void> {
  await getEmailDriver().send({
    templateAlias: "password-reset",
    to: opts.to,
    variables: {
      brand_name: brand.name,
      name: opts.name,
      reset_url: opts.resetUrl,
      expires_in_minutes: opts.expiresInMinutes ?? 60,
    },
    fromName: brand.name,
  })
}

/**
 * Generic notification email — used by features/notifications when a row should
 * also fan out via email. Variables expected by `notification-generic`:
 *   - brand_name
 *   - title
 *   - body
 *   - cta_label
 *   - cta_url
 */
export async function sendNotificationEmail(
  opts: BaseSendOpts & {
    title: string
    body: string
    ctaLabel?: string
    ctaUrl?: string
  },
): Promise<void> {
  await getEmailDriver().send({
    templateAlias: "notification-generic",
    to: opts.to,
    variables: {
      brand_name: brand.name,
      title: opts.title,
      body: opts.body,
      cta_label: opts.ctaLabel ?? "",
      cta_url: opts.ctaUrl ?? "",
    },
    fromName: brand.name,
  })
}
