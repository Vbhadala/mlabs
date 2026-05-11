// Server-side auth helpers for use in Server Components, Server Actions, and
// route handlers. Never import this from client code.

import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
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
 * (Role lookup will land in a follow-up; for now any authed user passes
 * unless we add a role column.)
 */
export async function requireAdmin() {
  const user = await requireUser()
  // TODO: when admin role lands (W8), enforce here:
  //   if (user.role !== "admin") redirect("/")
  return user
}
