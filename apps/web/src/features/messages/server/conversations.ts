// Conversation server module — open/create/list + the participant predicate.
//
// 1:1 dedup: a `pair_key` of sorted([meId, otherId]).join("::") with a UNIQUE
// constraint means INSERT ... ON CONFLICT DO NOTHING is race-safe. Two
// concurrent "open DM" requests can both miss the SELECT, both INSERT, and
// Postgres will accept exactly one — the other gets the existing row when we
// re-SELECT by pair_key.
//
// Participant check returns "not_found" — same response shape for "wrong
// conversation id" and "I'm not in it" so an attacker probing IDs sees no
// difference (no enumeration).

import "server-only"
import { and, desc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  user as userTable,
  conversations,
  conversation_participants,
  messages,
} from "@mlabs/db/schema"
import { MessagesError } from "./errors"
import type { ConversationListItem } from "../types"

/** Sorted-id pair_key for 1:1 conversations. */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::")
}

export async function openOrCreate1to1(args: {
  meId: string
  otherEmail: string
}): Promise<{ id: string }> {
  const targetEmail = args.otherEmail.trim().toLowerCase()

  // Resolve the other user. Verified accounts only — anonymized users
  // (W5 deleteAccount sets emailVerified=false) and unverified signups
  // are not DM-able. Generic "user_not_found" on either branch — no
  // enumeration of which case applied.
  const [other] = await db
    .select({
      id: userTable.id,
      emailVerified: userTable.emailVerified,
    })
    .from(userTable)
    .where(eq(userTable.email, targetEmail))
    .limit(1)
  if (!other || !other.emailVerified) {
    throw new MessagesError("user_not_found", "User not found.")
  }
  if (other.id === args.meId) {
    throw new MessagesError("self_dm", "You cannot DM yourself.")
  }

  const key = pairKey(args.meId, other.id)

  // Race-safe upsert: INSERT ... ON CONFLICT DO NOTHING returns the new row
  // when we won the race, or no row when we lost. Either way, the row exists
  // after this — fetch it by pair_key.
  const inserted = await db
    .insert(conversations)
    .values({ pair_key: key })
    .onConflictDoNothing({ target: conversations.pair_key })
    .returning({ id: conversations.id })

  let convId: string
  if (inserted.length > 0) {
    convId = inserted[0]!.id
    // Insert both participant rows. The unique PK on (conversation_id,
    // user_id) prevents accidental duplicate joins.
    await db
      .insert(conversation_participants)
      .values([
        { conversation_id: convId, user_id: args.meId },
        { conversation_id: convId, user_id: other.id },
      ])
      .onConflictDoNothing()
  } else {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.pair_key, key))
      .limit(1)
    if (!existing) {
      // Conflict but couldn't find the row — impossible under normal
      // operation but we surface it as a generic not_found to keep the
      // caller's contract simple.
      throw new MessagesError("not_found", "Conversation not available.")
    }
    convId = existing.id
  }

  return { id: convId }
}

export async function requireParticipant(args: {
  conversationId: string
  userId: string
}): Promise<void> {
  const [row] = await db
    .select({ user_id: conversation_participants.user_id })
    .from(conversation_participants)
    .where(
      and(
        eq(conversation_participants.conversation_id, args.conversationId),
        eq(conversation_participants.user_id, args.userId),
      ),
    )
    .limit(1)
  if (!row) {
    throw new MessagesError("not_found", "Conversation not found.")
  }
}

/** Inbox listing for a user. Single query with an aggregated unread-count
 *  subselect so the inbox poll is one round-trip, not N+1. Ordered by
 *  last_message_at DESC (nulls last → brand-new convos with no messages
 *  appear after active ones). */
export async function listForUser(
  userId: string,
): Promise<ConversationListItem[]> {
  // Aliases for the join: my participant row, the other user's participant row.
  // We use SQL aliases (not Drizzle's `alias` helper) inside a raw subselect
  // to keep this readable.
  const rows = await db
    .select({
      id: conversations.id,
      last_message_at: conversations.last_message_at,
      last_message_preview: conversations.last_message_preview,
      my_last_read_at: conversation_participants.last_read_at,
      // Other user's id + name + image, sourced via correlated subquery so
      // group conversations (v2) just pick the first non-self participant.
      other_id: sql<string>`(
        SELECT cp.user_id FROM ${conversation_participants} AS cp
        WHERE cp.conversation_id = ${conversations.id}
          AND cp.user_id <> ${userId}
        LIMIT 1
      )`.as("other_id"),
      other_name: sql<string>`(
        SELECT u.name FROM ${conversation_participants} AS cp
        JOIN ${userTable} AS u ON u.id = cp.user_id
        WHERE cp.conversation_id = ${conversations.id}
          AND cp.user_id <> ${userId}
        LIMIT 1
      )`.as("other_name"),
      other_image: sql<string | null>`(
        SELECT u.image FROM ${conversation_participants} AS cp
        JOIN ${userTable} AS u ON u.id = cp.user_id
        WHERE cp.conversation_id = ${conversations.id}
          AND cp.user_id <> ${userId}
        LIMIT 1
      )`.as("other_image"),
      // Count of messages from someone else, after my last_read_at.
      unread_count: sql<number>`(
        SELECT COUNT(*)::int FROM ${messages} AS m
        WHERE m.conversation_id = ${conversations.id}
          AND m.sender_id <> ${userId}
          AND (
            ${conversation_participants.last_read_at} IS NULL
            OR m.created_at > ${conversation_participants.last_read_at}
          )
      )`.as("unread_count"),
    })
    .from(conversations)
    .innerJoin(
      conversation_participants,
      and(
        eq(conversation_participants.conversation_id, conversations.id),
        eq(conversation_participants.user_id, userId),
      ),
    )
    .orderBy(desc(conversations.last_message_at))
    .limit(50)

  return rows.map((r) => ({
    id: r.id,
    other_user: {
      id: r.other_id ?? "",
      name: r.other_name ?? "Deleted user",
      image: r.other_image ?? null,
    },
    last_message_preview: r.last_message_preview,
    last_message_at: r.last_message_at
      ? new Date(r.last_message_at).toISOString()
      : null,
    unread_count: r.unread_count ?? 0,
  }))
}

/** Used by the thread page to render the header without re-loading the
 *  whole inbox. Returns just the other user's name + image. */
export async function getOtherParticipant(args: {
  conversationId: string
  meId: string
}): Promise<{ id: string; name: string; image: string | null } | null> {
  const [row] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      image: userTable.image,
    })
    .from(conversation_participants)
    .innerJoin(userTable, eq(userTable.id, conversation_participants.user_id))
    .where(
      and(
        eq(conversation_participants.conversation_id, args.conversationId),
        ne(conversation_participants.user_id, args.meId),
      ),
    )
    .limit(1)
  return row ?? null
}
