// Server-side auth helpers for use in Server Components, Server Actions, and
// route handlers. Never import this from client code.

import "server-only"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { auth } from "./index"
import { extractBearerToken, verifyAccessToken } from "./jwt"

// Re-exported session shape so callers don't need to know whether the session
// came from a cookie, a Better Auth bearer (session token), or a stateless JWT.
export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

/**
 * Returns the current session + user, or null if unauthenticated.
 *
 * Phase 5.5 — three accepted transports, tried in order:
 *   1. JWT access token (Authorization: Bearer <jwt>) — stateless verify, no DB hit.
 *   2. Bearer session token (Authorization: Bearer <session-token>) — handled
 *      by better-auth's bearer plugin (single DB query).
 *   3. Session cookie — web's existing path (single DB query).
 *
 * The bearer plugin already merges path 2 into auth.api.getSession(), so this
 * function only needs to handle path 1 explicitly and then fall through.
 */
export async function getSession() {
  const h = await headers()
  return getSessionFromHeaders(h)
}

/**
 * Same three-transport resolution as getSession() but takes an explicit
 * Headers object instead of reading from next/headers. Used by the
 * @mlabs/api operation adapter which passes Request.headers in directly.
 */
export async function getSessionFromHeaders(
  h: Headers,
): Promise<AuthSession | null> {
  // Path 1: JWT bearer (mobile's primary credential).
  const bearer = extractBearerToken(h.get("authorization"))
  if (bearer) {
    const payload = await verifyAccessToken(bearer)
    if (payload) {
      // Synthesize a minimal session shape. Callers that need full session data
      // (e.g., session.expiresAt, last-seen IP) should hit the refresh endpoint
      // path which uses the underlying Better Auth session.
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        },
        session: {
          // JWT carries no session-row identifier; callers shouldn't rely on
          // these fields when authed via JWT.
          token: bearer,
          userId: payload.sub,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(),
        },
      } as unknown as AuthSession
      // If verification failed (expired/invalid), fall through to better-auth
      // which will return null for an unknown bearer token. Mobile sees 401,
      // hits /api/auth/refresh with the long-lived session token, gets a new JWT.
    }
  }

  // Paths 2 + 3: Better Auth bearer-plugin or cookie.
  return auth.api.getSession({ headers: h })
}

/**
 * Server-component helper: enforces auth, returns the user, or redirects
 * to /login. Use in Server Components or Server Actions inside (app)/* routes.
 */
export async function requireUser() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }
  return session.user
}

/**
 * Phase 5.5: REST-friendly variant of requireUser.
 *
 * Returns either the user OR a 401 NextResponse — never throws redirect().
 * Use this in /api/* route handlers that mobile reaches (mobile can't follow
 * 307 redirects to /login; it expects 401 JSON in the locked ApiErrorResponse
 * shape).
 *
 * Usage:
 *   const auth = await requireUserJSON()
 *   if (auth instanceof Response) return auth   // 401
 *   const user = auth                            // narrowed
 */
export async function requireUserJSON(): Promise<
  AuthSession["user"] | Response
> {
  const session = await getSession()
  if (!session?.user) {
    const { apiError } = await import("@/lib/schemas/api-error")
    return apiError(401, "auth.unauthenticated", "Sign in required")
  }
  return session.user
}

/**
 * Server-component helper: enforces auth + admin role.
 *
 * Non-admin authenticated users get notFound() — same response as any
 * nonexistent route, no enumeration of /admin/* existence (locked
 * decision in /plan-eng-review for W8).
 *
 * Reads `role` directly from the session-cached user object, populated by
 * Better Auth's additionalFields wiring in auth/index.ts. No extra DB
 * query per admin request.
 */
export async function requireAdmin() {
  const user = await requireUser()
  // role is set as a Better Auth additionalField with input: false; the
  // session shape extends it implicitly. We narrow the type here.
  const role = (user as { role?: string }).role ?? "user"
  if (role !== "admin") {
    notFound()
  }
  return user
}
