"use server"

// Dev-only seed action. Removed before v1 ship (see IMPLEMENTATION.md §7.5
// "delete src/app/_dev/").

import { requireUser } from "@/lib/auth/server"
import { createNotification } from "@/features/notifications/server/create"

export async function seedTestNotification() {
  const me = await requireUser()
  const stamp = new Date().toLocaleTimeString()
  await createNotification({
    userId: me.id,
    body: {
      kind: "generic",
      title: `Test notification at ${stamp}`,
      message:
        "This is a seeded notification for development. The bell should reflect it within 5 seconds.",
      href: "/notifications",
    },
  })
}
