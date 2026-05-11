// Server-side auth helpers for use in Server Components, Server Actions, and
// route handlers. Never import this from client code.

import "server-only"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { auth } from "./index"

/**
 * Returns the current session + user, or null if unauthenticated.
 * Cheap on every request (single DB query, indexed by token cookie).
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  })
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
