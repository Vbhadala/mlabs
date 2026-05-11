// Driver interface for transactional email. The MLabs default is Postmark
// (per PLAN.md §2 + Q3); the console driver is a dev fallback so devs can
// build features without provisioning Postmark first.
//
// Templates live in the email provider's UI (Postmark) — code never holds
// the body content. This is a deliberate handover win: clients can edit copy
// in Postmark without touching the codebase.

export interface SendArgs {
  templateAlias: string
  to: string
  variables: Record<string, string | number | null | undefined>
  /** From-name override (default comes from POSTMARK_FROM_EMAIL config). */
  fromName?: string
}

export interface SendResult {
  /** Provider's message ID (for tracing in Postmark dashboard). */
  messageId: string
}

export interface EmailDriver {
  name: string
  send(args: SendArgs): Promise<SendResult>
}
