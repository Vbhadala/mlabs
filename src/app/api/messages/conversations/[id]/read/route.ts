// POST /api/messages/conversations/[id]/read — mark as read.
//
// Called by the thread page on mount (and after a new message arrives while
// the thread is in view). Cascades to notifications via the server module.

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth/server"
import { markConversationRead } from "@/features/messages/server/messages"
import { MessagesError } from "@/features/messages/server/errors"
import { logger } from "@/lib/logger"
import { apiError } from "@/lib/schemas/api-error"

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
      return apiError(404, "messages.not_found", "Not found")
    }
    logger.error("markConversationRead failed", {
      userId: me.id,
      conversationId,
      message: String(err),
    })
    return apiError(500, "messages.server_error", "Server error")
  }
}
