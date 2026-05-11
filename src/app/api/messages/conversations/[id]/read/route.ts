// POST /api/messages/conversations/[id]/read — mark as read.
//
// Called by the thread page on mount (and after a new message arrives while
// the thread is in view). Cascades to notifications via the server module.

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth/server"
import { markConversationRead } from "@/features/messages/server/messages"
import { MessagesError } from "@/features/messages/server/errors"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, ctx: RouteContext) {
  const me = await requireUser()
  const { id: conversationId } = await ctx.params

  try {
    await markConversationRead({ conversationId, userId: me.id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MessagesError && err.code === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    logger.error("markConversationRead failed", {
      userId: me.id,
      conversationId,
      message: String(err),
    })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
