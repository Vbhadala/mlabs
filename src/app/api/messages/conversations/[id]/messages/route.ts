// GET  /api/messages/conversations/[id]/messages?after=<cursor> — thread poll.
// POST /api/messages/conversations/[id]/messages { body }            — send.
//
// Auth: getSession() for GET (401 surfaces a stale session to the bell/inbox
// without redirect noise); requireUser() for POST (redirects on bad session).
// Participant check is enforced inside the server modules — non-participant
// returns "not_found" → 404, never 403 (no enumeration).

import { NextResponse } from "next/server"
import { getSession, requireUserJSON } from "@/lib/auth/server"
import {
  listMessages,
  sendMessage,
} from "@/features/messages/server/messages"
import { MessagesError } from "@/features/messages/server/errors"
import { logger } from "@/lib/logger"
import { apiError } from "@/lib/schemas/api-error"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session?.user) {
    return apiError(401, "auth.unauthenticated", "Sign in required")
  }
  const { id: conversationId } = await ctx.params
  const url = new URL(req.url)
  const cursor = url.searchParams.get("after")

  try {
    const items = await listMessages({
      conversationId,
      userId: session.user.id,
      cursor,
    })
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof MessagesError && err.code === "not_found") {
      return apiError(404, "messages.not_found", "Not found")
    }
    logger.error("listMessages failed", {
      userId: session.user.id,
      conversationId,
      message: String(err),
    })
    return apiError(500, "messages.server_error", "Server error")
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  const authResult = await requireUserJSON()
  if (authResult instanceof Response) return authResult
  const me = authResult
  const { id: conversationId } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body || typeof body.body !== "string") {
    return apiError(400, "messages.invalid_payload", "Invalid payload", "body")
  }

  try {
    const row = await sendMessage({
      conversationId,
      senderId: me.id,
      body: body.body,
    })
    return NextResponse.json({ message: row })
  } catch (err) {
    if (err instanceof MessagesError) {
      const status = err.code === "not_found" ? 404 : 400
      return apiError(status, `messages.${err.code}`, err.message)
    }
    logger.error("sendMessage failed", {
      userId: me.id,
      conversationId,
      message: String(err),
    })
    return apiError(500, "messages.server_error", "Server error")
  }
}
