import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// In-memory stores. Mock just enough Drizzle surface to let the server
// modules run unmodified. Pattern mirrors tests/notifications.test.ts.

interface UserRow {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image: string | null
}

interface ConversationRow {
  id: string
  pair_key: string | null
  last_message_at: Date | null
  last_message_preview: string | null
  created_at: Date
}

interface ParticipantRow {
  conversation_id: string
  user_id: string
  joined_at: Date
  last_read_at: Date | null
}

interface MessageStoreRow {
  id: string
  conversation_id: string
  sender_id: string | null
  body: string
  created_at: Date
}

interface NotificationStoreRow {
  id: string
  user_id: string
  type: string
  body: unknown
  read_at: Date | null
  created_at: Date
}

const store = {
  users: [] as UserRow[],
  conversations: [] as ConversationRow[],
  participants: [] as ParticipantRow[],
  messages: [] as MessageStoreRow[],
  notifications: [] as NotificationStoreRow[],
}

let nextConvId = 1
let nextMsgId = 1
let nextNotifId = 1

vi.mock("@/lib/db", () => {
  type Predicate<T> = (r: T) => boolean
  type Table = "users" | "conversations" | "participants" | "messages" | "notifications"

  // Build a `select()...from()...where()...orderBy()...limit()` chain that
  // resolves to rows. Each step returns a thenable so `await` works at any
  // point in the chain — matches Drizzle's query-builder ergonomics.
  function selectFrom(cols: Record<string, { _column: string; _table: Table }>) {
    return {
      from: () => {
        const table = Object.values(cols)[0]?._table ?? "users"
        let rows = store[table] as unknown as Record<string, unknown>[]
        let _limit = Infinity
        let _orderBy: ((a: Record<string, unknown>, b: Record<string, unknown>) => number) | null = null

        function project(r: Record<string, unknown>): Record<string, unknown> {
          const out: Record<string, unknown> = {}
          for (const [alias, col] of Object.entries(cols)) {
            out[alias] = r[col._column]
          }
          return out
        }

        const builder = {
          where(pred: Predicate<Record<string, unknown>>) {
            rows = rows.filter(pred)
            return builder
          },
          innerJoin() {
            return builder
          },
          leftJoin() {
            return builder
          },
          orderBy(...args: unknown[]) {
            void args
            _orderBy = (a, b) => {
              // Default: order by last_message_at desc when present
              const aTime = (a.last_message_at as Date | null)?.getTime() ?? 0
              const bTime = (b.last_message_at as Date | null)?.getTime() ?? 0
              return bTime - aTime
            }
            return builder
          },
          limit(n: number) {
            _limit = n
            return builder
          },
          then(resolve: (v: Record<string, unknown>[]) => void) {
            let out = [...rows]
            if (_orderBy) out.sort(_orderBy)
            out = out.slice(0, _limit)
            resolve(out.map(project))
          },
        }
        return builder
      },
    }
  }

  return {
    db: {
      select: (cols: Record<string, { _column: string; _table: Table }>) =>
        selectFrom(cols),
      insert: (table: { _name: Table }) => ({
        values: (v: Record<string, unknown> | Record<string, unknown>[]) => {
          const rows = Array.isArray(v) ? v : [v]
          const inserted: Record<string, unknown>[] = []
          for (const row of rows) {
            if (table._name === "conversations") {
              if (
                row.pair_key &&
                store.conversations.some((c) => c.pair_key === row.pair_key)
              ) {
                continue // ON CONFLICT DO NOTHING
              }
              const next: ConversationRow = {
                id: `conv_${nextConvId++}`,
                pair_key: (row.pair_key as string | null) ?? null,
                last_message_at: null,
                last_message_preview: null,
                created_at: new Date(),
              }
              store.conversations.push(next)
              inserted.push({ id: next.id })
            } else if (table._name === "participants") {
              const next: ParticipantRow = {
                conversation_id: row.conversation_id as string,
                user_id: row.user_id as string,
                joined_at: new Date(),
                last_read_at: null,
              }
              if (
                !store.participants.some(
                  (p) =>
                    p.conversation_id === next.conversation_id &&
                    p.user_id === next.user_id,
                )
              ) {
                store.participants.push(next)
              }
            } else if (table._name === "messages") {
              const next: MessageStoreRow = {
                id: `msg_${nextMsgId++}`,
                conversation_id: row.conversation_id as string,
                sender_id: (row.sender_id as string) ?? null,
                body: row.body as string,
                created_at: new Date(),
              }
              store.messages.push(next)
              inserted.push({
                id: next.id,
                conversation_id: next.conversation_id,
                sender_id: next.sender_id,
                body: next.body,
                created_at: next.created_at,
              })
            } else if (table._name === "notifications") {
              const next: NotificationStoreRow = {
                id: `notif_${nextNotifId++}`,
                user_id: row.user_id as string,
                type: row.type as string,
                body: row.body,
                read_at: null,
                created_at: new Date(),
              }
              store.notifications.push(next)
              inserted.push({ id: next.id })
            }
          }
          // returning() yields the rows; awaiting the chain itself yields nothing.
          // Both code shapes (await db.insert().values().returning() and
          // db.batch([db.insert().values().returning(), ...])) need a thenable
          // that resolves to the inserted array. So returning() returns a
          // thenable. The outer chain (no .returning() call) also stays
          // awaitable for "fire and forget" inserts.
          const returningChain = {
            then(resolve: (v: unknown) => void) {
              resolve(inserted)
            },
          }
          const chain = {
            onConflictDoNothing: () => ({
              ...chain,
              returning: () => returningChain,
            }),
            returning: () => returningChain,
            then(resolve: (v: unknown) => void) {
              resolve(undefined)
            },
          }
          return chain
        },
      }),
      update: (table: { _name: Table }) => {
        let _set: Record<string, unknown> = {}
        const builder = {
          set(v: Record<string, unknown>) {
            _set = v
            return builder
          },
          where(pred: Predicate<Record<string, unknown>>) {
            const target =
              table._name === "conversations"
                ? store.conversations
                : table._name === "participants"
                  ? store.participants
                  : table._name === "notifications"
                    ? store.notifications
                    : store.messages
            const matched = (target as unknown as Record<string, unknown>[]).filter(pred)
            for (const r of matched) {
              for (const [k, v] of Object.entries(_set)) {
                ;(r as Record<string, unknown>)[k] = v
              }
            }
            return {
              returning: () => matched.map((r) => ({ id: r.id })),
              then(resolve: (v: unknown) => void) {
                resolve(undefined)
              },
            }
          },
        }
        return builder
      },
      // Batch runs each builder in order, returns array of results. Each
      // entry is the resolved value from awaiting that builder.
      batch: async (builders: Array<{ then: (r: (v: unknown) => void) => void }>) => {
        const results: unknown[] = []
        for (const b of builders) {
          results.push(await new Promise<unknown>((resolve) => b.then(resolve)))
        }
        return results
      },
    },
  }
})

