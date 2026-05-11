// Better Auth singleton. Used by the API route handler at
// src/app/api/auth/[...all]/route.ts and by server helpers in ./server.ts.
//
// Email/password is enabled with email verification REQUIRED — users must click
// the verify link before login is allowed. Email send is inline (no jobs runner,
// per PLAN.md T9): if Postmark fails, the auth flow surfaces the error to the
// caller — UI shows a retry-able message.

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import { env } from "@/config/env"
import { sendPasswordResetEmail, sendVerifyEmail } from "@/lib/email"

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
})

export type Auth = typeof auth
