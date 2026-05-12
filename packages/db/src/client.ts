import "server-only"

// Database client factory (Neon Postgres via @neondatabase/serverless + Drizzle).
// Lazy: the underlying connection is only opened on first query, so importing
// this module at build time (when DATABASE_URL may be unset) doesn't crash.

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

export type Database = ReturnType<typeof drizzle<typeof schema>>

export interface CreateDbOptions {
  /** Read lazily on first query so callers can pass `() => env.DATABASE_URL`
   *  without triggering server-side env reads at module load (which breaks
   *  test environments and any build-time static analysis). */
  databaseUrl: string | undefined | (() => string | undefined)
}

export function createDb({ databaseUrl }: CreateDbOptions): Database {
  // Lazy singleton — built on first property access. Lets callers import the
  // returned proxy at module load even when DATABASE_URL isn't yet available
  // (e.g. during static analysis of API routes).
  let instance: Database | null = null

  function build(): Database {
    const url = typeof databaseUrl === "function" ? databaseUrl() : databaseUrl
    if (!url) {
      throw new Error(
        "DATABASE_URL is required to query the database. Set it in .env.local. " +
          "(SKIP_ENV_VALIDATION=1 only gates the env validator, not the runtime.)",
      )
    }
    const sql = neon(url)
    return drizzle({ client: sql, schema })
  }

  return new Proxy({} as Database, {
    get(_target, prop) {
      if (!instance) instance = build()
      return Reflect.get(instance, prop)
    },
  })
}
