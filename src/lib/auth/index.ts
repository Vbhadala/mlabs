// Better Auth singleton. Used by the API route handler at
// src/app/api/auth/[...all]/route.ts and by server helpers in ./server.ts.
//
// Email/password is enabled with email verification REQUIRED — users must click
// the verify link before login is allowed. Email send is inline (no jobs runner,
// per PLAN.md T9): if Postmark fails, the auth flow surfaces the error to the
// caller — UI shows a retry-able message.

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { bearer } from "better-auth/plugins/bearer"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema/auth"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import { sendPasswordResetEmail, sendVerifyEmail } from "@/lib/email"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // Phase 5.5: enable `Authorization: Bearer <session-token>` transport.
  // Mobile (Expo) cannot use cookies, so it sends the session token in the
  // Authorization header. Existing cookie behavior on web is unchanged.
  // The bearer plugin transparently converts the header into a synthetic
  // cookie before the rest of the auth pipeline runs.
  plugins: [bearer()],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      })
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerifyEmail({
        to: user.email,
        name: user.name,
        verifyUrl: url,
      })
    },
  },

  // Sessions live ~7 days, refresh on every request within the cookie's lifetime
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  user: {
    changeEmail: {
      enabled: true,
      // Send confirmation to the CURRENT verified address — the link in this
      // email completes the swap to the new email. Protects against an
      // attacker with a leaked session: they can't move the account to an
      // email they control without also controlling the old inbox.
      sendChangeEmailConfirmation: async ({ user, url }) => {
        await sendVerifyEmail({
          to: user.email,
          name: user.name,
          verifyUrl: url,
        })
      },
    },
    // W8 — admin role + ban state as Better Auth additionalFields.
    // input: false blocks the update-user API from accepting these from
    // the client, so users cannot self-promote or self-unban via the
    // standard auth surface. All mutations go through features/admin's
    // server actions, which require requireAdmin().
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
      banned_at: {
        type: "date",
        required: false,
        input: false,
      },
      banned_reason: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  databaseHooks: {
    session: {
      // Last-line defense against banned users acquiring a fresh session.
      // The ban transaction (features/admin/server/actions.banUser) also
      // deletes existing sessions, so this hook only matters for new
      // sign-in attempts after a ban.
      create: {
        before: async (session) => {
          const [u] = await db
            .select({ banned_at: userTable.banned_at })
            .from(userTable)
            .where(eq(userTable.id, session.userId))
            .limit(1)
          if (u?.banned_at) {
            throw new APIError("FORBIDDEN", { message: "Account banned" })
          }
        },
      },
    },
    user: {
      // First-fork admin bootstrap: when INITIAL_ADMIN_EMAIL signs up,
      // auto-promote to admin. Idempotent: if the env var is unset or the
      // email doesn't match, this is a no-op. After the first admin exists,
      // subsequent promotions happen through the admin UI.
      create: {
        after: async (user) => {
          const target = env.INITIAL_ADMIN_EMAIL?.toLowerCase()
          if (!target) return
          if (user.email.toLowerCase() !== target) return
          await db
            .update(userTable)
            .set({ role: "admin" })
            .where(eq(userTable.id, user.id))
          logger.info("Initial admin promoted via INITIAL_ADMIN_EMAIL", {
            userId: user.id,
            email: user.email,
          })
        },
      },
    },
  },
})

// Boot-time warning. If admin bootstrap is unset, the very first signup
// won't auto-promote — admin pages would be inaccessible until someone is
// manually granted in the DB. Loud at boot so a missing env doesn't fail
// silently after deploy.
if (!env.INITIAL_ADMIN_EMAIL && env.NODE_ENV === "production") {
  logger.warn(
    "INITIAL_ADMIN_EMAIL is not set; the first signup will be a regular user. " +
      "Grant admin manually if needed: UPDATE \"user\" SET role='admin' WHERE email=?",
  )
}

export type Auth = typeof auth
