// /notifications — full inbox. Server-rendered (latest 50). The bell handles
// the polling side; this page is a snapshot at request time, refreshed when
// the user marks rows read (revalidatePath in the actions).

import { requireUser } from "@/lib/auth/server"
import { listInbox } from "@/features/notifications/server/queries"
import { NotificationList } from "@/features/notifications"

export const metadata = { title: "Notifications" }
export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const me = await requireUser()
  const rows = await listInbox(me.id)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent activity — newest first.
        </p>
      </header>
      <NotificationList rows={rows} />
    </div>
  )
}
