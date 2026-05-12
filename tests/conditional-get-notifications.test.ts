// @vitest-environment node
//
// Conditional GET (A5) on /api/notifications/unread-count.
//
// The route reads users.notifications_updated_at and compares it to the
// caller's If-Modified-Since header (second precision). Three states under
// test:
//   1. 304 — server timestamp <= header → no body, short-circuits the count.
//   2. 200 — server timestamp > header (new notification) → full body.
//   3. cache miss — no header → unconditional 200 (regression for v1 web).

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}))

// Session: always authenticated.
vi.mock("@/lib/auth/server", () => ({
  getSession: vi.fn(async () => ({
    user: { id: "u_1", email: "u@x.com" },
    session: { token: "t", userId: "u_1", expiresAt: new Date() },
  })),
}))

const tsHolder: { value: Date | null } = { value: null }
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ ts: tsHolder.value }]),
        }),
      }),
    }),
  },
}))
vi.mock("@/lib/db/schema/auth", () => ({
  user: { id: { _column: "id" }, notifications_updated_at: { _column: "ts" } },
}))
vi.mock("drizzle-orm", () => ({ eq: () => true }))

const mockUnreadCount = vi.fn()
vi.mock("@/features/notifications/server/queries", () => ({
  unreadCount: (...args: unknown[]) => mockUnreadCount(...args),
}))

import { GET } from "@/app/api/notifications/unread-count/route"

const mkRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/notifications/unread-count", {
    method: "GET",
    headers,
  })

beforeEach(() => {
  mockUnreadCount.mockReset()
  tsHolder.value = null
})

describe("GET /api/notifications/unread-count — conditional GET", () => {
  it("304 when server timestamp <= If-Modified-Since (no count query run)", async () => {
    const ts = new Date("2025-01-01T12:00:00Z")
    tsHolder.value = ts

    const res = await GET(
      mkRequest({ "if-modified-since": ts.toUTCString() }),
    )
    expect(res.status).toBe(304)
    expect(res.headers.get("Last-Modified")).toBe(ts.toUTCString())
    // Critical: the database is NOT consulted for the count when we short-
    // circuit. That's the whole point of the conditional GET (P1 / A5).
    expect(mockUnreadCount).not.toHaveBeenCalled()
  })

  it("200 with body when server timestamp is newer than If-Modified-Since", async () => {
    const ts = new Date("2025-01-01T12:00:30Z")
    tsHolder.value = ts
    mockUnreadCount.mockResolvedValue(4)

    const res = await GET(
      mkRequest({
        "if-modified-since": new Date("2025-01-01T12:00:00Z").toUTCString(),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(4)
    expect(res.headers.get("Last-Modified")).toBe(ts.toUTCString())
    expect(mockUnreadCount).toHaveBeenCalledWith("u_1")
  })

  it("200 unconditional when no If-Modified-Since header (cache miss / first poll)", async () => {
    const ts = new Date("2025-02-01T00:00:00Z")
    tsHolder.value = ts
    mockUnreadCount.mockResolvedValue(0)

    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(0)
    // Last-Modified is still emitted so the *next* poll can branch on it.
    expect(res.headers.get("Last-Modified")).toBe(ts.toUTCString())
  })

  it("200 when the header is unparseable (treat as missing, don't crash)", async () => {
    tsHolder.value = new Date("2025-02-01T00:00:00Z")
    mockUnreadCount.mockResolvedValue(2)

    const res = await GET(mkRequest({ "if-modified-since": "not-a-date" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(2)
  })
})
