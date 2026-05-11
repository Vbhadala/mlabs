// Database client (Neon Postgres via @neondatabase/serverless + Drizzle).
// Lazy: the underlying connection is only opened on first query, so importing
// this module at build time (when DATABASE_URL may be unset) doesn't crash.
//
// Use this everywhere except realtime LISTEN/NOTIFY (which would need a direct
// connection — but we chose polling, not LISTEN/NOTIFY, so no second client needed).

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { env } from "@/config/env"
import * as schema from "./schema"

function makeClient() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required to query the database. Set it in .env.local. " +
        "(SKIP_ENV_VALIDATION=1 only gates the env validator, not the runtime.)",
    )
  }
  const sql = neon(env.DATABASE_URL)
  return drizzle({ client: sql, schema })
}

// Lazy singleton — built on first property access.
let _db: ReturnType<typeof makeClient> | null = null

export const db = new Proxy({} as ReturnType<typeof makeClient>, {
  get(_target, prop) {
    if (!_db) _db = makeClient()
    return Reflect.get(_db, prop)
  },
})

export type Database = ReturnType<typeof makeClient>
export * from "./schema"
