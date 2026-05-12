// POST /api/profile/password { currentPassword, newPassword }
//
// Mobile REST mirror of features/profile/server/actions.ts changePassword().
// Delegates to Better Auth's changePassword API (which verifies
// currentPassword) with revokeOtherSessions: true.

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireUserJSON } from "@/lib/auth/server"
import { audit, clientFromHeaders } from "@/lib/db/audit"
import { logger } from "@/lib/logger"
import { apiError } from "@/lib/schemas/api-error"

export const runtime = "nodejs"

const body = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: Request) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const client = clientFromHeaders(req.headers)

  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return apiError(
      400,
      "profile.invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid input",
      parsed.error.issues[0]?.path[0]?.toString(),
    )
  }

  await audit({
    actorId: me.id,
    action: "session.revoked",
    target: { type: "user", id: me.id },
    meta: { kind: "session.revoked", reason: "password_change" },
    client,
  })

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })
  } catch (err) {
    // Better Auth throws on wrong current password — keep message generic to
    // avoid an enumeration oracle.
    logger.warn("changePassword rejected", { userId: me.id, message: String(err) })
    return apiError(
      400,
      "profile.password_rejected",
      "Could not change password. Check your current password and try again.",
    )
  }

  return NextResponse.json({ ok: true })
}
