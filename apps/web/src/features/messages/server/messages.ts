// Message server module — list (cursor), send (denormalized + notification
// fan-out), markConversationRead (cascades to notifications).
//
// Send is the load-bearing path. Three writes:
//   1. INSERT into messages
//   2. UPDATE conversations SET last_message_at, last_message_preview
//   3. INSERT into notifications (for the other participant) — best-effort
//
// 1 + 2 are wrapped in a transaction so the inbox never shows a preview
// without a matching message (or vice versa). 3 runs outside the txn and
// catches its own error: if Neon hiccups while writing the notification,
// the message itself has already landed and the recipient's next inbox
// poll will pick it up. The bell badge is eventually consistent.

import "server-only"
import { and, asc, eq, gt, isNull, ne, or, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  user as userTable,
  conversations,
  conversation_participants,
  messages,
  notifications,
} from "@mlabs/db/schema"
import { createNotification } from "@/features/notifications/server/create"
import { logger } from "@/lib/logger"
import { requireParticipant } from "./conversations"
import { decodeCursor } from "./cursor"
import { MessagesError } from "./errors"
import { MAX_BODY_CHARS, type MessageRow } from "../types"

const PAGE_SIZE = 100

const bodySchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(MAX_BODY_CHARS, `Message too long (max ${MAX_BODY_CHARS} chars)`)

/**
 * Thread paging.
 *
 *   cursor = null → latest 50 messages, returned chronological asc
 *                   (server pulls DESC then reverses; ORDER BY uses the
 *                   composite index).
 *   cursor !== null → messages strictly after (created_at, id), capped at
 *                     PAGE_SIZE. Used by the 2s polling loop.
 */
export async function listMessages(args: {
  conversationId: string
  userId: string
  cursor: string | null
}): Promise<MessageRow[]> {
  await requireParticipant({
    conversationId: args.conversationId,
    userId: args.userId,
  })

  if (args.cursor) {
    const decoded = decodeCursor(args.cursor)
    if (!decoded) return [] // bad cursor → empty page, not a 400

    const rows = await db
      .select({
        id: messages.id,
        conversation_id: messages.conversation_id,
        sender_id: messages.sender_id,
        sender_name: userTable.name,
        body: messages.body,
        created_at: messages.created_at,
      })
      .from(messages)
      .leftJoin(userTable, eq(userTable.id, messages.sender_id))
      .where(
        and(
          eq(messages.conversation_id, args.conversationId),
          // Composite cursor: created_at strictly after, OR same created_at
          // but greater id. Handles same-millisecond inserts deterministically.
          or(
            gt(messages.created_at, new Date(decoded.created_at)),
            and(
              eq(messages.created_at, new Date(decoded.created_at)),
              gt(messages.id, decoded.id),
            ),
          ),
        ),
      )
      .orderBy(asc(messages.created_at), asc(messages.id))
      .limit(PAGE_SIZE)

    return rows.map(toMessageRow)
  }

  // Initial load — latest 50 messages newest-first, returned chronological.
  const latest = await db
    .select({
      id: messages.id,
      conversation_id: messages.conversation_id,
      sender_id: messages.sender_id,
      sender_name: userTable.name,
      body: messages.body,
      created_at: messages.created_at,
    })
    .from(messages)
    .leftJoin(userTable, eq(userTable.id, messages.sender_id))
    .where(eq(messages.conversation_id, args.conversationId))
    .orderBy(sql`${messages.created_at} DESC`, sql`${messages.id} DESC`)
    .limit(50)
  return latest.reverse().map(toMessageRow)
}

export async function sendMessage(args: {
  conversationId: string
  senderId: string
  body: string
}): Promise<MessageRow> {
  await requireParticipant({
    conversationId: args.conversationId,
    userId: args.senderId,
  })

  const parsed = bodySchema.safeParse(args.body)
  if (!parsed.success) {
    throw new MessagesError(
      "invalid_body",
      parsed.error.issues[0]?.message ?? "Invalid message",
    )
  }
  const body = parsed.data

  // Atomic insert + conversation timestamp update via db.batch — Neon's
  // HTTP driver doesn't support multi-statement transactions, but it does
  // support atomic batches over the same HTTP transaction endpoint. Either
  // both writes land or neither does, so the inbox preview never points to
  // a message that wasn't actually inserted.
  const preview = body.length > 200 ? body.slice(0, 200) : body

  const [insertedRows, _updated, senderRows] = await db.batch([
    db
      .insert(messages)
      .values({
        conversation_id: args.conversationId,
        sender_id: args.senderId,
        body,
      })
      .returning({
        id: messages.id,
        conversation_id: messages.conversation_id,
        sender_id: messages.sender_id,
        body: messages.body,
        created_at: messages.created_at,
      }),
    db
      .update(conversations)
      .set({
        last_message_at: sql`now()`,
        last_message_preview: preview,
      })
      .where(eq(conversations.id, args.conversationId)),
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, args.senderId))
      .limit(1),
  ])
  void _updated

  const row = insertedRows[0]
  if (!row) throw new Error("send: INSERT returned no row")
  const sender = senderRows[0]

  // Fan out to the OTHER participants as a notification row. Best-effort —
  // if this fails (notifications feature removed in a fork, or DB hiccup),
  // the message itself has already landed. Bell stays eventually-consistent.
  try {
    const others = await db
      .select({ user_id: conversation_participants.user_id })
      .from(conversation_participants)
      .where(
        and(
          eq(conversation_participants.conversation_id, args.conversationId),
          ne(conversation_participants.user_id, args.senderId),
        ),
      )

    await Promise.all(
      others.map(({ user_id }) =>
        createNotification({
          userId: user_id,
          body: {
            kind: "message",
            conversation_id: args.conversationId,
            sender_id: args.senderId,
            sender_name: sender?.name ?? "Someone",
            preview,
          },
        }),
      ),
    )
  } catch (err) {
    logger.warn("notification fan-out failed for message", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      message: String(err),
    })
  }

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_name: sender?.name ?? "You",
    body: row.body,
    created_at: new Date(row.created_at).toISOString(),
  }
}

/** Mark the conversation as read for `userId`:
 *  - Set participants.last_read_at = now (drops the inbox unread count to 0)
 *  - Mark every `kind: "message"` notification for this conversation as read
 *    (drops the bell badge for those rows). */
export async function markConversationRead(args: {
  conversationId: string
  userId: string
}): Promise<void> {
  await requireParticipant({
    conversationId: args.conversationId,
    userId: args.userId,
  })

  const now = new Date()

  await db
    .update(conversation_participants)
    .set({ last_read_at: now })
    .where(
      and(
        eq(conversation_participants.conversation_id, args.conversationId),
        eq(conversation_participants.user_id, args.userId),
      ),
    )

  // Cascade to notifications. Filter on the typed body's conversation_id —
  // jsonb path equality is well-supported in Postgres.
  await db
    .update(notifications)
    .set({ read_at: now })
    .where(
      and(
        eq(notifications.user_id, args.userId),
        eq(notifications.type, "message"),
        isNull(notifications.read_at),
        sql`${notifications.body}->>'conversation_id' = ${args.conversationId}`,
      ),
    )
}

function toMessageRow(row: {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_name: string | null
  body: string
  created_at: Date
}): MessageRow {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name ?? "Deleted user",
    body: row.body,
    created_at: row.created_at.toISOString(),
  }
}

