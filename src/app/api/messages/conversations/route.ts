// GET  /api/messages/conversations — inbox listing (10s poll).
// POST /api/messages/conversations { otherEmail } — open or create 1:1.

import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession, requireUser } from "@/lib/auth/server"
import {
  listForUser,
  openOrCreate1to1,
} from "@/features/messages/server/conversations"
import { MessagesError } from "@/features/messages/server/errors"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const items = await listForUser(session.user.id)
  return NextResponse.json({ items })
}

const createSchema = z.object({
  otherEmail: z.email("Enter a valid email"),
})

export async function POST(req: Request) {
  const me = await requireUser()
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
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
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      )
    }
    logger.error("openOrCreate1to1 failed", {
      meId: me.id,
      message: String(err),
    })
    return NextResponse.json(
      { error: "Could not open conversation." },
      { status: 500 },
    )
  }
}
