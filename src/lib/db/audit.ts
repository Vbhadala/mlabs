// audit() helper — single entry point for writing audit log rows.
//
// Critical contract: for state-changing actions, call this BEFORE the action.
// If the audit write fails, the helper throws — the caller's action does NOT
// proceed (per PLAN.md §10: "audit failure is silent" was a critical gap).
//
// Metadata uses a typed discriminated-union allowlist. Adding a new action
// means extending AuditMeta; no free-form strings allowed (GDPR / anonymize-
// in-place safety: untyped jsonb could leak PII that anonymize() would miss).

import "server-only"
import { db } from "@/lib/db"
import { audit_log } from "./schema/audit_log"

// Add a new variant per action you log. Keep keys snake-cased actions matching
// the `action` column ("user.role_changed" → corresponds to kind below).
export type AuditMeta =
  | { kind: "user.role_changed"; from: string; to: string }
  | { kind: "user.banned"; reason?: string }
  | { kind: "user.unbanned" }
  | { kind: "user.password_reset_sent" }
  | { kind: "user.email_changed"; from_email_hash: string }
  | { kind: "user.deleted_anonymized" }
  | { kind: "session.revoked"; reason: "logout" | "admin" | "password_change" }

export interface AuditOpts {
  actorId: string | null
  action: AuditMeta["kind"]
  target?: { type: string; id: string }
  meta?: AuditMeta
}

export async function audit(opts: AuditOpts): Promise<void> {
  await db.insert(audit_log).values({
    actor_id: opts.actorId,
    action: opts.action,
    target_type: opts.target?.type ?? null,
    target_id: opts.target?.id ?? null,
    metadata: opts.meta ?? null,
  })
}
