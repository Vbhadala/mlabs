// GET /api/notifications/unread-count — feeds the bell.
// Auth-gated. Returns 401 for unauthenticated polling — the bell only renders
// inside the (app) shell anyway, so a 401 here means the session has expired
// in the background; the client treats it as "no badge, retry later."

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/server"
import { unreadCount } from "@/features/notifications/server/queries"

export const runtime = "nodejs"

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const count = await unreadCount(session.user.id)
  return NextResponse.json({ count })
}
