// @mlabs/db/status — read-only migration status for `pnpm doctor`.
//
// Standalone by design: it talks to the DB directly (not via the server-only
// ./client) so a plain Node tooling script (scripts/doctor.ts) can import it.
// Exposed ONLY via the `@mlabs/db/status` subpath; never imported by the web
// app or mobile, so it stays out of every bundle.
//
// Driver choice: the neon *HTTP* driver (`neon()`), not the WebSocket `Pool`
// that scripts/migrate.ts uses. Migrations need multi-statement transactions
// (WebSocket only), but this is a single read-only `count(*)`. The HTTP driver
// is the right fit here because an unreachable/bad host rejects the query
// promise cleanly, whereas the WebSocket driver emits an out-of-band stream
// error that escapes try/catch and crashes the process — unacceptable for a
// doctor that must run *especially* when the DB is down.
//
// Migration table location: scripts/migrate.ts runs the drizzle-orm migrator
// with no custom `migrationsTable`/`migrationsSchema`, so the pg default applies
// — `drizzle.__drizzle_migrations`. A missing table means "never migrated".

import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export interface MigrationStatus {
  /** Could we connect + query the DB? */
  reachable: boolean
  /** Set when reachable is false. */
  error?: string
  /** Migrations recorded in drizzle.__drizzle_migrations (0 if never migrated). */
  applied: number
  /** Migrations committed in the repo (journal entry count). */
  total: number
  /** total - applied, floored at 0. */
  pending: number
}

const TIMEOUT_MS = 5000

function journalTotal(): number {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const journalPath = path.resolve(here, "..", "drizzle", "migrations", "meta", "_journal.json")
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries?: unknown[] }
  return Array.isArray(journal.entries) ? journal.entries.length : 0
}

function isUndefinedTable(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false
  const code = (err as { code?: string }).code
  const message = (err as { message?: string }).message ?? ""
  return code === "42P01" || /relation .* does not exist/i.test(message)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    if (typeof timer.unref === "function") timer.unref()
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

async function countApplied(sql: NeonQueryFunction<false, false>): Promise<number> {
  try {
    const rows = (await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`) as Array<{
      n: number
    }>
    return Number(rows[0]?.n ?? 0)
  } catch (err) {
    if (isUndefinedTable(err)) return 0 // never migrated
    throw err
  }
}

/**
 * Report migration status against `databaseUrl`. Never throws and never hangs:
 * on an unset/unreachable/timed-out DB it resolves `{ reachable: false, error }`.
 */
export async function getMigrationStatus(databaseUrl: string | undefined): Promise<MigrationStatus> {
  let total = 0
  try {
    total = journalTotal()
  } catch {
    total = 0
  }

  if (!databaseUrl || databaseUrl.trim().length === 0) {
    return { reachable: false, error: "DATABASE_URL is not set", applied: 0, total, pending: total }
  }

  try {
    const sql = neon(databaseUrl)
    const applied = await withTimeout(countApplied(sql), TIMEOUT_MS)
    return { reachable: true, applied, total, pending: Math.max(0, total - applied) }
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
      applied: 0,
      total,
      pending: total,
    }
  }
}
