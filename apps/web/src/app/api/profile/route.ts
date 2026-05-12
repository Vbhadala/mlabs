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
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireUserJSON } from "@/lib/auth/server"
import { audit, clientFromHeaders } from "@/lib/db/audit"
import { logger } from "@/lib/logger"
import { storage } from "@/lib/storage"
import { apiError } from "@/lib/schemas/api-error"
import { deleteAccountOp } from "@/server/operations/users"

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
  // Op handles auth + audit + anonymize + session-revoke in one pipeline.
  // The only piece left at the route layer is the best-effort storage
  // cleanup, which can't live in services (the storage adapter is an
  // app-composition concern). We do the storage delete AFTER the op
  // succeeds so a hung storage backend can't block account deletion.
  const res = await deleteAccountOp.runFromRequest(req)
  if (res.status !== 200) return res
  const body = (await res.clone().json()) as {
    ok: true
    previousImage: string | null
  }
  if (body.previousImage) {
    const prefix = "/api/storage/"
    if (body.previousImage.startsWith(prefix)) {
      const key = body.previousImage.slice(prefix.length)
      try {
        await storage.delete(key)
      } catch (err) {
        logger.warn("avatar delete failed during account deletion", {
          key,
          message: String(err),
        })
      }
    }
  }
  return NextResponse.json({ ok: true })
}
