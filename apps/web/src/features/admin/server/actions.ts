"use server"

// Admin mutations. Every action:
//   1. requireAdmin() — non-admin returns 404 via notFound() in the helper
//   2. Validates inputs with Zod at the trust boundary
//   3. audit() BEFORE the mutation (PLAN.md §10)
//   4. Returns a typed { ok | error } result
//
// Self-protection rules:
//   changeRole — cannot change your own role; cannot demote the last admin
//   banUser    — cannot ban yourself; ban deletes all existing sessions in
//                the same db.batch as the audit + UPDATE banned_at
//
// banned users are kept out by databaseHooks.session.create.before in
// auth/index.ts AND by the cascading session DELETE here.

import "server-only"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user as userTable, session as sessionTable } from "@mlabs/db/schema"
import { audit } from "@/lib/db/audit"
import { logger } from "@/lib/logger"
import { createNotification } from "@/features/notifications/server/create"
import { adminCount } from "./queries"

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

const roleSchema = z.enum(["user", "admin"])

const changeRoleSchema = z.object({
  targetId: z.string().min(1),
  role: roleSchema,
})

export async function changeRole(
  args: z.infer<typeof changeRoleSchema>,
): Promise<ActionResult> {
  const me = await requireAdmin()
  const parsed = changeRoleSchema.safeParse(args)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { targetId, role } = parsed.data

  if (targetId === me.id) {
    return { ok: false, error: "You cannot change your own role." }
  }

  const [target] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) return { ok: false, error: "User not found." }

  const currentRole = target.role === "admin" ? "admin" : "user"
  if (currentRole === role) {
    return { ok: true, message: "No change." }
  }

  if (currentRole === "admin" && role === "user") {
    // Demote — refuse if this is the last admin. Race window with another
    // admin demoting at the same time is theoretical (admins coordinate);
    // flagged as v1.1 hardening (FOR UPDATE) in the eng review.
    const count = await adminCount()
    if (count <= 1) {
      return { ok: false, error: "Cannot demote the last admin." }
    }
  }

  await audit({
    actorId: me.id,
    action: "user.role_changed",
    target: { type: "user", id: targetId },
    meta: { kind: "user.role_changed", from: currentRole, to: role },
  })

  await db
    .update(userTable)
    .set({ role })
    .where(eq(userTable.id, targetId))

  revalidatePath(`/admin/users/${targetId}`)
  revalidatePath("/admin/users")
  return { ok: true, message: `Role updated to ${role}.` }
}

const banSchema = z.object({
  targetId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
})

export async function banUser(
  args: z.infer<typeof banSchema>,
): Promise<ActionResult> {
  const me = await requireAdmin()
  const parsed = banSchema.safeParse(args)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { targetId, reason } = parsed.data

  if (targetId === me.id) {
    return { ok: false, error: "You cannot ban yourself." }
  }

  const [target] = await db
    .select({
      id: userTable.id,
      banned_at: userTable.banned_at,
    })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) return { ok: false, error: "User not found." }
  if (target.banned_at) {
    // Idempotent — already banned. No-op but report success so the UI
    // doesn't flash an error on a double-click.
    return { ok: true, message: "User is already banned." }
  }

  await audit({
    actorId: me.id,
    action: "user.banned",
    target: { type: "user", id: targetId },
    meta: { kind: "user.banned", reason },
  })

  // Atomic batch — either everything lands or nothing does.
  await db.batch([
    db
      .update(userTable)
      .set({ banned_at: sql`now()`, banned_reason: reason ?? null })
      .where(eq(userTable.id, targetId)),
    db.delete(sessionTable).where(eq(sessionTable.userId, targetId)),
  ])

  // Trailing audit for the session revocations, scoped under the same actor
  // so the timeline reads cleanly on user-detail.
  await audit({
    actorId: me.id,
    action: "session.revoked",
    target: { type: "user", id: targetId },
    meta: { kind: "session.revoked", reason: "admin" },
  })

  revalidatePath(`/admin/users/${targetId}`)
  revalidatePath("/admin/users")
  return { ok: true, message: "User banned. All sessions revoked." }
}

const unbanSchema = z.object({ targetId: z.string().min(1) })

export async function unbanUser(
  args: z.infer<typeof unbanSchema>,
): Promise<ActionResult> {
  const me = await requireAdmin()
  const parsed = unbanSchema.safeParse(args)
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" }
  }
  const { targetId } = parsed.data

  const [target] = await db
    .select({ banned_at: userTable.banned_at })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) return { ok: false, error: "User not found." }
  if (!target.banned_at) {
    return { ok: true, message: "User is not banned." }
  }

  await audit({
    actorId: me.id,
    action: "user.unbanned",
    target: { type: "user", id: targetId },
    meta: { kind: "user.unbanned" },
  })

  await db
    .update(userTable)
    .set({ banned_at: null, banned_reason: null })
    .where(eq(userTable.id, targetId))

  revalidatePath(`/admin/users/${targetId}`)
  revalidatePath("/admin/users")
  return { ok: true, message: "User unbanned." }
}

const resetSchema = z.object({ targetId: z.string().min(1) })

export async function sendPasswordResetTo(
  args: z.infer<typeof resetSchema>,
): Promise<ActionResult> {
  const me = await requireAdmin()
  const parsed = resetSchema.safeParse(args)
  if (!parsed.success) return { ok: false, error: "Invalid input" }
  const { targetId } = parsed.data

  const [target] = await db
    .select({ id: userTable.id, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) return { ok: false, error: "User not found." }

  await audit({
    actorId: me.id,
    action: "user.password_reset_sent",
    target: { type: "user", id: targetId },
    meta: { kind: "user.password_reset_sent" },
  })

  try {
    await auth.api.requestPasswordReset({
      body: { email: target.email },
      headers: await headers(),
    })
  } catch (err) {
    logger.error("admin sendPasswordResetTo failed", {
      adminId: me.id,
      targetId,
      message: String(err),
    })
    return { ok: false, error: "Could not send reset email." }
  }

  return { ok: true, message: `Reset email sent to ${target.email}.` }
}

const notifySchema = z.object({
  targetId: z.string().min(1),
  title: z.string().trim().min(1, "Title required").max(120),
  message: z.string().trim().min(1, "Message required").max(2000),
  href: z.string().trim().max(500).optional(),
})

export async function sendAdminNotification(
  args: z.infer<typeof notifySchema>,
): Promise<ActionResult> {
  const me = await requireAdmin()
  const parsed = notifySchema.safeParse(args)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { targetId, title, message, href } = parsed.data

  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) return { ok: false, error: "User not found." }

  await audit({
    actorId: me.id,
    action: "user.admin_notified",
    target: { type: "user", id: targetId },
    meta: { kind: "user.admin_notified", title },
  })

  await createNotification({
    userId: targetId,
    body: {
      kind: "generic",
      title,
      message,
      href: href || undefined,
    },
  })

  revalidatePath(`/admin/users/${targetId}`)
  return { ok: true, message: "Notification sent." }
}
