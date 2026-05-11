import type { Config } from "drizzle-kit"

// Drizzle Kit config — drives `npm run db:generate` and `npm run db:migrate`.
// Schema files live under src/lib/db/schema/* and are re-exported from
// src/lib/db/schema/index.ts. Migrations are committed to drizzle/migrations/.
//
// DATABASE_URL must be set for migrate/studio commands. generate works without it.

export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder@localhost/placeholder",
  },
  strict: true,
  verbose: true,
} satisfies Config
