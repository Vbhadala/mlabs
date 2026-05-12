// GET /api/notifications/unread-count — feeds the bell.
// Auth-gated. Returns 401 for unauthenticated polling — the bell only renders
// inside the (app) shell anyway, so a 401 here means the session has expired
// in the background; the client treats it as "no badge, retry later."
//
// Phase 5.5 (A5) — conditional GET: callers send If-Modified-Since with the
// timestamp from the previous successful response. If `users.notifications_
// updated_at <= ifModifiedSince`, we return 304 and skip the count query
// entirely. The freshness column is bumped by an AFTER INSERT trigger on
// notifications (migration 0005), so the timestamp can never get ahead of
// the actual row.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/server"
import { unreadCount } from "@/features/notifications/server/queries"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema/auth"
import { apiError } from "@/lib/schemas/api-error"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return apiError(401, "auth.unauthenticated", "Sign in required")
  }
  const userId = session.user.id

  // Read the freshness column — single primary-key lookup, sub-ms.
  const [row] = await db
    .select({ ts: user.notifications_updated_at })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  const updatedAt = row?.ts ?? null

  const ifModifiedSinceHeader = req.headers.get("if-modified-since")
  if (updatedAt && ifModifiedSinceHeader) {
    const since = Date.parse(ifModifiedSinceHeader)
    // HTTP dates are second-precision; compare at the same resolution to avoid
    // sub-second flapping (a row written at T.123 looks newer than T.000).
    if (!Number.isNaN(since) && updatedAt.getTime() <= since) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Last-Modified": updatedAt.toUTCString() },
      })
    }
  }

  const count = await unreadCount(userId)
  return NextResponse.json(
    { count },
    {
      headers: updatedAt
        ? { "Last-Modified": updatedAt.toUTCString() }
        : undefined,
    },
  )
}
