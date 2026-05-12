// /api/profile — mobile REST mirror of features/profile/server/actions.ts.
//
// PATCH /api/profile  { name }            → updates display name
// DELETE /api/profile                     → anonymizes account (irreversible)
//
// The web app uses Server Actions in features/profile/server/actions.ts;
// mobile can't reach those so we expose REST equivalents. Logic stays in sync
// by sharing the same Drizzle schema, audit() calls, and Better Auth admin
// APIs — never duplicated business rules.

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireUserJSON } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user as userTable, session as sessionTable } from "@/lib/db/schema/auth"
import { audit, clientFromHeaders } from "@/lib/db/audit"
import { logger } from "@/lib/logger"
import { storage } from "@/lib/storage"
import { apiError } from "@/lib/schemas/api-error"

export const runtime = "nodejs"

const updateBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
})

export async function PATCH(req: Request) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const client = clientFromHeaders(req.headers)

  const body = await req.json().catch(() => null)
  const parsed = updateBody.safeParse(body)
  if (!parsed.success) {
    return apiError(
      400,
      "profile.invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid input",
      parsed.error.issues[0]?.path[0]?.toString(),
    )
  }

  const newName = parsed.data.name
  if (newName === me.name) {
    return NextResponse.json({ user: me, changed: false })
  }

  // audit BEFORE the action (PLAN.md §10): a failed audit blocks the change.
  await audit({
    actorId: me.id,
    action: "user.name_changed",
    target: { type: "user", id: me.id },
    meta: { kind: "user.name_changed" },
    client,
  })

  await auth.api.updateUser({
    body: { name: newName },
    headers: await headers(),
  })

  return NextResponse.json({ user: { ...me, name: newName }, changed: true })
}

export async function DELETE(req: Request) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const client = clientFromHeaders(req.headers)

  await audit({
    actorId: me.id,
    action: "user.deleted_anonymized",
    target: { type: "user", id: me.id },
    meta: { kind: "user.deleted_anonymized" },
    client,
  })

  // Best-effort avatar cleanup (mirrors features/profile/server/actions.ts).
  const meWithImage = me as typeof me & { image?: string | null }
  if (meWithImage.image) {
    const prefix = "/api/storage/"
    if (meWithImage.image.startsWith(prefix)) {
      const key = meWithImage.image.slice(prefix.length)
      try {
        await storage.delete(key)
      } catch (err) {
        logger.warn("avatar delete failed during account deletion", {
          userId: me.id,
          key,
          message: String(err),
        })
      }
    }
  }

  // Anonymize-in-place. Preserves audit_log FK + historical refs (messages).
  await db
    .update(userTable)
    .set({
      name: "Deleted user",
      email: `deleted-${me.id}@example.invalid`,
      emailVerified: false,
      image: null,
    })
    .where(eq(userTable.id, me.id))

  // Revoke every session for the user (including the caller).
  await audit({
    actorId: me.id,
    action: "session.revoked",
    target: { type: "user", id: me.id },
    meta: { kind: "session.revoked", reason: "account_deleted" },
    client,
  })
  await db.delete(sessionTable).where(eq(sessionTable.userId, me.id))

  return NextResponse.json({ ok: true })
}
