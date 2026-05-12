// Advisory-lock-wrapped migrate runner. Per .context/monorepo-migration-plan.md
// Phase 8: prevents concurrent deploys from racing the same migration set. If
// another deploy holds the lock, this process exits non-zero so the deploy
// retries instead of stomping a half-applied schema.
//
// Usage: pnpm --filter @mlabs/db migrate
//
// Why pg_try_advisory_lock instead of pg_advisory_lock: blocking forever on a
// hung deploy would freeze the CI/CD pipeline. Try-and-fail is the safe move;
// orchestrator retries are bounded.

import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"
import { neon } from "@neondatabase/serverless"
import { sql } from "drizzle-orm"
import path from "node:path"
import { fileURLToPath } from "node:url"

const MIGRATION_LOCK_KEY = 0x4d4c4142 // 'MLAB' as int32

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.")
  process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(here, "..", "drizzle", "migrations")

const client = neon(databaseUrl)
const db = drizzle({ client })

const got = await db.execute(
  sql`SELECT pg_try_advisory_lock(${MIGRATION_LOCK_KEY}) AS locked`,
)
const row = got.rows[0] as { locked: boolean } | undefined
if (!row?.locked) {
  console.error(
    "Migration lock not acquired — another deploy is running. Exiting.",
  )
  process.exit(1)
}

try {
  await migrate(db, { migrationsFolder })
  console.log("✓ migrations applied")
} finally {
  await db.execute(sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`)
}
