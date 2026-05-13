// /messages — inbox. Server-renders the first page of conversations, then
// the client component polls every 10s for updates.

import { requireUser } from "@/lib/auth/server"
import { listForUser } from "@/features/messages/server/conversations"
import {
  ConversationsList,
  NewConversationForm,
} from "@/features/messages"

export const metadata = { title: "Messages" }
export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const me = await requireUser()
  const items = await listForUser(me.id)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct messages, newest first.
        </p>
      </header>
      <NewConversationForm />
      <ConversationsList initialItems={items} />
    </div>
  )
}