// Stub schema columns. Each has a _column name + a _table marker so the
// db mock can route writes to the right in-memory store.
vi.mock("@mlabs/db/schema", () => ({
  user: {
    _name: "users",
    id: { _column: "id", _table: "users" },
    email: { _column: "email", _table: "users" },
    name: { _column: "name", _table: "users" },
    emailVerified: { _column: "emailVerified", _table: "users" },
    image: { _column: "image", _table: "users" },
  },
  conversations: {
    _name: "conversations",
    id: { _column: "id", _table: "conversations" },
    pair_key: { _column: "pair_key", _table: "conversations" },
    last_message_at: { _column: "last_message_at", _table: "conversations" },
    last_message_preview: {
      _column: "last_message_preview",
      _table: "conversations",
    },
  },
  conversation_participants: {
    _name: "participants",
    conversation_id: { _column: "conversation_id", _table: "participants" },
    user_id: { _column: "user_id", _table: "participants" },
    last_read_at: { _column: "last_read_at", _table: "participants" },
  },
  messages: {
    _name: "messages",
    id: { _column: "id", _table: "messages" },
    conversation_id: { _column: "conversation_id", _table: "messages" },
    sender_id: { _column: "sender_id", _table: "messages" },
    body: { _column: "body", _table: "messages" },
    created_at: { _column: "created_at", _table: "messages" },
  },
  notifications: {
    _name: "notifications",
    id: { _column: "id", _table: "notifications" },
    user_id: { _column: "user_id", _table: "notifications" },
    type: { _column: "type", _table: "notifications" },
    body: { _column: "body", _table: "notifications" },
    read_at: { _column: "read_at", _table: "notifications" },
    created_at: { _column: "created_at", _table: "notifications" },
  },
}))

