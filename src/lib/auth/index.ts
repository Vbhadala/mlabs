// Better Auth singleton. Used by the API route handler at
// src/app/api/auth/[...all]/route.ts and by server helpers in ./server.ts.
//
// Email/password is enabled with email verification REQUIRED — users must click
// the verify link before login is allowed. Postmark wiring lands in W3; for now
// the email send callbacks log to console (so dev signups still complete and the
// user can verify by reading the verify URL from server logs).

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import { env } from "@/config/env"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // W3 will swap this for sendPasswordResetEmail() from src/lib/email
      console.warn(
        `[auth] sendResetPassword stub for ${user.email}: ${url}`,
      )
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // W3 will swap this for sendVerifyEmail() from src/lib/email
      console.warn(
        `[auth] sendVerificationEmail stub for ${user.email}: ${url}`,
      )
    },
  },

  // Sessions live ~7 days, refresh on every request within the cookie's lifetime
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})

export type Auth = typeof auth
