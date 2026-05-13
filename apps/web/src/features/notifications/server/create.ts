// createNotification — single typed entry point for any feature that wants
// to deliver an in-app notification. Keep this small: variants live in
// features/notifications/types.ts, validation lives here.
//
// Callers (eventually): admin actions, message reply hooks, system events.

import "server-only"
import { db } from "@/lib/db"
import { notifications } from "@mlabs/db/schema"
import type { NotificationBody } from "../types"

interface CreateNotificationArgs {
  userId: string
  body: NotificationBody
}

export async function createNotification(
  args: CreateNotificationArgs,
): Promise<{ id: string }> {
  // type column mirrors body.kind for cheap SQL-side filtering — keep them
  // in lockstep here so no caller can drift.
  const [row] = await db
    .insert(notifications)
    .values({
      user_id: args.userId,
      type: args.body.kind,
      body: args.body,
    })
    .returning({ id: notifications.id })

  if (!row) {
    throw new Error("createNotification: insert returned no row")
  }
  return { id: row.id }
}
