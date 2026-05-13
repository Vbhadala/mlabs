// /messages/[id] — thread. Auth + participant check happen server-side via
// listMessages → requireParticipant. On non-participant or missing convo,
// we 404 (notFound) — no enumeration.

import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth/server"
import { listMessages } from "@/features/messages/server/messages"
import { getOtherParticipant } from "@/features/messages/server/conversations"
import { MessagesError } from "@/features/messages/server/errors"
import { Thread } from "@/features/messages"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ThreadPage({ params }: PageProps) {
  const me = await requireUser()
  const { id: conversationId } = await params

  let initialMessages
  try {
    initialMessages = await listMessages({
      conversationId,
      userId: me.id,
      cursor: null,
    })
  } catch (err) {
    if (err instanceof MessagesError && err.code === "not_found") {
      notFound()
    }
    throw err
  }

  const otherUser = await getOtherParticipant({
    conversationId,
    meId: me.id,
  })

  return (
    <Thread
      conversationId={conversationId}
      meId={me.id}
      otherUser={otherUser}
      initialMessages={initialMessages}
    />
  )
}
