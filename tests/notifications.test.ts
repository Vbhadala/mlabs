import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Minimal in-memory store that mimics the Drizzle ops these modules call.
// Goal: exercise authz + state transitions without booting Neon.
interface Row {
  id: string
  user_id: string
  type: string
  body: { kind: "generic"; title: string; message: string; href?: string }
  read_at: Date | null
  created_at: Date
}

const store: { rows: Row[] } = { rows: [] }

// Hoisted helper used by the db mock — defined inside vi.mock to avoid TDZ.
vi.mock("@/lib/db", () => {
  // The mock implements just enough of Drizzle's fluent surface that
  // create.ts, queries.ts, and actions.ts work unchanged.
  type Predicate = (r: Row) => boolean

  return {
    db: {
      insert: () => ({
        values: (v: Partial<Row>) => ({
          returning: () => {
            const row: Row = {
              id: `n_${store.rows.length + 1}`,
              user_id: v.user_id!,
              type: v.type!,
              body: v.body!,
              read_at: null,
              created_at: new Date(),
            }
            store.rows.push(row)
            return [{ id: row.id }]
          },
        }),
      }),
      select: (cols?: Record<string, unknown>) => ({
        from: () => ({
          where: (pred: Predicate) => ({
            orderBy: () => ({
              limit: (n: number) => store.rows.filter(pred).slice(0, n),
            }),
            // unreadCount path: select(count).from().where()
            then: undefined,
            [Symbol.iterator]: undefined,
            // The query is awaited directly without orderBy when counting.
            // We expose the result by making the where(...) call thenable.
          }),
        }),
        // Fallback: keep TS happy. Real path uses where().
        _cols: cols,
      }),
      update: () => {
        let _set: Partial<Row> | null = null
        const builder = {
          set(values: Partial<Row>) {
            _set = values
            return builder
          },
          where(pred: Predicate) {
            const matched = store.rows.filter(pred)
            matched.forEach((r) => Object.assign(r, _set))
            return {
              returning: () => matched.map((r) => ({ id: r.id })),
            }
          },
        }
        return builder
      },
    },
  }
})

// Auth mock — controls which user a server action thinks it is.
let currentUserId = "user-A"
vi.mock("@/lib/auth/server", () => ({
  requireUser: vi.fn(async () => ({
    id: currentUserId,
    email: `${currentUserId}@example.test`,
    name: currentUserId,
    emailVerified: true,
    image: null,
  })),
  getSession: vi.fn(async () => ({
    user: {
      id: currentUserId,
      email: `${currentUserId}@example.test`,
      name: currentUserId,
      emailVerified: true,
      image: null,
    },
  })),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// drizzle-orm's helpers — we just want predicates that the mock db can use.
vi.mock("drizzle-orm", () => {
  const isNull = (col: { _column: string }) => (r: Row) =>
    r[col._column as keyof Row] === null
  const eq = (col: { _column: string }, val: unknown) => (r: Row) =>
    (r[col._column as keyof Row] as unknown) === val
  const and =
    (...preds: ((r: Row) => boolean)[]) =>
    (r: Row) =>
      preds.every((p) => p(r))
  const desc = (col: { _column: string }) => col
  const sql = (() => undefined) as unknown
  return { isNull, eq, and, desc, sql }
})

// The schema export — we hand back column markers the predicates can read.
vi.mock("@/lib/db/schema/notifications", () => ({
  notifications: {
    id: { _column: "id" },
    user_id: { _column: "user_id" },
    type: { _column: "type" },
    body: { _column: "body" },
    read_at: { _column: "read_at" },
    created_at: { _column: "created_at" },
  },
}))

import { createNotification } from "@/features/notifications/server/create"
import { markRead, markAllRead } from "@/features/notifications/server/actions"

beforeEach(() => {
  store.rows = []
  currentUserId = "user-A"
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createNotification", () => {
  it("persists a row with read_at=null and the typed body", async () => {
    const { id } = await createNotification({
      userId: "user-A",
      body: { kind: "generic", title: "Hi", message: "There" },
    })

    expect(id).toBeTruthy()
    expect(store.rows).toHaveLength(1)
    const row = store.rows[0]!
    expect(row.user_id).toBe("user-A")
    expect(row.type).toBe("generic")
    expect(row.body).toEqual({ kind: "generic", title: "Hi", message: "There" })
    expect(row.read_at).toBeNull()
  })
})

describe("markRead authz", () => {
  it("user A cannot mark user B's notification read (changed=0, no leak)", async () => {
    // Seed B's notification
    currentUserId = "user-B"
    const { id: bsId } = await createNotification({
      userId: "user-B",
      body: { kind: "generic", title: "B", message: "B-only" },
    })

    // Switch to A and try
    currentUserId = "user-A"
    const result = await markRead(bsId)

    expect(result).toEqual({ ok: true, changed: 0 })
    const target = store.rows.find((r) => r.id === bsId)
    expect(target?.read_at).toBeNull() // unchanged
  })

  it("marks own unread notification read", async () => {
    const { id } = await createNotification({
      userId: "user-A",
      body: { kind: "generic", title: "A", message: "A-own" },
    })

    const result = await markRead(id)
    expect(result.changed).toBe(1)
    expect(store.rows.find((r) => r.id === id)?.read_at).toBeInstanceOf(Date)
  })

  it("already-read notification reports changed=0", async () => {
    const { id } = await createNotification({
      userId: "user-A",
      body: { kind: "generic", title: "A", message: "A-own" },
    })
    await markRead(id)

    const second = await markRead(id)
    expect(second.changed).toBe(0)
  })

  it("nonexistent id reports changed=0 (no enumeration signal)", async () => {
    const result = await markRead("n_does_not_exist")
    expect(result).toEqual({ ok: true, changed: 0 })
  })
})

describe("markAllRead", () => {
  it("marks only the current user's unread", async () => {
    // Two for A (one unread, one read), one unread for B
    const { id: a1 } = await createNotification({
      userId: "user-A",
      body: { kind: "generic", title: "a1", message: "" },
    })
    const { id: a2 } = await createNotification({
      userId: "user-A",
      body: { kind: "generic", title: "a2", message: "" },
    })
    // Pre-mark a1 read directly
    store.rows.find((r) => r.id === a1)!.read_at = new Date()

    currentUserId = "user-B"
    const { id: b1 } = await createNotification({
      userId: "user-B",
      body: { kind: "generic", title: "b1", message: "" },
    })

    currentUserId = "user-A"
    const result = await markAllRead()
    // Only a2 was unread for A
    expect(result.changed).toBe(1)
    expect(store.rows.find((r) => r.id === a2)?.read_at).toBeInstanceOf(Date)
    expect(store.rows.find((r) => r.id === b1)?.read_at).toBeNull()
  })
})
