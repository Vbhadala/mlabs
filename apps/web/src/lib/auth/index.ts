// Transitional shim — wires env + db + email into @mlabs/auth/server's
// createAuth factory. Phase 5 (apps/web rewire) replaces this with a per-app
// composition root.

import { db } from "@/lib/db"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import {
  sendPasswordResetEmail,
  sendVerifyEmail,
} from "@/lib/email"
import { createAuth } from "@mlabs/auth/server"

export const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: env.BETTER_AUTH_URL,
  initialAdminEmail: env.INITIAL_ADMIN_EMAIL,
  isProduction: env.NODE_ENV === "production",
  email: {
    sendVerifyEmail: ({ to, name, verifyUrl }) =>
      sendVerifyEmail({ to, name, verifyUrl }),
    sendPasswordResetEmail: ({ to, name, resetUrl }) =>
      sendPasswordResetEmail({ to, name, resetUrl }),
  },
  logger: {
    info: (m, meta) => logger.info(m, meta),
    warn: (m, meta) => logger.warn(m, meta),
  },
})

export type Auth = typeof auth
