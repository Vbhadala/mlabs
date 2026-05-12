// Read-side queries. Always scoped to a userId — no global views from this
// file (admin-side analytics live in features/admin, when that lands).

import "server-only"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema/notifications"
import type { NotificationBody } from "../types"

export interface NotificationRow {
  id: string
  type: string
  body: NotificationBody
  read_at: Date | null
  created_at: Date
}

export const INBOX_LIMIT = 50

export async function listInbox(userId: string): Promise<NotificationRow[]> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      body: notifications.body,
      read_at: notifications.read_at,
      created_at: notifications.created_at,
    })
    .from(notifications)
    .where(eq(notifications.user_id, userId))
    .orderBy(desc(notifications.created_at))
    .limit(INBOX_LIMIT)
  return rows
}

export async function unreadCount(userId: string): Promise<number> {
  // Single-row count — uses the (user_id, read_at) index.
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.user_id, userId), isNull(notifications.read_at)),
    )
  return row?.count ?? 0
}
