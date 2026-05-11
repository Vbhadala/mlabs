// Database client (Neon Postgres via @neondatabase/serverless + Drizzle).
// Use this everywhere except realtime LISTEN/NOTIFY (which would need a direct
// connection — but we chose polling, not LISTEN/NOTIFY, so no second client needed).
//
// Import schema from "./schema" to get fully-typed query results.

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { env } from "@/config/env"
import * as schema from "./schema"

if (!env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required to instantiate the DB client. " +
      "Set it in .env.local or use SKIP_ENV_VALIDATION=1 only for build steps."
  )
}

const sql = neon(env.DATABASE_URL)

export const db = drizzle({ client: sql, schema })

export type Database = typeof db
export * from "./schema"
