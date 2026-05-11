// Boot-time env validation. App refuses to start with bad/missing env.
// Add new variables here as they're introduced; never use process.env directly
// in app code (an ESLint rule will eventually enforce this).

import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Database (Neon Postgres)
    DATABASE_URL: z.string().url().optional(),

    // Better Auth — added in W2
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),

    // Postmark — added in W3
    POSTMARK_SERVER_TOKEN: z.string().optional(),
    POSTMARK_FROM_EMAIL: z.string().email().optional(),

    // Replit Object Storage — added in W4
    REPLIT_OBJECT_STORAGE_BUCKET_ID: z.string().optional(),
  },
  client: {
    // Public env vars must be prefixed NEXT_PUBLIC_
    // None yet.
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL,
    REPLIT_OBJECT_STORAGE_BUCKET_ID: process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID,
  },
  // During first-deploy / fork, secrets may not be set yet. Skip validation
  // unless explicitly requested. Set SKIP_ENV_VALIDATION=1 for build steps
  // that don't have access to secrets.
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION || process.env.npm_lifecycle_event === "lint",
})
