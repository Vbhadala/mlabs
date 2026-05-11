// GET  /api/messages/conversations/[id]/messages?after=<cursor> — thread poll.
// POST /api/messages/conversations/[id]/messages { body }            — send.
//
// Auth: getSession() for GET (401 surfaces a stale session to the bell/inbox
// without redirect noise); requireUser() for POST (redirects on bad session).
// Participant check is enforced inside the server modules — non-participant
// returns "not_found" → 404, never 403 (no enumeration).

import { NextResponse } from "next/server"
import { getSession, requireUser } from "@/lib/auth/server"
import {
  listMessages,
  sendMessage,
} from "@/features/messages/server/messages"
import { MessagesError } from "@/features/messages/server/errors"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
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
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    logger.error("listMessages failed", {
      userId: session.user.id,
      conversationId,
      message: String(err),
    })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  const me = await requireUser()
  const { id: conversationId } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body || typeof body.body !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
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
      const status =
        err.code === "not_found"
          ? 404
          : err.code === "invalid_body"
            ? 400
            : 400
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      )
    }
    logger.error("sendMessage failed", {
      userId: me.id,
      conversationId,
      message: String(err),
    })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
