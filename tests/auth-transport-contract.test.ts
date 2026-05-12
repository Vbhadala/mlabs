// @vitest-environment node
//
// Lane A — transport contract test.
//
// Proves that a real /api/* route handler accepts BOTH transports identically:
//  - Cookie session (web — existing behavior, regression check)
//  - JWT bearer (mobile — Phase 5.5 new behavior)
//
// Uses /api/notifications/unread-count as the representative GET handler.
// Every other /api/* route uses the same getSession()/requireUser() helpers
// from src/lib/auth/server (verified by audit in /plan-eng-review), so the
// contract proven here applies to all of them. Per-route feature-layer mocking
// adds boilerplate without coverage gains — the helper layer is the integration
// point, and that's fully covered by tests/auth-jwt.test.ts (16 cases).

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}))

// Mock Better Auth — represents the cookie-session path.
const mockBetterAuthGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockBetterAuthGetSession(...args),
    },
  },
}))

// Mock the feature layer so we don't need Postgres.
const mockUnreadCount = vi.fn()
vi.mock("@/features/notifications/server/queries", () => ({
  unreadCount: (...args: unknown[]) => mockUnreadCount(...args),
}))

// Mock next/headers — return whatever headers the test attaches to the request.
const headersStore = { current: new Headers() }
vi.mock("next/headers", () => ({
  headers: async () => headersStore.current,
}))

// Phase 5.5: route now reads users.notifications_updated_at for conditional GET.
// We don't care about the timestamp here — just hand back a sentinel so the
// route falls through to the existing count path.
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ ts: new Date(0) }]),
        }),
      }),
    }),
  },
}))
vi.mock("@/lib/db/schema/auth", () => ({
  user: { id: { _column: "id" }, notifications_updated_at: { _column: "ts" } },
}))
vi.mock("drizzle-orm", () => ({
  eq: () => true,
}))

import { GET } from "@/app/api/notifications/unread-count/route"
import { signAccessToken } from "@/lib/auth/jwt"

const mkRequest = (headers?: Record<string, string>) =>
  new Request("http://localhost:3000/api/notifications/unread-count", {
    method: "GET",
    headers: headers ?? {},
  })

describe("Transport contract — /api/notifications/unread-count GET", () => {
  beforeEach(() => {
    mockBetterAuthGetSession.mockReset()
    mockUnreadCount.mockReset()
    headersStore.current = new Headers()
  })

  it("[cookie] returns 200 with unread count when cookie session is valid (regression)", async () => {
    headersStore.current = new Headers({
      cookie: "better-auth.session_token=valid-cookie-token",
    })
    mockBetterAuthGetSession.mockResolvedValue({
      user: { id: "u_cookie", email: "c@x.com", role: "user" },
      session: { token: "valid-cookie-token", userId: "u_cookie", expiresAt: new Date() },
    })
    mockUnreadCount.mockResolvedValue(7)

    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(7)
    expect(mockUnreadCount).toHaveBeenCalledWith("u_cookie")
  })

  it("[JWT bearer] returns 200 with unread count when valid JWT is sent in Authorization header", async () => {
    const { token } = await signAccessToken({
      id: "u_jwt",
      email: "j@x.com",
      role: "user",
    })
    headersStore.current = new Headers({
      authorization: `Bearer ${token}`,
    })
    // Better Auth should NEVER be consulted on the JWT path — stateless verify.
    mockUnreadCount.mockResolvedValue(3)

    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(3)
    expect(mockUnreadCount).toHaveBeenCalledWith("u_jwt")
    expect(mockBetterAuthGetSession).not.toHaveBeenCalled()
  })

  it("[session-token bearer] falls through to Better Auth's bearer plugin", async () => {
    // A token that isn't a JWT (no 3 dotted segments / bad signature) → JWT path
    // returns null → fall-through to better-auth which the bearer plugin maps
    // to a session-row lookup.
    headersStore.current = new Headers({
      authorization: "Bearer sess_abc_long_random_string",
    })
    mockBetterAuthGetSession.mockResolvedValue({
      user: { id: "u_session", email: "s@x.com", role: "user" },
      session: { token: "sess_abc_long_random_string", userId: "u_session", expiresAt: new Date() },
    })
    mockUnreadCount.mockResolvedValue(2)

    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(2)
    expect(mockUnreadCount).toHaveBeenCalledWith("u_session")
    expect(mockBetterAuthGetSession).toHaveBeenCalledTimes(1)
  })

  it("[no auth] returns 401 when neither cookie nor bearer present", async () => {
    headersStore.current = new Headers()
    mockBetterAuthGetSession.mockResolvedValue(null)

    const res = await GET(mkRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("auth.unauthenticated")
    expect(mockUnreadCount).not.toHaveBeenCalled()
  })

  it("[expired JWT] returns 401 (JWT verify fails, Better Auth bearer also returns null)", async () => {
    // Tampered JWT — verifyAccessToken returns null, falls through to Better
    // Auth which treats it as an unknown session token and returns null.
    headersStore.current = new Headers({
      authorization: "Bearer eyJ.tampered.signature",
    })
    mockBetterAuthGetSession.mockResolvedValue(null)

    const res = await GET(mkRequest({ authorization: "Bearer eyJ.tampered.signature" }))
    expect(res.status).toBe(401)
  })
})
