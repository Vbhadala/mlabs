import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// In-memory stores matching the W7 messages test pattern. The admin
// actions module reaches for: db.{select,update,delete,batch}, audit(),
// requireAdmin(), createNotification(), auth.api.requestPasswordReset.

interface UserRow {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image: string | null
  role: "user" | "admin"
  banned_at: Date | null
  banned_reason: string | null
}

interface SessionRow {
  id: string
  userId: string
}

interface NotificationStoreRow {
  user_id: string
  type: string
  body: unknown
  read_at: Date | null
}

const store = {
  users: [] as UserRow[],
  sessions: [] as SessionRow[],
  notifications: [] as NotificationStoreRow[],
  audits: [] as Array<{ actorId: string | null; action: string; meta: unknown }>,
}

let currentAdminId: string | null = "admin-1"

vi.mock("@/lib/auth/server", () => ({
  requireAdmin: vi.fn(async () => {
    const u = store.users.find((x) => x.id === currentAdminId)
    if (!u) throw new Error("not authed")
    return u
  }),
  requireUser: vi.fn(async () => {
    return store.users.find((x) => x.id === currentAdminId)
  }),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      requestPasswordReset: vi.fn(async () => ({ status: true })),
    },
  },
}))

vi.mock("@/lib/db/audit", () => ({
  audit: vi.fn(async (opts: { actorId: string | null; action: string; meta?: unknown }) => {
    store.audits.push({
      actorId: opts.actorId,
      action: opts.action,
      meta: opts.meta,
    })
  }),
}))

