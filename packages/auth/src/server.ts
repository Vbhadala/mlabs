import "server-only"

// Better Auth instance factory. Per-app composition roots call createAuth()
// with their env + db + email wiring; the returned `auth` object is what API
// routes hit (auth.api.getSession, auth.handler, etc.).
//
// Email/password is enabled with email verification REQUIRED — users must
// click the verify link before login is allowed. Email send is inline (no
// jobs runner): if the email provider fails, the auth flow
// surfaces the error to the caller — UI shows a retry-able message.

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { bearer } from "better-auth/plugins/bearer"
import type { Database } from "@mlabs/db/client"
import { createBanCheckHook } from "./hooks/ban-check"

export interface AuthEmailSender {
  sendVerifyEmail: (opts: {
    to: string
    name: string
    verifyUrl: string
  }) => Promise<void>
  sendPasswordResetEmail: (opts: {
    to: string
    name: string
    resetUrl: string
  }) => Promise<void>
}

export interface CreateAuthOptions {
  db: Database
  /** HMAC secret. Optional at the type level to match better-auth's
   *  permissive shape and the env validator (BETTER_AUTH_SECRET is optional
   *  so test/dev environments can boot without it). */
  secret?: string | undefined
  baseUrl?: string
  email: AuthEmailSender
  /** Optional. Additional allowed Origin headers for /api/auth/*. Better Auth
   *  already auto-trusts `new URL(baseURL).origin`; supply this for cross-port
   *  localhost (dev) or Replit preview (browser hits *.replit.dev while the
   *  server runs at localhost:5000 → "Invalid origin" 403). Better Auth also
   *  reads BETTER_AUTH_TRUSTED_ORIGINS env (comma-separated) natively — see
   *  .env.example for the fork escape hatch. */
  trustedOrigins?: string[]
}

export function createAuth({
  db,
  secret,
  baseUrl,
  email,
  trustedOrigins,
}: CreateAuthOptions) {
  const beforeSessionCreate = createBanCheckHook({ db })

  const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret,
    baseURL: baseUrl,
    trustedOrigins,

    // Phase 5.5: enable `Authorization: Bearer <session-token>` transport.
    // Mobile (Expo) cannot use cookies, so it sends the session token in the
    // Authorization header. Existing cookie behavior on web is unchanged.
    plugins: [bearer()],

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        await email.sendPasswordResetEmail({
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
        await email.sendVerifyEmail({
          to: user.email,
          name: user.name,
          verifyUrl: url,
        })
      },
    },

    // Sessions live ~7 days, refresh on every request within the cookie's
    // lifetime.
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },

    user: {
      changeEmail: {
        enabled: true,
        // Send confirmation to the CURRENT verified address — the link in
        // this email completes the swap to the new email. Protects against
        // an attacker with a leaked session: they can't move the account to
        // an email they control without also controlling the old inbox.
        sendChangeEmailConfirmation: async ({ user, url }) => {
          await email.sendVerifyEmail({
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
      session: { create: { before: beforeSessionCreate } },
    },
  })

  return auth
}

export type Auth = ReturnType<typeof createAuth>