// drizzle-orm helpers — return predicates the db mock can apply.
vi.mock("drizzle-orm", () => {
  type Row = Record<string, unknown>
  const eq = (col: { _column: string }, val: unknown) => (r: Row) =>
    r[col._column] === val
  const ne = (col: { _column: string }, val: unknown) => (r: Row) =>
    r[col._column] !== val
  const and =
    (...preds: ((r: Row) => boolean)[]) =>
    (r: Row) =>
      preds.every((p) => p(r))
  const or =
    (...preds: ((r: Row) => boolean)[]) =>
    (r: Row) =>
      preds.some((p) => p(r))
  const gt = (col: { _column: string }, val: unknown) => (r: Row) => {
    const a = r[col._column]
    if (a instanceof Date && val instanceof Date) return a.getTime() > val.getTime()
    return (a as number) > (val as number)
  }
  const isNull = (col: { _column: string }) => (r: Row) => r[col._column] === null
  const desc = (col: unknown) => col
  const asc = (col: unknown) => col
  // sql template literal: real Drizzle wraps in a SQL AST. Tests don't
  // interpret raw SQL, so return an always-true predicate — combined with
  // the other (typed) filters, the jsonb conversation_id check is
  // effectively narrowed by `type === "message"` + `user_id === me`.
  const sql = (() => () => true) as unknown as (...a: unknown[]) => unknown
  return { eq, ne, and, or, gt, isNull, desc, asc, sql }
})

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  openOrCreate1to1,
  requireParticipant,
} from "@/features/messages/server/conversations"
import {
  sendMessage,
  markConversationRead,
} from "@/features/messages/server/messages"
import { MessagesError } from "@/features/messages/server/errors"

beforeEach(() => {
  store.users = [
    { id: "user-A", email: "a@example.test", name: "Alice", emailVerified: true, image: null },
    { id: "user-B", email: "b@example.test", name: "Bob", emailVerified: true, image: null },
    { id: "user-C", email: "c@example.test", name: "Chip", emailVerified: false, image: null },
  ]
  store.conversations = []
  store.participants = []
  store.messages = []
  store.notifications = []
  nextConvId = 1
  nextMsgId = 1
  nextNotifId = 1
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("openOrCreate1to1", () => {
  it("creates a new conversation + 2 participant rows", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    expect(id).toBe("conv_1")
    expect(store.conversations).toHaveLength(1)
    expect(store.conversations[0]!.pair_key).toBe("user-A::user-B")
    expect(store.participants).toHaveLength(2)
  })

  it("reuses an existing 1:1 (race-safe via pair_key unique)", async () => {
    const a = await openOrCreate1to1({ meId: "user-A", otherEmail: "b@example.test" })
    const b = await openOrCreate1to1({ meId: "user-B", otherEmail: "a@example.test" })
    expect(a.id).toBe(b.id)
    expect(store.conversations).toHaveLength(1)
  })

  it("rejects DMs to unverified / anonymized users", async () => {
    await expect(
      openOrCreate1to1({ meId: "user-A", otherEmail: "c@example.test" }),
    ).rejects.toBeInstanceOf(MessagesError)
  })

  it("rejects DMs to unknown emails (same shape as unverified — no enumeration)", async () => {
    const errUnknown = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "ghost@example.test",
    }).catch((e) => e)
    const errUnverified = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "c@example.test",
    }).catch((e) => e)
    expect(errUnknown).toBeInstanceOf(MessagesError)
    expect(errUnverified).toBeInstanceOf(MessagesError)
    expect((errUnknown as MessagesError).code).toBe("user_not_found")
    expect((errUnverified as MessagesError).code).toBe("user_not_found")
  })

  it("rejects self-DM", async () => {
    const err = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "a@example.test",
    }).catch((e) => e)
    expect(err).toBeInstanceOf(MessagesError)
    expect((err as MessagesError).code).toBe("self_dm")
  })
})

