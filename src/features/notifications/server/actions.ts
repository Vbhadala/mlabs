"use server"

// Notification mutations: mark a single row read, or all unread.
//
// Authz model — no enumeration:
//   markRead(id) updates with predicate (id = $1 AND user_id = $me). If 0
//   rows match (id is bogus OR belongs to another user OR is already read),
//   we return { ok: true, changed: 0 } — never "forbidden", never "not
//   found for this user". An attacker probing IDs sees the same response
//   for "doesn't exist" and "exists but not yours".

import "server-only"
import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema/notifications"
import { requireUser } from "@/lib/auth/server"

interface MarkResult {
  ok: true
  changed: number
}

export async function markRead(id: string): Promise<MarkResult> {
  const me = await requireUser()
  // drizzle-orm/neon-http doesn't surface a rowCount on .update() returning,
  // so we use a RETURNING clause to detect the change count portably.
  const rows = await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.user_id, me.id),
        isNull(notifications.read_at),
      ),
    )
    .returning({ id: notifications.id })

  if (rows.length > 0) revalidatePath("/notifications")
  return { ok: true, changed: rows.length }
}

export async function markAllRead(): Promise<MarkResult> {
  const me = await requireUser()
  const rows = await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(eq(notifications.user_id, me.id), isNull(notifications.read_at)),
    )
    .returning({ id: notifications.id })

  if (rows.length > 0) revalidatePath("/notifications")
  return { ok: true, changed: rows.length }
}