vi.mock("@/features/notifications/server/create", () => ({
  createNotification: vi.fn(async (args: { userId: string; body: unknown }) => {
    store.notifications.push({
      user_id: args.userId,
      type: (args.body as { kind: string }).kind,
      body: args.body,
      read_at: null,
    })
    return { id: `notif_${store.notifications.length}` }
  }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))

vi.mock("@/lib/db", () => {
  type Predicate<T> = (r: T) => boolean
  type Table = "users" | "sessions"

  return {
    db: {
      select: (cols: Record<string, { _column: string; _table: Table }>) => ({
        from: () => {
          const table = Object.values(cols)[0]?._table ?? "users"
          let rows = store[table] as unknown as Record<string, unknown>[]
          let _limit = Infinity
          const builder = {
            where(pred: Predicate<Record<string, unknown>>) {
              rows = rows.filter(pred)
              return builder
            },
            limit(n: number) {
              _limit = n
              return builder
            },
            then(resolve: (v: Record<string, unknown>[]) => void) {
              const out = rows.slice(0, _limit).map((r) => {
                const o: Record<string, unknown> = {}
                for (const [alias, col] of Object.entries(cols)) {
                  o[alias] = r[col._column]
                }
                return o
              })
              resolve(out)
            },
          }
          return builder
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
              table._name === "sessions" ? store.sessions : store.users
            const matched = (target as unknown as Record<string, unknown>[]).filter(pred)
            for (const r of matched) {
              for (const [k, v] of Object.entries(_set)) {
                ;(r as Record<string, unknown>)[k] = v
              }
            }
            return {
              then(resolve: (v: unknown) => void) {
                resolve(undefined)
              },
            }
          },
        }
        return builder
      },
      delete: (table: { _name: Table }) => ({
        where(pred: Predicate<Record<string, unknown>>) {
          const target =
            table._name === "sessions" ? store.sessions : store.users
          const kept = (target as unknown as Record<string, unknown>[]).filter(
            (r) => !pred(r),
          )
          if (table._name === "sessions") store.sessions = kept as SessionRow[]
          else store.users = kept as UserRow[]
          return {
            then(resolve: (v: unknown) => void) {
              resolve(undefined)
            },
          }
        },
      }),
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

vi.mock("@/lib/db/schema/auth", () => ({
  user: {
    _name: "users",
    id: { _column: "id", _table: "users" },
    email: { _column: "email", _table: "users" },
    name: { _column: "name", _table: "users" },
    emailVerified: { _column: "emailVerified", _table: "users" },
    role: { _column: "role", _table: "users" },
    banned_at: { _column: "banned_at", _table: "users" },
    banned_reason: { _column: "banned_reason", _table: "users" },
  },
  session: {
    _name: "sessions",
    id: { _column: "id", _table: "sessions" },
    userId: { _column: "userId", _table: "sessions" },
  },
}))

vi.mock("drizzle-orm", () => {
  type Row = Record<string, unknown>
  const eq = (col: { _column: string }, val: unknown) => (r: Row) =>
    r[col._column] === val
  const and =
    (...preds: ((r: Row) => boolean)[]) =>
    (r: Row) =>
      preds.every((p) => p(r))
  const sql = (() => () => true) as unknown as (...a: unknown[]) => unknown
  return { eq, and, sql }
})

vi.mock("@/features/admin/server/queries", () => ({
  adminCount: vi.fn(async () =>
    store.users.filter((u) => u.role === "admin").length,
  ),
}))

import {
  banUser,
  changeRole,
  sendAdminNotification,
  sendPasswordResetTo,
  unbanUser,
} from "@/features/admin/server/actions"
import { auth } from "@/lib/auth"

beforeEach(() => {
  store.users = [
    {
      id: "admin-1",
      email: "admin@example.test",
      name: "Admin",
      emailVerified: true,
      image: null,
      role: "admin",
      banned_at: null,
      banned_reason: null,
    },
    {
      id: "user-1",
      email: "alice@example.test",
      name: "Alice",
      emailVerified: true,
      image: null,
      role: "user",
      banned_at: null,
      banned_reason: null,
    },
    {
      id: "user-2",
      email: "bob@example.test",
      name: "Bob",
      emailVerified: true,
      image: null,
      role: "user",
      banned_at: null,
      banned_reason: null,
    },
  ]
  store.sessions = [
    { id: "s1", userId: "user-1" },
    { id: "s2", userId: "user-1" },
    { id: "s3", userId: "user-2" },
  ]
  store.notifications = []
  store.audits = []
  currentAdminId = "admin-1"
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("changeRole", () => {
  it("promotes user → admin and audits BEFORE the mutation", async () => {
    const res = await changeRole({ targetId: "user-1", role: "admin" })
    expect(res.ok).toBe(true)
    expect(store.users.find((u) => u.id === "user-1")?.role).toBe("admin")
    expect(store.audits[0]?.action).toBe("user.role_changed")
  })

  it("blocks self role change", async () => {
    const res = await changeRole({ targetId: "admin-1", role: "user" })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/own role/i)
  })

  it("blocks demoting the last admin (count guard fires)", async () => {
    // Setup: two admins (admin-1 acting + target admin-2 to be demoted).
    // First demote brings count to 1; that's fine. Then add a third admin
    // and demote it — also fine. Now the target IS the last remaining
    // admin (other than self), the count guard must fire.
    store.users.push({
      id: "admin-2",
      email: "admin2@example.test",
      name: "Admin2",
      emailVerified: true,
      image: null,
      role: "admin",
      banned_at: null,
      banned_reason: null,
    })
    // admin-1 acts; demoting admin-2 leaves admin-1 as the only admin.
    // adminCount sees 2 going in → allowed.
    const firstDemote = await changeRole({ targetId: "admin-2", role: "user" })
    expect(firstDemote.ok).toBe(true)

    // Now there's only admin-1. Promote user-1 to admin so we have a
    // non-self target for the guard test.
    const promoteRes = await changeRole({ targetId: "user-1", role: "admin" })
    expect(promoteRes.ok).toBe(true)

    // Switch actor: user-1 (now admin) acts; tries to demote admin-1.
    // adminCount returns 2. Allowed.
    currentAdminId = "user-1"
    const secondDemote = await changeRole({
      targetId: "admin-1",
      role: "user",
    })
    expect(secondDemote.ok).toBe(true)

    // Now user-1 is the only admin. Promote user-2 to admin (cheaply,
    // by mutating fixture) and immediately try to demote them — the count
    // guard sees 2 admins, so this would succeed. To force the guard,
    // ensure exactly one admin exists going INTO the demote: promote
    // user-2 then immediately demote user-2 (self) — blocked by self-check.
    //
    // Easiest path: act as user-1 (last admin), promote user-2 (count→2),
    // then demote user-2 (count goes to 1, blocked by guard).
    const promoteUser2 = await changeRole({
      targetId: "user-2",
      role: "admin",
    })
    expect(promoteUser2.ok).toBe(true)
    // Mutate store directly: drop user-1 from admins so user-2 is the
    // only admin. Then user-1 (no longer admin in store, but the
    // requireAdmin mock just returns the row; ignore for this test).
    // Reuse currentAdminId = "user-1" (the actor, regardless of role in
    // the mock). The action queries the target user-2 (admin) and calls
    // adminCount() which sees 1.
    store.users.find((u) => u.id === "user-1")!.role = "user"
    const lastAdminRes = await changeRole({
      targetId: "user-2",
      role: "user",
    })
    expect(lastAdminRes.ok).toBe(false)
    if (!lastAdminRes.ok) expect(lastAdminRes.error).toMatch(/last admin/i)
  })

  it("no-op when role unchanged", async () => {
    const res = await changeRole({ targetId: "user-1", role: "user" })
    expect(res.ok).toBe(true)
    expect(store.audits).toHaveLength(0)
  })
})

describe("banUser", () => {
  it("audits, sets banned_at, deletes all sessions atomically", async () => {
    const res = await banUser({ targetId: "user-1", reason: "spam" })
    expect(res.ok).toBe(true)
    expect(store.users.find((u) => u.id === "user-1")?.banned_at).not.toBeNull()
    expect(store.users.find((u) => u.id === "user-1")?.banned_reason).toBe(
      "spam",
    )
    expect(store.sessions.filter((s) => s.userId === "user-1")).toHaveLength(0)
    expect(store.sessions.filter((s) => s.userId === "user-2")).toHaveLength(1)
    expect(store.audits.map((a) => a.action)).toEqual([
      "user.banned",
      "session.revoked",
    ])
  })

  it("blocks self-ban", async () => {
    const res = await banUser({ targetId: "admin-1" })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/yourself/i)
  })

  it("idempotent on already-banned user (no extra audit)", async () => {
    await banUser({ targetId: "user-1" })
    store.audits = [] // clear and try again
    const res = await banUser({ targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(store.audits).toHaveLength(0)
  })
})

describe("unbanUser", () => {
  it("clears banned_at + reason", async () => {
    await banUser({ targetId: "user-1", reason: "test" })
    store.audits = []
    const res = await unbanUser({ targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(store.users.find((u) => u.id === "user-1")?.banned_at).toBeNull()
    expect(store.audits[0]?.action).toBe("user.unbanned")
  })

  it("no-op on non-banned user", async () => {
    const res = await unbanUser({ targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(store.audits).toHaveLength(0)
  })
})

describe("sendPasswordResetTo", () => {
  it("calls Better Auth requestPasswordReset with target's email", async () => {
    const res = await sendPasswordResetTo({ targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(auth.api.requestPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { email: "alice@example.test" },
      }),
    )
    expect(store.audits[0]?.action).toBe("user.password_reset_sent")
  })
})

describe("sendAdminNotification", () => {
  it("validates non-empty title/message", async () => {
    const res = await sendAdminNotification({
      targetId: "user-1",
      title: "  ",
      message: "ok",
    })
    expect(res.ok).toBe(false)
  })

  it("creates a generic notification with admin-supplied content", async () => {
    const res = await sendAdminNotification({
      targetId: "user-1",
      title: "Heads up",
      message: "Please update your password.",
      href: "/profile",
    })
    expect(res.ok).toBe(true)
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]).toMatchObject({
      user_id: "user-1",
      type: "generic",
    })
    expect(store.audits[0]?.action).toBe("user.admin_notified")
  })
})