describe("requireParticipant", () => {
  it("throws not_found for non-participant (404 → no enumeration)", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    const err = await requireParticipant({
      conversationId: id,
      userId: "user-C",
    }).catch((e) => e)
    expect(err).toBeInstanceOf(MessagesError)
    expect((err as MessagesError).code).toBe("not_found")
  })

  it("returns silently for actual participant", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    await expect(
      requireParticipant({ conversationId: id, userId: "user-A" }),
    ).resolves.toBeUndefined()
  })

  it("throws not_found for missing conversation id (same response shape)", async () => {
    const err = await requireParticipant({
      conversationId: "conv_does_not_exist",
      userId: "user-A",
    }).catch((e) => e)
    expect(err).toBeInstanceOf(MessagesError)
    expect((err as MessagesError).code).toBe("not_found")
  })
})

describe("sendMessage", () => {
  it("rejects empty / whitespace-only bodies", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    const err = await sendMessage({
      conversationId: id,
      senderId: "user-A",
      body: "   ",
    }).catch((e) => e)
    expect(err).toBeInstanceOf(MessagesError)
    expect((err as MessagesError).code).toBe("invalid_body")
  })

  it("rejects oversized bodies", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    const err = await sendMessage({
      conversationId: id,
      senderId: "user-A",
      body: "x".repeat(10_001),
    }).catch((e) => e)
    expect((err as MessagesError).code).toBe("invalid_body")
  })

  it("non-participant gets not_found (no leak of conv existence)", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    const err = await sendMessage({
      conversationId: id,
      senderId: "user-C",
      body: "hi",
    }).catch((e) => e)
    expect((err as MessagesError).code).toBe("not_found")
  })

  it("inserts the message, updates conversation preview, fans out a notification", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })

    const row = await sendMessage({
      conversationId: id,
      senderId: "user-A",
      body: "hello bob",
    })

    expect(row.body).toBe("hello bob")
    expect(store.messages).toHaveLength(1)
    expect(store.conversations[0]!.last_message_preview).toBe("hello bob")
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]!.user_id).toBe("user-B")
    expect(store.notifications[0]!.type).toBe("message")
  })

  it("truncates preview at 200 chars", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    const long = "x".repeat(300)
    await sendMessage({ conversationId: id, senderId: "user-A", body: long })
    expect(store.conversations[0]!.last_message_preview!.length).toBe(200)
  })
})

describe("markConversationRead", () => {
  it("updates participant.last_read_at AND clears message-kind notifications", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    await sendMessage({
      conversationId: id,
      senderId: "user-A",
      body: "ping",
    })
    expect(store.notifications.filter((n) => n.read_at === null)).toHaveLength(1)

    await markConversationRead({ conversationId: id, userId: "user-B" })

    const bsParticipant = store.participants.find(
      (p) => p.user_id === "user-B" && p.conversation_id === id,
    )
    expect(bsParticipant?.last_read_at).toBeInstanceOf(Date)
    expect(store.notifications.filter((n) => n.read_at === null)).toHaveLength(0)
  })

  it("non-participant gets not_found", async () => {
    const { id } = await openOrCreate1to1({
      meId: "user-A",
      otherEmail: "b@example.test",
    })
    const err = await markConversationRead({
      conversationId: id,
      userId: "user-C",
    }).catch((e) => e)
    expect((err as MessagesError).code).toBe("not_found")
  })
})
