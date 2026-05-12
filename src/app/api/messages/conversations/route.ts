// GET  /api/messages/conversations — inbox listing (10s poll).
// POST /api/messages/conversations { otherEmail } — open or create 1:1.
//
// Phase 5.5 (A5) — GET supports If-Modified-Since against users.messages_
// updated_at (bumped by an AFTER INSERT trigger on the messages table —
// migration 0005). 304 short-circuits before the inbox list query.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getSession, requireUserJSON } from "@/lib/auth/server"
import {
  listForUser,
  openOrCreate1to1,
} from "@/features/messages/server/conversations"
import { MessagesError } from "@/features/messages/server/errors"
import { logger } from "@/lib/logger"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema/auth"
import { apiError } from "@/lib/schemas/api-error"
import { z } from "zod"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return apiError(401, "auth.unauthenticated", "Sign in required")
  }
  const userId = session.user.id

  const [row] = await db
    .select({ ts: user.messages_updated_at })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  const updatedAt = row?.ts ?? null

  const ifModifiedSinceHeader = req.headers.get("if-modified-since")
  if (updatedAt && ifModifiedSinceHeader) {
    const since = Date.parse(ifModifiedSinceHeader)
    if (!Number.isNaN(since) && updatedAt.getTime() <= since) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Last-Modified": updatedAt.toUTCString() },
      })
    }
  }

  const items = await listForUser(userId)
  return NextResponse.json(
    { items },
    {
      headers: updatedAt
        ? { "Last-Modified": updatedAt.toUTCString() }
        : undefined,
    },
  )
}

const createSchema = z.object({
  otherEmail: z.email("Enter a valid email"),
})

export async function POST(req: Request) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      400,
      "messages.invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid input",
      parsed.error.issues[0]?.path[0]?.toString(),
    )
  }

  try {
    const { id } = await openOrCreate1to1({
      meId: me.id,
      otherEmail: parsed.data.otherEmail,
    })
    return NextResponse.json({ id })
  } catch (err) {
    if (err instanceof MessagesError) {
      // user_not_found / self_dm → 400 with a human-readable message.
      // The error message is generic enough that "user_not_found" doesn't
      // leak whether a real user exists vs. is unverified.
      return apiError(400, `messages.${err.code}`, err.message)
    }
    logger.error("openOrCreate1to1 failed", {
      meId: me.id,
      message: String(err),
    })
    return apiError(500, "messages.server_error", "Could not open conversation.")
  }
}
