import "server-only"

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

import type { EmailDriver } from "./types"

interface BaseSendOpts {
  to: string
}

export interface CreateTemplatesOptions {
  /** Read lazily so callers can swap drivers in tests via a getter. */
  getDriver: () => EmailDriver
  brandName: string
}

export interface EmailTemplates {
  sendVerifyEmail: (
    opts: BaseSendOpts & { name: string; verifyUrl: string },
  ) => Promise<void>
  sendPasswordResetEmail: (
    opts: BaseSendOpts & {
      name: string
      resetUrl: string
      expiresInMinutes?: number
    },
  ) => Promise<void>
  sendNotificationEmail: (
    opts: BaseSendOpts & {
      title: string
      body: string
      ctaLabel?: string
      ctaUrl?: string
    },
  ) => Promise<void>
}

export function createTemplates({
  getDriver,
  brandName,
}: CreateTemplatesOptions): EmailTemplates {
  return {
    /**
     * Sent by Better Auth when a user signs up. Variables expected by the
     * `verify-email` Postmark template: brand_name, name, verify_url.
     */
    async sendVerifyEmail(opts) {
      await getDriver().send({
        templateAlias: "verify-email",
        to: opts.to,
        variables: {
          brand_name: brandName,
          name: opts.name,
          verify_url: opts.verifyUrl,
        },
        fromName: brandName,
      })
    },

    /**
     * Sent by Better Auth when a user requests a password reset. Variables
     * expected by `password-reset`: brand_name, name, reset_url,
     * expires_in_minutes.
     */
    async sendPasswordResetEmail(opts) {
      await getDriver().send({
        templateAlias: "password-reset",
        to: opts.to,
        variables: {
          brand_name: brandName,
          name: opts.name,
          reset_url: opts.resetUrl,
          expires_in_minutes: opts.expiresInMinutes ?? 60,
        },
        fromName: brandName,
      })
    },

    /**
     * Generic notification email — used by features/notifications when a row
     * should also fan out via email. Variables expected by
     * `notification-generic`: brand_name, title, body, cta_label, cta_url.
     */
    async sendNotificationEmail(opts) {
      await getDriver().send({
        templateAlias: "notification-generic",
        to: opts.to,
        variables: {
          brand_name: brandName,
          title: opts.title,
          body: opts.body,
          cta_label: opts.ctaLabel ?? "",
          cta_url: opts.ctaUrl ?? "",
        },
        fromName: brandName,
      })
    },
  }
}
