// POST /api/notifications/mark-all-read — marks every unread row for the
// current user as read. Mirror of features/notifications/server/actions.ts
// markAllRead() — the route exists because mobile can't reach Server Actions.

import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { requireUserJSON } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema/notifications"

export const runtime = "nodejs"

export async function POST() {
  const auth = await requireUserJSON()
  if (auth instanceof Response) return auth
  const me = auth

  const rows = await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(eq(notifications.user_id, me.id), isNull(notifications.read_at)),
    )
    .returning({ id: notifications.id })

  return NextResponse.json({ ok: true, changed: rows.length })
}
